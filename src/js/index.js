
document.addEventListener('DOMContentLoaded', async () => {
    navigator.serviceWorker.register('sw.js');

    const sightingsPage = document.getElementById("sightings_page");
    const sightingsPageBtn = document.getElementById("sightings_page_btn");
    const mapPage = document.getElementById("map_page");
    const mapPageBtn = document.getElementById("map_page_btn");

    const sightingsContainer = document.querySelector('#sightings_container');
    let sightingsArray = [];

    // gps and date variables for use in formdata
    let lat;
    let long;
    let accuracy;

    const uploadFormContainer = document.getElementById("upload_form_container");
    const statusRadios = document.querySelectorAll('input[name="status"]');
    const mortalitySelection = document.getElementById('mortality_type');
    const uploadForm = document.getElementById('upload_form');
    const uploadBtn = document.getElementById('upload_btn');
    const closeFormBtn = document.getElementById('close_form_btn');

    // camera varaiables
    const width = 320;
    let height = 0;
    let streaming = false;
    let cameraFacing = 'environment';
    let selectedImage = null;

    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');

    const photoPicker = document.getElementById('photo_picker_container');
    const addImageBtn = document.getElementById('add_image_btn');
    const openCameraBtn = document.getElementById('open_camera_btn');
    const chooseImageBtn = document.getElementById('choose_image_btn');
    const imageInput = document.getElementById('image_input');
    const closePickerBtn = document.getElementById('close_picker_btn');

    const cameraContainer = document.getElementById('camera_container');
    const closeCameraBtn = document.getElementById('close_camera_btn');
    const captureBtn = document.getElementById('capture_btn');
    const retakePhotoBtn = document.getElementById('retake_photo_btn');
    const flipCameraBtn = document.getElementById('flip_camera_btn');
    const confirmPhotoBtn = document.getElementById('photo_confirm_btn');

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
            sightingCard.classList.add('card');

            if (sighting.image_path) {
                const img = document.createElement('img');
                img.src = '../' + sighting.image_path;
                img.alt = `Photo of ${sighting.species}`;
                img.loading = 'lazy';
                sightingCard.appendChild(img);
            }

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

            if (selectedImage) {
                sightingData.append("image", selectedImage);
            }

            const response = await fetch('../api/api.php', {
                method: "POST",
                body: sightingData
            });

            if (response.ok) {
                alert('Sighting Successfully Uploaded!');
                uploadForm.reset();
                clearFile();
                clearPhoto();
                uploadFormContainer.style.display = "none";
                await fetchSightings();
            } else {
                alert("Upload Attempt Failed, Please Try Again.") // update this
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
    };

    function getDate() {
        const date = new Date().toISOString().split('T')[0];
        return date;
    };

    function showPosition(position) {
        lat = position.coords.latitude;
        long = position.coords.longitude
        accuracy = position.coords.accuracy
    };

    // ask user for camera permission and start stream feed
    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: cameraFacing },
                audio: false
            });

            video.srcObject = stream;
            await video.play();

        } catch (e) {
            console.error(e);

            const errors = {
                NotFoundError: "No camera was found.",
                NotAllowedError: "Camera access denied. Please enable camera in browser settings",
                NotReadableError: "Camera is currently being used by another app."
            };

            alert(errors[e.name] || "Camera couldn't start.")
            cameraContainer.style.display = 'none';
            photoPicker.style.display = 'flex';
        }
    };

    // check for all open camera streams then stop them
    function stopCamera() {
        const videoStream = video.srcObject;
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }
    };

    // capture user photo and display it
    function capturePhoto() {
        if (width && height && streaming) {
            clearFile();
            canvas.width = width;
            canvas.height = height;

            context.drawImage(video, 0, 0, width, height);

            video.style.display = 'none';
            canvas.style.display = 'block';
            captureBtn.style.display = 'none';
            retakePhotoBtn.style.display = 'block';
            confirmPhotoBtn.style.display = 'block';
        }
    };

    // clear data stored as the photo and reset page
    function clearPhoto() {
        context.clearRect(0, 0, canvas.width, canvas.height);

        canvas.style.display = 'none';
        video.style.display = 'block';

        captureBtn.style.display = 'block';
        retakePhotoBtn.style.display = 'none';
        confirmPhotoBtn.style.display = 'none';
    };

    function clearFile() {
        selectedImage = null;
        imageInput.value = '';
    };

    function hideAllPages() {
        sightingsPage.style.display = 'none';
        mapPage.style.display = 'none';
    };

//-------- Event Listeners --------//

     // navigation button listeners
     mapPageBtn.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllPages();
        mapPage.style.display = 'flex';
    });

    sightingsPageBtn.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllPages();
        sightingsPage.style.display = 'block';
    });

    // open picker for image upload options
    addImageBtn.addEventListener('click', (e) => {
        e.preventDefault();
        photoPicker.style.display = 'flex';
    });

    chooseImageBtn.addEventListener('click', (e) => {
        e.preventDefault();
        clearFile();
        imageInput.click();
    });

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            clearPhoto();
            selectedImage = file;
        }
    });

    // open camera overlay and start camera
    openCameraBtn.addEventListener('click', (e) => {
        e.preventDefault();
        photoPicker.style.display = 'none';
        cameraContainer.style.display = 'flex';
        startCamera();
    });

    // stop camera stream and hide overlay
    closeCameraBtn.addEventListener('click', (e) => {
        e.preventDefault();
        clearPhoto();
        stopCamera();
        cameraContainer.style.display = 'none';
        photoPicker.style.display = 'flex';
    })

    captureBtn.addEventListener('click', (e) => {
        e.preventDefault();
        capturePhoto();
    });

    retakePhotoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        clearPhoto();
    })

    flipCameraBtn.addEventListener('click', (e) => {
        e.preventDefault();
        stopCamera();
        cameraFacing = cameraFacing === 'environment' ? 'user' : 'environment';
        startCamera();
    })

    // save photo file for use in API 
    confirmPhotoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        canvas.toBlob((blob) => {
            if (blob) {
                selectedImage = new File([blob], 'photo.jpg', {
                    type: 'image/jpeg'
                });

                stopCamera();
                cameraContainer.style.display = 'none';
            }
        }, 'image/jpeg');
    });

    // create streaming window and start camera
    video.addEventListener('canplay', () => {
        try {
            if (!streaming) {
                height = video.videoHeight / (video.videoWidth / width);

                video.setAttribute("width", width);
                video.setAttribute("height", height);
                canvas.setAttribute("width", width);
                canvas.setAttribute("height", height);
                streaming = true;
            };
        } catch (e) { 
            alert("Camera Couldn't Start, Please Try Again.");
        }
    });

    closePickerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        photoPicker.style.display = 'none';
    })

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
        clearFile();
        clearPhoto();
        uploadFormContainer.style.display = 'none';
    });


    window.addEventListener('pagehide', () => {
        // store data from upload form
        const formFields = new FormData(uploadForm);
        formFields.delete(imageInput.name); 
        const json = JSON.stringify(Object.fromEntries(formFields));
        localStorage.setItem('form', json);
    });
        
    // load form from previous session if exists
    const json = localStorage.getItem('form')
        if (json) {
            const form = JSON.parse(json);
        
            Object.entries(form).forEach(([name, value]) => {
                const field = uploadForm.elements.namedItem(name)
                if (field) field.value = value;
            });

            mortalitySelection.style.display = form.status === 'Dead' ? 'flex' : 'none';
    };

    await fetchSightings();
});