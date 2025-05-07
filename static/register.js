<<<<<<< HEAD
document.addEventListener("DOMContentLoaded", function () {
    // Form & Input Elements
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
    const hostInput = document.getElementById("host");
    const hostLoading = document.createElement('span');
    hostLoading.className = 'loading-spinner';
    hostInput.parentNode.appendChild(hostLoading);

    // Form Fields
    const usernameInput = document.getElementById("username");
    const phoneInput = document.getElementById("phone");
    const idInput = document.getElementById("id");
    const emailInput = document.getElementById("email");
    const purposeInput = document.getElementById("purpose");
    const vehiclePlateInput = document.getElementById("vehicle-plate");

    // Initialize form state
    let hostsLoaded = false;
    let cameraInitialized = false;

    // Toggle vehicle input field
    vehicleCheckbox.addEventListener("change", () => {
        vehicleInput.classList.toggle("hidden", !vehicleCheckbox.checked);
        validateForm();
    });

    // Input validations
    idInput.addEventListener("input", () => {
        idInput.value = idInput.value.replace(/\D/g, "").slice(0, 9);
        validateForm();
    });

    emailInput.addEventListener("input", () => {
        const isValid = emailInput.value.includes("@") && emailInput.value.includes(".");
        emailInput.setCustomValidity(isValid ? "" : "Please enter a valid email");
        validateForm();
    });

    // Set today's date as minimum for check-in
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("checkin-date").setAttribute("min", today);

    // Enhanced form validation
    function validateForm() {
        const isFormValid = 
            usernameInput.value.trim() !== "" &&
            idInput.value.trim() !== "" &&
            emailInput.checkValidity() &&
            phoneInput.value.trim() !== "" &&
            purposeInput.value.trim() !== "" &&
            hostInput.value !== "" &&
            hostsLoaded;

        checkinButton.disabled = !isFormValid;
        checkinButton.classList.toggle("disabled", !isFormValid);
        return isFormValid;
    }

    // Add event listeners for validation
    document.querySelectorAll("#checkin-form input, #checkin-form select, #checkin-form textarea")
        .forEach(input => input.addEventListener("input", validateForm));

    // Fetch and populate host names with error handling
    function loadHosts() {
        hostLoading.classList.remove('hidden');
        hostInput.disabled = true;
        hostInput.innerHTML = '<option value="" disabled selected>Loading hosts...</option>';

        fetch("/get_hosts")
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.json();
            })
            .then(hosts => {
                if (!Array.isArray(hosts) || hosts.length === 0) {
                    throw new Error('No hosts available');
                }

                hostInput.innerHTML = '<option value="" disabled selected>Select your host</option>';
                hosts.forEach(hostName => {
                    const option = new Option(hostName, hostName);
                    hostInput.add(option);
                });

                hostsLoaded = true;
                validateForm();
            })
            .catch(error => {
                console.error("Error loading hosts:", error);
                hostInput.innerHTML = '<option value="" disabled selected>Error loading hosts</option>';
                alert("Could not load host list. Please try again later.");
            })
            .finally(() => {
                hostLoading.classList.add('hidden');
                hostInput.disabled = false;
            });
    }


    // Handle form submission with better error handling
    checkinForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        
        if (!validateForm()) {
            alert("Please fill all required fields correctly");
            return;
        }

        checkinButton.disabled = true;
        checkinButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        try {
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

            const response = await fetch("/checkin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Server error occurred');
            }

            if (data.status === "success") {
                showThankYouModal();
                resetForm();
            } else {
                throw new Error(data.message || 'Check-in failed');
            }
        } catch (error) {
            console.error("Submission error:", error);
            alert(`Error: ${error.message}`);
        } finally {
            checkinButton.disabled = false;
            checkinButton.innerHTML = '<i class="fas fa-check-circle"></i> CHECK IN';
        }
    });

    // Camera initialization with user feedback
    function initializeCamera() {
        if (cameraInitialized) return;

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error("Camera API not supported");
            captureButton.disabled = true;
            captureButton.title = "Camera not supported in your browser";
            return;
        }

        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                video.srcObject = stream;
                video.play();
                cameraInitialized = true;
            })
            .catch(error => {
                console.error("Camera access error:", error);
                captureButton.disabled = true;
                captureButton.title = "Camera access denied";
            });
    }

    // Initialize camera when user interacts with the form
    document.querySelectorAll('#checkin-form input, #checkin-form select, #checkin-form textarea')
        .forEach(el => el.addEventListener('focus', initializeCamera));

    // Capture photo functionality
    captureButton.addEventListener("click", () => {
        if (!cameraInitialized) {
            alert("Camera not ready. Please allow camera access first.");
            return;
        }

        const context = canvas.getContext("2d");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        capturedPhoto.src = canvas.toDataURL("image/png");
        capturedPhoto.classList.remove("hidden");
        photoContainer.classList.remove("hidden");
        validateForm();
    });

    // Modal control
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

    function resetForm() {
        checkinForm.reset();
        checkinButton.disabled = true;
        checkinButton.classList.add("disabled");
        photoContainer.classList.add("hidden");
        capturedPhoto.src = "";
        vehicleInput.classList.add("hidden");
        vehicleCheckbox.checked = false;
    }
});
<<<<<<< HEAD
=======
    document.addEventListener("DOMContentLoaded", function () {
        //  Form & Input Elements
        const vehicleCheckbox = document.getElementById("vehicle-checkbox");
        const vehicleInput = document.getElementById("vehicle-input");

        // const preregCheckbox = document.getElementById("prereg-checkbox");
        // const preregInputs = document.getElementById("prereg-inputs");
        // const preregCodeInput = document.getElementById("prereg-code");

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
        // const vehicleCheckbox = document.getElementById("vehicle-checkbox");
        const vehiclePlateInput = document.getElementById("vehicle-plate");
        // const hostPhoneInput = document.getElementById("host-phone");
        // const hostPhoneError = document.getElementById("host-phone-error");

        //  Toggle vehicle input field
        vehicleCheckbox.addEventListener("change", () => {
            vehicleInput.classList.toggle("hidden", !vehicleCheckbox.checked);
        });

        // //  Toggle pre-registration input fields
        // if (preregCheckbox) {
        //     preregCheckbox.addEventListener("change", () => {
        //         preregInputs.classList.toggle("hidden", !preregCheckbox.checked);
        //         toggleFormFields(!preregCheckbox.checked);
        //     });
        // }

        function toggleFormFields(enable) {
            document.querySelectorAll("#checkin-form input, #checkin-form select, #checkin-form textarea")
                .forEach(input => {
                    if (input.id !== "prereg-code") input.disabled = !enable;
                });
        }

        // 🔹 ID Number Validation (Only digits, max length 9)
        idInput.addEventListener("input", () => {
            idInput.value = idInput.value.replace(/\D/g, "").slice(0, 9);
        });

        // 🔹 Email Validation
        emailInput.addEventListener("input", () => {
            emailInput.setCustomValidity(emailInput.value.includes("@") ? "" : "Email must contain @");
        });

        // Prevent selecting past dates
        document.addEventListener("DOMContentLoaded", function () {
            let today = new Date().toISOString().split("T")[0];
            document.getElementById("checkin-date").setAttribute("min", today);
        });

        
        // 🔹 Auto-fetch host phone number when host is selected
        hostInput.addEventListener("change", () => {
            const selectedHost = hostInput.value.trim();

            if (selectedHost) {
                fetch(`/get-host-phone?host=${encodeURIComponent(selectedHost)}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === "success") {
                            hostPhoneInput.value = data.phone;
                            hostPhoneError.classList.add("hidden");
                        } else {
                            hostPhoneInput.value = "";
                            hostPhoneError.classList.remove("hidden");
                            hostPhoneError.textContent = "Host phone number not found!";
                        }
                    })
                    .catch(error => {
                        console.error("Error fetching host phone:", error);
                        hostPhoneError.classList.remove("hidden");
                        hostPhoneError.textContent = "Error fetching host phone!";
                    });
            } else {
                hostPhoneInput.value = "";
                hostPhoneError.classList.add("hidden");
            }
        });

        //  Enable check-in button when form is valid
        checkinForm.addEventListener("input", validateForm);

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

        // Listen for input changes to enable button
        document.querySelectorAll("#checkin-form input, #checkin-form select, #checkin-form textarea")
        .forEach(input => input.addEventListener("input", validateForm));

        // Handle Check-in Form Submission (JSON format)
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
                captured_photo: capturedPhoto.src || null // Send captured photo if available
            };

            fetch("/checkin", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username: "John Doe",
                    phone: "+123456789",
                    host: "HostName",
                    purpose: "Meeting",
                }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === "success") {
                    alert(data.message);  // Show success message
                    location.reload();     //  Refresh the page
                } else {
                    alert("Error: " + data.message);
                }
            })
            .catch(error => {
                alert("An unexpected error occurred.");
            });
            

            //SEND DATA TO SERVER
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
                } else {
                    alert("Error: " + data.message);
                }
            })
            .catch(error => {
                console.error("Error:", error);
                alert("An error occurred while checking in.");
            });
        });

        function showThankYouModal() {
            thankYouModal.classList.remove("hidden");
        }

        //  Close Thank You Modal
        closeModal.addEventListener("click", () => {
            thankYouModal.classList.add("hidden");
        });

        //  Camera functionality (Capture Photo)
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

            // Store image data in a hidden input field for submission
            let imageInput = document.getElementById("photo-input");
            if (!imageInput) {
                imageInput = document.createElement("input");
                imageInput.type = "hidden";
                imageInput.name = "photo";
                imageInput.id = "photo-input";
                checkinForm.appendChild(imageInput);
            }
            imageInput.value = imageData;
        });
    });

>>>>>>> 09336c059f95f67ee1feb3ec125672189c0ad404
=======

document.getElementById("verifyCheckinForm").addEventListener("submit", async function(e) {
    e.preventDefault();
  
    const username = document.getElementById("verifyUsername").value;
    const checkin_code = document.getElementById("verifyCode").value;
  
    const response = await fetch("/verify-checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, checkin_code })
    });
  
    const result = await response.json();
    alert(result.message);
  });
>>>>>>> local
