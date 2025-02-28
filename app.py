from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
import re
from pymongo import MongoClient
from flask_mail import Mail, Message
from twilio.rest import Client
from werkzeug.security import generate_password_hash, check_password_hash
import os

# ✅ Flask App Initialization
app = Flask(__name__)  
app.secret_key = "your_secret_key"

# ✅ MongoDB Connection
client = MongoClient("mongodb://localhost:27017/")
db = client["VISITORS"]
visitors_collection = db["visitor"]  # Stores visitor check-ins
hosts_collection = db["hosts"]  # Stores host login details

# ✅ Flask-Mail Configuration
app.config["MAIL_SERVER"] = "smtp.gmail.com"
app.config["MAIL_PORT"] = 587
app.config["MAIL_USE_TLS"] = True
app.config["MAIL_USE_SSL"] = False
app.config["MAIL_USERNAME"] = os.getenv("MAIL_USERNAME")  
app.config["MAIL_PASSWORD"] = os.getenv("MAIL_PASSWORD")  
mail = Mail(app)

# ✅ Twilio SMS Configuration
TWILIO_SID = os.getenv("TWILIO_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")
twilio_client = Client(TWILIO_SID, TWILIO_AUTH_TOKEN)

# Store pending approvals {host_phone: visitor_id}
pending_approvals = {}

# ----- ROUTES -----

# ✅ 🔹 Visitor Index Page (Only for Visitors)
@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")



# ✅ 🔹 Register a New Host (Admin API)
@app.route("/register", methods=["GET", "POST"])
def register_host():
    if request.method == "POST":
        username = request.form["username"].strip()
        password = request.form["password"].strip()
        email = request.form["email"].strip()
        phone = request.form["phone"].strip()

        # 🔹 Check if all fields are filled
        if not username or not password or not email or not phone:
            flash("All fields are required.", "error")
            return redirect(url_for("register_host"))

        # 🔹 Validate email format
        if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
            flash("Invalid email format.", "error")
            return redirect(url_for("register_host"))

        # 🔹 Validate phone format
        if not re.match(r"^\+?[0-9]{7,15}$", phone):  
            flash("Invalid phone number format.", "error")
            return redirect(url_for("register_host"))

        # 🔹 Check if username already exists
        if hosts_collection.find_one({"username": username}):
            flash("Username already exists. Please choose another one.", "error")
            return redirect(url_for("register_host"))

        # 🔹 Hash the password
        hashed_password = generate_password_hash(password)

        # 🔹 Save host details in MongoDB
        hosts_collection.insert_one({
            "username": username,
            "password": hashed_password,
            "email": email,
            "phone": phone
        })

        flash("Registration successful! Please log in.", "success")
        return redirect(url_for("host_login"))  # 🔹 Redirect to login page

    return render_template("register.html")  # Show registration form

# ✅ 🔹 Host Login
@app.route("/login", methods=["GET", "POST"])
def login():
    """Handles host login and session management."""
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]

        host = hosts_collection.find_one({"username": username})
        
        if host and check_password_hash(host["password"], password):  # ✅ Correct password check
            session["host"] = username  # Store in session
            return redirect(url_for("dashboard"))  # Redirect to dashboard

        return render_template("login.html", error="Invalid username or password")

    return render_template("login.html")


# ✅ 🔹 Host Logout
@app.route("/logout")
def logout():
    """Logs out the host and redirects to login page."""
    session.pop("host", None)
    return redirect(url_for("login"))


# ✅ 🔹 Host Dashboard (Restricted Access)
@app.route("/dashboard", methods=["GET"])
def dashboard():
    """Host dashboard - Only accessible to logged-in hosts."""
    if "host" not in session:
        return redirect(url_for("login"))

    visitors = list(visitors_collection.find({}, {"_id": 0}))  # Fetch all visitors
    return render_template("dashboard.html", visitors=visitors)


# ✅ 🔹 Handle Visitor Check-In & Notify Host
@app.route("/checkin", methods=["POST"])
def checkin():
    try:
        data = request.json  # Get JSON data from request

        if not data:
            return jsonify({"status": "error", "message": "Invalid data"}), 400
        
        host_name = data.get("host")
        visitor_name = data.get("username")
        visitor_phone = data.get("phone")

        # 🔹 Fetch host details
        host_data = hosts_collection.find_one({"username": host_name})
        if not host_data:
            return jsonify({"status": "error", "message": "Host not found"}), 400

        host_phone = host_data.get("phone")

        # 🔹 Save visitor details in MongoDB
        visitor = visitors_collection.insert_one({
            **data,
            "status": "Pending",
        })
        visitor_id = str(visitor.inserted_id)

        # 🔹 Store approval request
        pending_approvals[host_phone] = {"visitor_id": visitor_id, "visitor_phone": visitor_phone}

        # 🔹 Send SMS to host for approval
        twilio_client.messages.create(
            body=f"Visitor {visitor_name} wants to meet you. Reply YES to approve or NO to decline.",
            from_=TWILIO_PHONE_NUMBER,
            to=host_phone
        )

        return jsonify({"status": "success", "message": "Check-in successful, host notified!"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ✅ 🔹 Approve or Decline Visitors (Host Only)
@app.route("/approve_visitor", methods=["POST"])
def approve_visitor():
    if "host" not in session:
        return jsonify({"status": "error", "message": "Unauthorized"}), 403

    data = request.json
    visitor_id = data.get("id")
    status = data.get("status")  # "Approved" or "Declined"

    # Update visitor status in MongoDB
    visitors_collection.update_one({"_id": visitor_id}, {"$set": {"status": status}})

    return jsonify({"status": "success", "message": f"Visitor {status} successfully"})


# ✅ 🔹 Handle Host SMS Responses (YES/NO)
@app.route("/sms-reply", methods=["POST"])
def sms_reply():
    """Handles incoming SMS replies from hosts."""
    from_number = request.form.get("From")
    response_text = request.form.get("Body").strip().lower()

    # 🔹 Get pending visitor request
    approval_data = pending_approvals.get(from_number)

    if not approval_data:
        return "No pending approvals for this number.", 400

    visitor_id = approval_data["visitor_id"]
    visitor_phone = approval_data["visitor_phone"]

    # 🔹 Determine approval status
    if response_text == "yes":
        status = "Approved"
        visitor_message = "✅ Your visit has been approved. Please proceed!"
    elif response_text == "no":
        status = "Declined"
        visitor_message = "❌ Your visit request has been declined."
    else:
        return "Invalid response. Reply YES or NO.", 400

    # 🔹 Update visitor status in MongoDB
    visitors_collection.update_one({"_id": visitor_id}, {"$set": {"status": status}})

    # 🔹 Notify visitor via SMS
    twilio_client.messages.create(
        body=visitor_message,
        from_=TWILIO_PHONE_NUMBER,
        to=visitor_phone
    )

    # 🔹 Remove from pending approvals
    del pending_approvals[from_number]

    return "Response processed successfully."


# ✅ 🔹 Fetch All Visitors (Host Only)
@app.route("/visitors", methods=["GET"])
def get_visitors():
    if "host" not in session:
        return jsonify({"status": "error", "message": "Unauthorized"}), 403

    visitors = list(visitors_collection.find({}, {"_id": 0}))
    return jsonify(visitors)


# ✅ Run Flask App
if __name__ == "__main__":
    app.run(debug=True)
