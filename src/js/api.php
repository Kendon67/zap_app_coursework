<?php
require_once '../db/database.php';

class sightingsAPI
{
    private mysqli $database;
    private int $statuscode = 500;
    private array $data = [];

    public function __construct()
    {
        $instance = Database::getDbInstance();
        $this->database = $instance->getConn();
    }

    public function __destruct()
    {
        $this->database->close();
    }


    // handle requests made to the sightings API
    public function handle_request($method)
    {
        header('Content-Type: application/json');
        switch ($method) {
            case 'GET':
                $this->getAllSightings();
                break;
            case 'POST':
                $this->uploadSighting();
                break;
            default:
                $this->statuscode = 405;
        }

        // encode and echo response for use in javascript
        http_response_code($this->statuscode);
        if (!empty($this->data)) {
            echo json_encode($this->data);
        }
    }

    // retrieves all sightings in db 
    public function getAllSightings()
    {
        $this->statuscode = 400;

        $sql = "SELECT s.*, si.image_path FROM `sightings` s
        LEFT JOIN `sightings_images` si ON si.sighting_id = s.id" ;
        $stmt = $this->prepareStmt($sql);
        if (!$stmt) {
            return;
        }

        if ($this->executeStatement($stmt)) {
            $result = $stmt->get_result();
            if ($result->num_rows > 0) {
                $this->statuscode = 200;
                $this->data = ["results" => $result->fetch_all(MYSQLI_ASSOC)];
                $stmt->close();
            } else {
                $this->statuscode = 204;
            }
        }
    }

    // add a sighting to the db
    public function uploadSighting()
    {
        if (
            !isset(
            $_POST['client_uuid'],
            $_POST['species'],
            $_POST['longitude'],
            $_POST['latitude'],
            $_POST['gps_accuracy'],
            $_POST['date'],
            $_POST['status'],
            $_POST['notes']
        )
        ) {

            $this->statuscode = 400;
            return;
        }

        $client_uuid = htmlspecialchars(strip_tags(trim($_POST['client_uuid'])));
        $species = htmlspecialchars(strip_tags(trim($_POST['species'])));
        $longitude = filter_var($_POST['longitude'], FILTER_VALIDATE_FLOAT);
        $latitude = filter_var($_POST['latitude'], FILTER_VALIDATE_FLOAT);
        $gps_accuracy = filter_var($_POST['gps_accuracy'], FILTER_VALIDATE_FLOAT);
        $date = htmlspecialchars(strip_tags(trim($_POST['date'])));
        $status = htmlspecialchars(strip_tags(trim($_POST['status'])));
        $notes = htmlspecialchars(strip_tags(trim($_POST['notes'])));
        $mortality_type = trim(strip_tags($_POST['mortality_type'] ?? ''));

        if ($mortality_type === '') {
            $mortality_type = null;
        }

        // perform input validation
        if (!$this->validateGeolocation($longitude, $latitude, $gps_accuracy)) {
            $this->statuscode = 400;
            return;
        }

        if (!$this->validateMortalityTypes($mortality_type)) {
            $this->statuscode = 400;
            return;
        }

        if (!$this->validateAlphanumeric($species)) {
            $this->statuscode = 400;
            return;
        }

        $image = $this->validateImage();
        if ($image === false) {
            $this->statuscode = 400;
            return;
        }

        $sql = "INSERT INTO `sightings` (client_uuid, species, longitude, latitude, gps_accuracy,
                 date, status, mortality_type, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

        $stmt = $this->prepareStmt($sql);
        if (!$stmt) {
            return;
        }

        $stmt->bind_param(
            "ssdddssss",
            $client_uuid,
            $species,
            $longitude,
            $latitude,
            $gps_accuracy,
            $date,
            $status,
            $mortality_type,
            $notes
        );

        // perform both POSTs, if either fail rollback the transaction
        $this->database->begin_transaction();
            if (!$this->executeStatement($stmt)) {
                $stmt->close();
                $this->database->rollback();
                return;
            }
            $sightingId= $this->database->insert_id;
            $stmt->close();

            if ($image !== null && !$this->uploadImage($sightingId, $image)) {
                $this->database->rollback();
                return;
            }
            $this->database->commit();
            $this->statuscode= 201;
    }

    // upload image to image sightings, returning true if successfull to then continue uploadSighting()
    private function uploadImage($sightingId, $image)
    {
        $targetDir = '../images/';
        $tmp = tempnam($targetDir, 'img_');      
        $filename = basename($tmp) . '.' . $image['ext'];

        $fileMoved = move_uploaded_file($image['tmp'], $targetDir . $filename);
        unlink($tmp);                            

        if (!$fileMoved) {
            $this->statuscode = 500;
            return false;
        }

        $sql = "INSERT INTO `sightings_images` (sighting_id, image_path) VALUES (?, ?)";
        $filePath = 'images/' . $filename;

        $stmt = $this->prepareStmt($sql);

        if (!$stmt){
            return false;
        }

        $stmt->bind_param("is", $sightingId, $filePath);
        if ($this->executeStatement($stmt)){
            return true;
        } else{
            return false;
        }
    }

    // prepare statement for execution
    private function prepareStmt(string $sql): mysqli_stmt|false
    {
        $stmt = $this->database->prepare($sql);
        if (!$stmt) {
            $this->statuscode = 500;
            return false;
        }
        return $stmt;
    }

    // execute statement
    private function executeStatement(mysqli_stmt $stmt)
    {
        if ($stmt->execute()) {
            return true;
        } else {
            $this->statuscode = 500;
            return false;
        }
    }

    // validate the passed field is alphanumeric
    private function validateAlphanumeric($field)
    {
        if (!preg_match('/^[a-zA-Z0-9 ]+$/', $field)) {
            return false;
        }
        return true;
    }

    // check posted mort type and check it against the allowed types
    private function validateMortalityTypes($mortality_type)
    {
        $allowedTypes = [
            'Fence Death: Electrocution',
            'Fence Death: Caught on non-electrified fence',
            'Road Death',
            'Other'
        ];

        if ($mortality_type == null || in_array($mortality_type, $allowedTypes)) {
            return true;
        } else {
            return false;
        }
    }

    // validate geolocation fields
    private function validateGeolocation($longitude, $latitude, $gps_accuracy)
    {
        if ($longitude === false || $longitude < -180 || $longitude > 180) {
            return false;
        }

        if ($latitude === false || $latitude < -90 || $latitude > 90) {
            return false;
        }

        if ($gps_accuracy === false || $gps_accuracy < 0) {
            return false;
        }
        return true;
    }

    // validates image for if its set, size, upload errors, and if the true extension is allowed
    private function validateImage()
    {
        if (!isset($_FILES['image']) || $_FILES['image']['error'] === UPLOAD_ERR_NO_FILE) {
            return null;
        }

        $file = $_FILES['image'];

        if ($file['error'] !== UPLOAD_ERR_OK) {
            return false;
        }

        if ($file['size'] > 2000000) {
            return false;
        }

        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mimetype = $finfo->file($file['tmp_name']);
        $allowedExtensions = array('image/jpeg' => 'jpg', 'image/png' => 'png');

        if (!isset($allowedExtensions[$mimetype])) {
            return false;
        }
        return ['tmp' => $file['tmp_name'], 'ext' => $allowedExtensions[$mimetype]];
    }
}

$api = new sightingsAPI();
$api->handle_request($_SERVER['REQUEST_METHOD']);
?>