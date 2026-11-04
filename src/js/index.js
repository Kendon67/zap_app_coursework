const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db/database');

const app = express();
const port = 3000;


window.addEventListener('load', function(){
    
   
    // get sightings from database
    app.get('/sightings', async (req, res) => {
        res.json(await db.query('SELECT * FROM sightings'));
    }) 
})