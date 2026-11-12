
document.addEventListener('DOMContentLoaded', async() => {
    const sightingsContainer = document.querySelector('#sightings_container');
    let sightingsArray = [];


    // query the API to fetch sightings from the db
    async function fetchSightings(){
        try{
            const response = await fetch('http://localhost:3000/sightings'); //this will need changing
            
            if (!response.ok){
                // fail state
            } else if (response.status === 204){
                // no data state
            }

            const data = await response.json();
            sightingsArray = data.sightings;
            loadSightings();
        } catch (e){
            console.error(e);
        }
    }

    // uses fetched data to create cards for display to the user
    async function loadSightings(){
        sightingsContainer.innerHTML = '';

        sightingsArray.forEach(sighting => {
            const sightingCard = document.createElement('div');
            sightingCard.classList.add('sighting');
            sightingCard.innerHTML = `
                <h3>${sighting.species}</h3>
                <p>Status: ${sighting.status}</p>
                <p>Date: ${sighting.date}</p>
                <p>Latitude: ${sighting.latitude}</p>
                <p>Longitude: ${sighting.longitude}</p>
            `;

            sightingsContainer.appendChild(sightingCard);
        });
    }

    await fetchSightings();

    // upload a new sighting to the db
    async function uploadSighting(){
        try{
            const response = await fetch('http://localhost:3000/sightings', {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json'
                },
                
            });

            if (!response.ok){
                // fail state
            } 

        } catch (e){
            console.error(e);
        }
    }
});