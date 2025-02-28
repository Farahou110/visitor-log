document.addEventListener("DOMContentLoaded", function () {
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

    const thankYouModal = document.getElementById("thankYouModal");
    const closeModal = document.getElementById("closeModal");

    // 🔹 Toggle vehicle input field
    vehicleCheckbox.addEventListener("change", function () {
        vehicleInput.classList.toggle("hidden", !vehicleCheckbox.checked);
    });

    // 🔹 Toggle pre-registration input fields
    preregCheckbox.addEventListener("change", function () {
        preregInputs.classList.toggle("hidden", !preregCheckbox.checked);
    });

    // 🔹 Enable submit button only when form is valid
    checkinForm.addEventListener("input", function () {
        if (checkinForm.checkValidity()) {
            checkinButton.classList.remove("disabled");
            checkinButton.removeAttribute("disabled");
        } else {
            checkinButton.classList.add("disabled");
            checkinButton.setAttribute("disabled", "true");
        }
    });

    // 🔹 Handle Check-in Form Submission (Using JSON)
    checkinForm.addEventListener("submit", function (event) {
        event.preventDefault(); // Prevent default form submission

        const formData = new FormData(checkinForm);
        const jsonData = {};

        // Convert FormData to JSON
        formData.forEach((value, key) => {
            jsonData[key] = value;
        });

        fetch("/checkin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(jsonData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === "success") {
                thankYouModal.classList.remove("hidden"); // Show Thank You popup
                checkinForm.reset(); // Reset the form
                checkinButton.classList.add("disabled"); // Disable button again
                checkinButton.setAttribute("disabled", "true");
            } else {
                alert("❌ Error: " + data.message);
            }
        })
        .catch(error => console.error("Error:", error));
    });

    // 🔹 Close Thank You Modal
    closeModal.addEventListener("click", function () {
        thankYouModal.classList.add("hidden");
    });

    // 🔹 Camera functionality
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true }).then(function (stream) {
            video.srcObject = stream;
            video.play();
        });
    }

    captureButton.addEventListener("click", function () {
        const context = canvas.getContext("2d");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas image to data URL and set it in the <img>
        capturedPhoto.src = canvas.toDataURL("image/png");
        capturedPhoto.classList.remove("hidden");
        photoContainer.classList.remove("hidden");
    });
});
