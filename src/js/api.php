<?php
require_once '../../db/database.php';

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
    // TODO: further data validation checks for security
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
            $_POST['mortality_type'],
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
        $mortality_type = htmlspecialchars(strip_tags(trim($_POST['mortality_type'])));
        $notes = htmlspecialchars(strip_tags(trim($_POST['notes'])));

        if ($longitude === false || $longitude < -180 || $longitude > 180) {
            $this->statuscode = 400;
            return;
        }
    
        if ($latitude === false || $latitude < -90 || $latitude > 90) {
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
            "ssddsssss",
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

        if ($this->executeStatement($stmt)) {
            $this->statuscode = 201;
        } 
        $stmt->close();
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
}

$api = new sightingsAPI();
$api->handle_request($_SERVER['REQUEST_METHOD']);
/* TODO: 
 * Add error handling to database conn and queries */
?>