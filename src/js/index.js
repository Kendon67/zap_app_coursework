
document.addEventListener('DOMContentLoaded', async() => {
    const sightingsContainer = document.querySelector('#sightings_container');
    let sightingsArray = [];

    const uploadFormContainer = document.getElementById("upload_form_container");
    const uploadForm = document.getElementById("upload_form");
    const uploadBtn = document.getElementById("upload_button");
    const submitBtn = document.getElementById("submit_btn");

    uploadBtn.addEventListener("click", (e) => {
        e.preventDefault();
        uploadForm.style.display = "flex";
    })

    submitBtn.addEventListener("submit", (e) => {
        e.preventDefault();
        uploadSighting();
    })

    // query the API to fetch sightings from the db
    async function fetchSightings(){
        try{
            const response = await fetch('../api/api.php');         
            if (!response.ok){
                // fail state
            } else if (response.status === 204){
                // no data state
            }

            const data = await response.json();
            sightingsArray = data.results;
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
        const sightingData = new FormData(); //sighting fomr
        try{
            const response = await fetch('../api/api.php', {
                method: "POST",
                body: sightingData
            });

            if (response.ok){
                alert('Sighting Successfully Uploaded!');
                uploadFormContainer.style.display = "none";
                await fetchSightings();
            } else{
                alert("Something went wrong") // update this
            }
        } catch (e){
            alert("Something Went Wrong. Please Try Again");
            console.error(e);
        }
    }
});