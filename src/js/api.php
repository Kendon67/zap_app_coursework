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
                $this->addSighting();
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

        $sql = "SELECT * FROM `sightings`";
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
    public function addSighting()
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
    
        // get image path, if there is an error with the validation it fails
        $imagePath = $this->validateImageUpload();
        if ($imagePath === false){
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

        // upon successful execution check if image was uploaded and insert
        if ($this->executeStatement($stmt)) {
            $sightingId = $this->database->insert_id;
            if ($imagePath !== null) {
                if(!$this->addSightingImage($sightingId, $imagePath)) {
                    $stmt->close();
                    return;
                }
            }

            $this->statuscode = 201;
        }
        $stmt->close();
    }

    // add sighting photo to the sightings_images table
    public function addSightingImage($sightingId, $imagePath){
        $sql = "INSERT INTO `sightings_images` (sighting_id, image_path) VALUES (?, ?)";
        $stmt = $this->prepareStmt($sql);

        if (!$stmt) {
            return false;
        }

        $stmt->bind_param("is", $sightingId, $imagePath);
        if ($this->executeStatement($stmt)) {
            $stmt->close();
            return true;
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

    // validate image uploading
    private function validateImageUpload()
    {
        if (!isset($_FILES['image']) || $_FILES['image']['error'] === UPLOAD_ERR_NO_FILE) {
            return null;
        }

        $image = $_FILES['image'];

        if ($image['error'] !== UPLOAD_ERR_OK) {
            $this->statuscode = 400;
            return false;
        }

        $allowedTypes = ["image/jpeg" => "jpg", "image/png" => "png", "image/webp" => "webp"];
        $finfo = finfo_open(FILEINFO_MIME_TYPE);

        if ($finfo === false) {
            $this->statuscode = 500;
            return false;
        }

        $imageType = finfo_file($finfo, $image['tmp_name']);

        if (!isset($allowedTypes[$imageType])) {
            $this->statuscode = 400;
            return false;
        }

        $extension = $allowedTypes[$imageType];
        $filename = bin2hex(random_bytes(16)) . "." . $extension;
        $uploadDirectory = __DIR__ . '/../public/images/';

        if (!is_dir($uploadDirectory) && !mkdir($uploadDirectory, 0755, true)) {
            $this->statuscode = 500;
            return false;
        }

        $uploadPath = $uploadDirectory . $filename;

        if (!move_uploaded_file($image['tmp_name'], $uploadPath)) {
            $this->statuscode = 500;
            return false;
        }
        return "images/" . $filename;
    }
}

$api = new sightingsAPI();
$api->handle_request($_SERVER['REQUEST_METHOD']);
?>