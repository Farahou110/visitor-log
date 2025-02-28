document.addEventListener("DOMContentLoaded", function () {
    // Select elements
    const vehicleCheckbox = document.getElementById("vehicle-checkbox");
    const vehicleInput = document.getElementById("vehicle-input");

    const preregCheckbox = document.getElementById("prereg-checkbox");
    const preregInputs = document.getElementById("prereg-inputs");

    const checkinForm = document.getElementById("checkin-form");
    const checkinButton = document.getElementById("checkin-btn");

    const video = document.getElementById("video");
    const captureButton = document.getElementById("capture-btn");
    const capturedPhoto = document.getElementById("captured-photo");
    const photoContainer = document.getElementById("photo-container");
    const canvas = document.createElement("canvas"); // Create canvas dynamically

    // ✅ Ensure event listeners are properly attached
    if (vehicleCheckbox && vehicleInput) {
        vehicleCheckbox.addEventListener("change", function () {
            if (this.checked) {
                vehicleInput.style.display = "block"; // Show vehicle input
            } else {
                vehicleInput.style.display = "none"; // Hide vehicle input
            }
        });
    }

    if (preregCheckbox && preregInputs) {
        preregCheckbox.addEventListener("change", function () {
            if (this.checked) {
                preregInputs.style.display = "block"; // Show pre-registration inputs
            } else {
                preregInputs.style.display = "none"; // Hide pre-registration inputs
            }
        });
    }

    // ✅ Enable submit button only when form is valid
    if (checkinForm && checkinButton) {
        checkinForm.addEventListener("input", function () {
            if (checkinForm.checkValidity()) {
                checkinButton.classList.remove("disabled");
                checkinButton.removeAttribute("disabled");
            } else {
                checkinButton.classList.add("disabled");
                checkinButton.setAttribute("disabled", "true");
            }
        });
    }

    // ✅ Camera functionality
    if (video && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true }).then(function (stream) {
            video.srcObject = stream;
            video.play();
        }).catch(function (error) {
            console.error("Error accessing the camera: ", error);
        });
    }

    if (captureButton && capturedPhoto && photoContainer) {
        captureButton.addEventListener("click", function () {
            const context = canvas.getContext("2d");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Convert canvas image to data URL and set it in the <img>
            capturedPhoto.src = canvas.toDataURL("image/png");
            capturedPhoto.style.display = "block"; // Ensure the image is visible
            photoContainer.style.display = "block"; // Show the container
        });
    }
});
