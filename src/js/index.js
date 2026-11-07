const express = require('express');
const bodyParser = require('body-parser');
const db = require('../db/database');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
const port = 3000;

// get sightings from database
app.get('/sightings', async (req, res) => {
    const { status, data } = await getAllSightings(req);
    res.status(status);
    if (data) res.json(data);
    else res.end();
})

// get a target sighting by id
app.get('/sightings/:id', async (req, res) => {
    const { status, data } = await getSightingById(req);
    res.status(status);
    if (data) res.json(data);
    else res.end();
})

// post new sighting to database
app.post('/sightings/new', async (req, res) => {
    const { status, data } = await postSighting(req);
    res.status(status);
    if (data) res.json(data);
    else res.end();
})

// delete sighting from the database
app.delete('/sightings/:id', async (req, res) => {

})

// alter sighting - probably unused? will need to be handled anyway 
app.put('/sightings/:id', async (req, res) => {

})

// get all sightings
async function getAllSightings(req) {
    let status = 500, data = null;
    try {
        await new Promise((resolve, reject) => {
            const sql = `SELECT * FROM sightings`;
            db.all(sql, [], (err, rows) => {
                if (!err) {
                    if (rows.length > 0) {
                        status = 200, data = {
                            sightings: rows
                        };
                    } else {
                        status = 204;
                    }
                    resolve();
                } else {
                    console.error(err);
                    reject(err);
                }
            });
        });
    } catch (err) {
        console.error(err);
    }
    return { status, data };
}

// get sighting by a given id
async function getSightingById(req) {
    let status = 500, data = null;
    try {
        await new Promise((resolve, reject) => {
            const sql = `SELECT * FROM sightings WHERE id = ?`;
            db.all(sql, [req.params.id], (err, rows) => {
                if (!err) {
                    if (rows.length > 0) {
                        status = 200, data = {
                            sightings: rows
                        };
                    } else {
                        status = 204;
                    }
                    resolve();
                } else {
                    console.error(err);
                    reject(err);
                }
            });
        });
    } catch (err) {
        console.error(err);
    }
    return { status, data };
}

// TODO: implement input sanitization and validation
// TODO: generate specific insert values (cuiid, date, coordinates)
async function postSighting(req) {
    let status = 500, data = null;
    try {
        await new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO sightings (client_uuid, species, latitude, longitude,
                    gps_accuracy, date, status, mortality_type, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            db.run(sql, [req.body.client_uuid, req.body.species, req.body.latitude,
                req.body.longitude, req.body.gps_accuracy, req.body.date, req.body.status, 
                req.body.mortality_type || null,req.body.notes], 
                function (err) {
                if (err) {
                    status = 400;
                    console.error('Insert error:', err.message);
                    reject(err);
                } else {
                    status = 201;
                    data = { id: this.lastID };
                    resolve();
                }
            });
        });
    } catch (err) {
        console.error(err);
    }
    return { status, data };
}

function generateCuuid(){
    return crypto.randomUUID();
}

function getDate(){
    const date = new Date();
    let dateString = date.toISOString();
    return dateString;
}

function getGeolocation(){

}

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});