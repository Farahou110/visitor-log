document.addEventListener("DOMContentLoaded", function () {
    const vehicleCheckbox = document.getElementById("vehicle-checkbox");
    const vehicleInput = document.getElementById("vehicle-input");

    const preregCheckbox = document.getElementById("prereg-checkbox");
    const preregInputs = document.getElementById("prereg-inputs");
    const preregCodeInput = document.getElementById("prereg-code");

    const checkinForm = document.getElementById("checkin-form");
    const checkinButton = document.getElementById("checkin-btn");

    const video = document.getElementById("video");
    const captureButton = document.getElementById("capture-btn");
    const capturedPhoto = document.getElementById("captured-photo");
    const photoContainer = document.getElementById("photo-container");
    const canvas = document.createElement("canvas");

    const thankYouModal = document.getElementById("thankYouModal");
    const closeModal = document.getElementById("closeModal");

    // Form Fields
    const idInput = document.getElementById("id");
    const emailInput = document.getElementById("email");
    const purposeInput = document.getElementById("purpose");
    const hostInput = document.getElementById("host");
    const hostPhoneInput = document.getElementById("host-phone");  // New field for host phone

    // 🔹 Toggle vehicle input field
    vehicleCheckbox.addEventListener("change", function () {
        vehicleInput.classList.toggle("hidden", !vehicleCheckbox.checked);
    });

    // 🔹 Toggle pre-registration input fields
    preregCheckbox.addEventListener("change", function () {
        if (preregCheckbox.checked) {
            preregInputs.classList.remove("hidden");

            // Disable all other fields except photo and pre-registration code
            document.querySelectorAll("#checkin-form input, #checkin-form select, #checkin-form textarea").forEach(input => {
                if (input.id !== "prereg-code") input.disabled = true;
            });
        } else {
            preregInputs.classList.add("hidden");

            // Re-enable all fields
            document.querySelectorAll("#checkin-form input, #checkin-form select, #checkin-form textarea").forEach(input => {
                input.disabled = false;
            });
        }
    });

    // 🔹 ID Number Validation (Only digits, max 9)
    idInput.addEventListener("input", function () {
        this.value = this.value.replace(/\D/g, "").slice(0, 9);
    });

    // 🔹 Email Validation (Must contain '@')
    emailInput.addEventListener("input", function () {
        if (!this.value.includes("@")) {
            this.setCustomValidity("Email must contain @");
        } else {
            this.setCustomValidity("");
        }
    });

    // 🔹 Auto-fetch host phone number when host is selected
    hostInput.addEventListener("change", function () {
        const selectedHost = hostInput.value;

        if (selectedHost) {
            fetch(`/get-host-phone?host=${encodeURIComponent(selectedHost)}`)
                .then(response => response.json())
                .then(data => {
                    if (data.status === "success") {
                        hostPhoneInput.value = data.phone;
                    } else {
                        hostPhoneInput.value = "";
                        alert("⚠️ Host phone number not found!");
                    }
                })
                .catch(error => console.error("Error fetching host phone:", error));
        } else {
            hostPhoneInput.value = "";
        }
    });

    // 🔹 Enable submit button only when form is valid
    checkinForm.addEventListener("input", function () {
        if (checkinForm.checkValidity() && validateFields()) {
            checkinButton.classList.remove("disabled");
            checkinButton.removeAttribute("disabled");
        } else {
            checkinButton.classList.add("disabled");
            checkinButton.setAttribute("disabled", "true");
        }
    });

    // 🔹 Extra Validation for Required Fields
    function validateFields() {
        return (
            (preregCheckbox.checked || 
            (idInput.value.trim().length > 0 &&
            emailInput.value.includes("@") &&
            purposeInput.value.trim().length > 0 &&
            hostInput.value.trim().length > 0 &&
            hostPhoneInput.value.trim().length > 0)) // Ensure host phone is present
        );
    }

    // 🔹 Handle Check-in Form Submission (Using JSON)
    checkinForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const formData = new FormData(checkinForm);
        const jsonData = {};

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
                thankYouModal.classList.remove("hidden");
                checkinForm.reset();
                checkinButton.classList.add("disabled");
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

        capturedPhoto.src = canvas.toDataURL("image/png");
        capturedPhoto.classList.remove("hidden");
        photoContainer.classList.remove("hidden");
    });
});
