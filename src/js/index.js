const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db/database');

const app = express();
const port = 3000;


window.addEventListener('load', function(){
    
   
    // get sightings from database
    app.get('/sightings', async (req, res) => {
        const {status, data} = await db.getAllSightings(req); 
        res.status(status);
        if (data) res.json(data);
        else res.end(); 
    }) 

    // get a target sighting by id
    app.get('/sightings/:id', async (req, res) => {

    })

    // post new sighting to database
    app.post('/sightings/new', async (req, res) => {
    })

    // delete sighting from the database
    app.delete('/sightings/:id', async (req, res) => {

    })

    // alter sighting - probably unused? will need to be handled anyway 
    app.put('/sightings/:id', async (req, res) => {

    })
})