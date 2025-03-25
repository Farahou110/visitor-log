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
        // hostInput.addEventListener("change", () => {
        //     const selectedHost = hostInput.value.trim();

        //     if (selectedHost) {
        //         fetch(`/get-host-phone?host=${encodeURIComponent(selectedHost)}`)
        //             .then(response => response.json())
        //             .then(data => {
        //                 if (data.status === "success") {
        //                     hostPhoneInput.value = data.phone;
        //                     hostPhoneError.classList.add("hidden");
        //                 } else {
        //                     hostPhoneInput.value = "";
        //                     hostPhoneError.classList.remove("hidden");
        //                     hostPhoneError.textContent = "Host phone number not found!";
        //                 }
        //             })
        //             .catch(error => {
        //                 console.error("Error fetching host phone:", error);
        //                 hostPhoneError.classList.remove("hidden");
        //                 hostPhoneError.textContent = "Error fetching host phone!";
        //             });
        //     } else {
        //         hostPhoneInput.value = "";
        //         hostPhoneError.classList.add("hidden");
        //     }
        // });

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
            const thankYouModal = document.getElementById("thankYouModal");
            if (thankYouModal) {
                thankYouModal.classList.remove("hidden");
            } else {
                console.error("Modal element not found!");
            }
        }
        
        document.getElementById("closeModal").addEventListener("click", () => {
            document.getElementById("thankYouModal").classList.add("hidden");
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

    document.addEventListener("DOMContentLoaded", function () {
        const hostSelect = document.getElementById("host");
    
        // Fetch and populate host names
        fetch("/get_hosts")
            .then(response => response.json())
            .then(hosts => {
                hosts.forEach(hostName => {
                    let option = document.createElement("option");
                    option.value = hostName;
                    option.textContent = hostName;
                    hostSelect.appendChild(option);
                });
            })
            .catch(error => console.error("Error fetching hosts:", error));
    });
    