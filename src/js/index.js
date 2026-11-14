
document.addEventListener('DOMContentLoaded', async () => {
    const sightingsContainer = document.querySelector('#sightings_container');
    let sightingsArray = [];

    // global gps coords for map and location
    let lat;
    let long;
    let accuracy;

    const uploadFormContainer = document.getElementById("upload_form_container");
    const uploadForm = document.getElementById("upload_form");
    const uploadBtn = document.getElementById("upload_button");

    uploadBtn.addEventListener("click", (e) => {
        e.preventDefault();
        uploadForm.style.display = "flex";
    })

    uploadForm.addEventListener("submit", (e) => {
        e.preventDefault();
        uploadSighting();
    })

    // query the API to fetch sightings from the db
    async function fetchSightings() {
        try {
            const response = await fetch('../api/api.php');
            if (!response.ok) {
                // fail state
            } else if (response.status === 204) {
                // no data state
            }

            const data = await response.json();
            sightingsArray = data.results;
            loadSightings();
        } catch (e) {
            console.error(e);
        }
    }

    // uses fetched data to create cards for display to the user
    async function loadSightings() {
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
    async function uploadSighting() {
        try {
            const sightingData = new FormData(uploadForm); 
            await getLocation();

            sightingData.append("latitude", lat);
            sightingData.append("longitude", long);
            sightingData.append("gps_accuracy", accuracy);
            sightingData.append("client_uuid", getUUID());

            const response = await fetch('../api/api.php', {
                method: "POST",
                body: sightingData
            });

            if (response.ok) {
                alert('Sighting Successfully Uploaded!');
                uploadFormContainer.style.display = "none";
                await fetchSightings();
            } else {
                alert("Something went wrong") // update this
            }
        } catch (e) {
            alert("Something Went Wrong. Please Try Again");
            console.error(e);
        }
    }

    function getLocation() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    showPosition(position);
                    resolve();
                },
                reject
            );
        });
    }

    function getUUID() {
        return crypto.randomUUID();
    }

    function showPosition(position) {
        lat = position.coords.latitude;
        long = position.coords.longitude
        accuracy = position.coords.accuracy
    }
});