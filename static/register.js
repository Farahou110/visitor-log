document.addEventListener("DOMContentLoaded", function () {
    //  Form & Input Elements
    const vehicleCheckbox = document.getElementById("vehicle-checkbox");
    const vehicleInput = document.getElementById("vehicle-input");

    const checkinForm = document.getElementById("checkin-form");
    const checkinButton = document.getElementById("checkin-btn");

    const video = document.getElementById("video");
    const captureButton = document.getElementById("capture-btn");
    const capturedPhoto = document.getElementById("captured-photo");
    const photoContainer = document.getElementById("photo-container");
    const canvas = document.createElement("canvas");

    const thankYouModal = document.getElementById("thankYouModal");
    const closeModal = document.getElementById("closeModal");

    //  Form Fields
    const usernameInput = document.getElementById("username");
    const phoneInput = document.getElementById("phone");
    const idInput = document.getElementById("id");
    const emailInput = document.getElementById("email");
    const purposeInput = document.getElementById("purpose");
    const hostInput = document.getElementById("host");
    const vehiclePlateInput = document.getElementById("vehicle-plate");

    // Toggle vehicle input field
    vehicleCheckbox.addEventListener("change", () => {
        vehicleInput.classList.toggle("hidden", !vehicleCheckbox.checked);
    });

    // ID Number Validation (only digits, max 9)
    idInput.addEventListener("input", () => {
        idInput.value = idInput.value.replace(/\D/g, "").slice(0, 9);
    });

    // Email Validation
    emailInput.addEventListener("input", () => {
        emailInput.setCustomValidity(emailInput.value.includes("@") ? "" : "Email must contain @");
    });

    // Set today's date as minimum for check-in
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("checkin-date").setAttribute("min", today);

    // Enable check-in button when form is valid
    function validateForm() {
        const isValid =
            usernameInput.value.trim() !== "" &&
            idInput.value.trim() !== "" &&
            emailInput.value.includes("@") &&
            phoneInput.value.trim() !== "" &&
            purposeInput.value.trim() !== "" &&
            hostInput.value.trim() !== "";

        checkinButton.disabled = !isValid;
        checkinButton.classList.toggle("disabled", !isValid);
    }

    document.querySelectorAll("#checkin-form input, #checkin-form select, #checkin-form textarea")
        .forEach(input => input.addEventListener("input", validateForm));

    // Fetch and populate host names
    fetch("/get_hosts")
        .then(response => response.json())
        .then(hosts => {
            hosts.forEach(hostName => {
                const option = document.createElement("option");
                option.value = hostName;
                option.textContent = hostName;
                hostInput.appendChild(option);
            });
        })
        .catch(error => console.error("Error fetching hosts:", error));

    // Handle Check-in Form Submission (JSON)
    checkinForm.addEventListener("submit", event => {
        event.preventDefault();

        const formData = {
            username: usernameInput.value.trim(),
            id: idInput.value.trim(),
            email: emailInput.value.trim(),
            phone: phoneInput.value.trim(),
            purpose: purposeInput.value.trim(),
            host: hostInput.value.trim(),
            vehicle_plate: vehicleCheckbox.checked ? vehiclePlateInput.value.trim() : "None",
            captured_photo: capturedPhoto.src || null
        };

        fetch("/checkin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === "success") {
                showThankYouModal();
                checkinForm.reset();
                checkinButton.disabled = true;
                checkinButton.classList.add("disabled");
                photoContainer.classList.add("hidden");
                capturedPhoto.src = "";
            } else {
                alert("Error: " + data.message);
            }
        })
        .catch(error => {
            console.error("Error:", error);
            alert("An error occurred while checking in.");
        });
    });

    // Camera functionality (Capture Photo)
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                video.srcObject = stream;
                video.play();
            })
            .catch(error => console.error("Error accessing camera:", error));
    }

    captureButton.addEventListener("click", () => {
        const context = canvas.getContext("2d");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = canvas.toDataURL("image/png");
        capturedPhoto.src = imageData;
        capturedPhoto.classList.remove("hidden");
        photoContainer.classList.remove("hidden");
    });

    // Close Thank You Modal
    closeModal.addEventListener("click", () => {
        thankYouModal.classList.add("hidden");
    });

    function showThankYouModal() {
        if (thankYouModal) {
            thankYouModal.classList.remove("hidden");
        } else {
            console.error("Modal element not found!");
        }
    }
});
