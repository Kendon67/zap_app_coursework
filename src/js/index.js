const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db/database');

const app = express();
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

//TODO: insert catch for if theres an error
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
                }
                resolve();
            });
        });
    } catch (err) {
        console.error(err);
    }
    return { status, data };
}
