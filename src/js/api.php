<?php
require_once '../../db/database.php';

class sightingsAPI {
    private mysqli $database;
    private int $statuscode = 500;
    private array $data = []; 

    public function __construct(){
        $instance = Database::getDbInstance();
        $this->database = $instance->getConn();
    }

    public function __destruct(){
        $this->database->close();
    }

    // handle requests made to the sightings API
    public function handle_request($method){
        header('Content-Type: application/json');
        switch($method){
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
    public function getAllSightings(){
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
    
    // prepare statement for execution
    private function prepareStmt(string $sql): mysqli_stmt|false{
        $stmt = $this->database->prepare($sql);
        if (!$stmt) {
            $this->statuscode = 500;
            return false;
        }
        return $stmt;
        
    }

    // execute statement
    private function executeStatement(mysqli_stmt $stmt){
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