document.addEventListener('load', function() {

    let sightingsArray = [];
    // query the API to fetch sightings from the db
    async function fetchSightings(){
        try{
            const response = await fetch('/sightings');
            
            if (!response.ok){
                // fail state
            } else if (response === 204){
                // no data state
            }

            const data = await response.json();
            sightingsArray = data.sightings;
            // loadSightings();
        } catch (e){
            console.error(e);
        }
    }
})