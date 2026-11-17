document.addEventListener('DOMContentLoaded', async () => {
    const sightingsContainer = document.querySelector('#sightings_container');

    // form elements
    const uploadFormContainer = document.getElementById("upload_form_container");
    const statusRadios = document.querySelectorAll('input[name="status"]');
    const mortalitySelection = document.getElementById('mortality_type');
    const uploadForm = document.getElementById('upload_form');
    const uploadBtn = document.getElementById('upload_btn');
    const closeFormBtn = document.getElementById('close_form_btn');

    // camera elements
    const width = 320;
    let height = 0;
    let streaming = false;

    const video = document.getElementById("video");
    const canvas = document.getElementById("canvas");
    const photo = document.getElementById("photo");
    const captureBtn = document.getElementById('capture_btn');
    const camPermissionsBtn = document.getElementById("cam_permissions_btn");


    // gps and date variables for use in formdata
    let lat;
    let long;
    let accuracy;

    let sightingsArray = [];

    // hide mortality type box if status set to alive
    statusRadios.forEach(radio => {
        radio.addEventListener("change", (e) => {
            if (e.target.value == "Alive") {
                mortalitySelection.style.display = 'none';
                mortalitySelection.value = '';
            } else if (e.target.value == "Dead") {
                mortalitySelection.style.display = 'flex';
                mortalitySelection.value = '';
            }
        });
    });

    uploadBtn.addEventListener("click", (e) => {
        e.preventDefault();
        uploadFormContainer.style.display = "flex";
    })

    uploadForm.addEventListener("submit", (e) => {
        e.preventDefault();
        console.log("submitted!");
        uploadSighting();
    });

    closeFormBtn.addEventListener("click", (e) => {
        e.preventDefault();
        uploadForm.reset();
        uploadFormContainer.style.display = 'none';
    })

    captureBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log("Capture button clicked");
        takePicture();
    });

    camPermissionsBtn.addEventListener("click", async () => {
        console.log("Camera button clicked");
    
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            });
    
            console.log("Camera permission granted");
    
            video.srcObject = stream;
            await video.play();
    
        } catch (e) {
            console.error("Camera error:", e);
            alert("Camera error: " + e.message);
        }
    });

    video.addEventListener("canplay", () => {
        if (!streaming) {
            height = video.videoHeight / (video.videoWidth / width);

            video.setAttribute("width", width);
            video.setAttribute("height", height);
            canvas.setAttribute("width", width);
            canvas.setAttribute("height", height);

            streaming = true;
        }
    });

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

    // upload a new sighting to the db
    async function uploadSighting() {
        try {
            const sightingData = new FormData(uploadForm);
            await getLocation();

            sightingData.append("latitude", lat);
            sightingData.append("longitude", long);
            sightingData.append("gps_accuracy", accuracy);
            sightingData.append("client_uuid", getUUID());
            sightingData.append("date", getDate());

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

    function getDate() {
        const date = new Date().toISOString().split('T')[0];
        return date;
    }

    function showPosition(position) {
        lat = position.coords.latitude;
        long = position.coords.longitude
        accuracy = position.coords.accuracy
    }


    function clearPhoto() {
        const context = canvas.getContext("2d");

        context.fillStyle = "#aaaaaa";
        context.fillRect(0, 0, canvas.width, canvas.height);

        const data = canvas.toDataURL("image/png");
        photo.setAttribute("src", data);
    }

    function takePicture() {
        if (width && height && streaming) {
            const context = canvas.getContext("2d");

            canvas.width = width;
            canvas.height = height;

            context.drawImage(video, 0, 0, width, height);

            const data = canvas.toDataURL("image/png");
            photo.setAttribute("src", data);
        } else {
            clearPhoto();
        }
    }
    
    await fetchSightings();
});