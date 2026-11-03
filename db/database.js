const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('sightings.db', (err) => {
    if (err) {
        console.error(err.message);
        throw err;
    } else {
        console.log("connected to the SQLite database.");
        // create sightings table
        // include gps research in report on accuracy and coords
        // CHECK constraints are used for security purposes, preventing injection of invalid data
        db.run(`CREATE TABLE sightings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_uuid TEXT UNIQUE,
            species TEXT DEFAULT 'Pangolin',
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            gps_accuracy REAL, 
            date TEXT,
            status TEXT NOT NULL CHECK (status IN ('Alive', 'Dead')),
            mortality_type TEXT CHECK (mortality_type IN 
            ('fence death: electrocution', 'Poaching', 'Accident', 'Other') OR mortality_type IS NULL),
            notes TEXT)`, 
            (err) => {
                if (err) {
                    console.error('Table Sightings already exists');
                } else {
                    console.error("Table 'sightings' created.");
                }
            });
        }
});

module.exports = db;

//TODO: Implement a sighting images table as a foreign key for the sightings table