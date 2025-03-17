from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
import re
from pymongo import MongoClient
from flask_mail import Mail, Message
from bson import ObjectId
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import random           
import string


#  Flask App Initialization
app = Flask(__name__)  
app.secret_key = "your_secret_key"

#  MongoDB Connection
client = MongoClient("mongodb://localhost:27017/")
db = client["VISITORS"]
visitor_collection = db["visitor"]  # Stores visitor check-ins
hosts_collection = db["hosts"]  # Stores host login details
pre_registered_collection = db["pre_registered"]  # Stores pre-registered visitors
approved_collection = db["approved"]  # Stores approved visitors    
declined_collection = db["declined"]  # Stores declined visitors
checkout_collection = db["checkout"]  # Stores checked-out visitors

# Flask-Mail Configuration
app.config["MAIL_SERVER"] = "smtp.gmail.com"  # Change for Outlook, Yahoo, etc.
app.config["MAIL_PORT"] = 587
app.config["MAIL_USE_TLS"] = True
app.config["MAIL_USERNAME"] = "visitormanagement687@gmail.com"  # Replace with your email
app.config["MAIL_PASSWORD"] = "hnvc inum rfwe zbsb"  # Replace with your email password
app.config["MAIL_DEFAULT_SENDER"] = "visitormanagement687@gmail.com"

mail = Mail(app)


# ----- ROUTES -----

# Landing page

@app.route("/")
def buttons():
    return render_template("buttons.html")



#pre-register visitor
@app.route("/prereg", methods=["GET"])
def prereg():
    return render_template("prereg.html")


# Route to fetch visitor details

@app.route("/check-visitor", methods=["GET"])
def check_visitor():
    try:
        username = request.args.get("username", "").strip()

        if not username:
            return jsonify({"status": "error", "message": "Username is required"}), 400

        # Debugging log: Print received username
        print(f"Searching for username: {username}")

        # Fetch visitor details
        visitor = visitor_collection.find_one(
            {"username": {"$regex": f"^{re.escape(username)}$", "$options": "i"}}
        )

        # Debugging log: Print retrieved visitor
        print("Visitor found:", visitor)

        if not visitor:
            return jsonify({"status": "error", "message": "Visitor not found"}), 404

        visitor["_id"] = str(visitor["_id"])

        return jsonify({"status": "success", "visitor": visitor})

    except Exception as e:
        return jsonify({"status": "error", "message": f"Server error: {str(e)}"}), 500


# Generate a unique 6-digit check-in code
def generate_checkin_code(length=6):
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))

# Route to check-in visitor
@app.route("/checkin-visitor", methods=["POST"])
def checkin_visitor():
    try:
        data = request.json
        username = data.get("username", "").strip()
        checkin_date = data.get("checkin_date", "").strip()

        if not username or not checkin_date:
            return jsonify({"status": "error", "message": "Username and check-in date are required"}), 400

        try:
            checkin_date = datetime.strptime(checkin_date, "%Y-%m-%d")
        except ValueError:
            return jsonify({"status": "error", "message": "Invalid date format. Use YYYY-MM-DD"}), 400

        visitor = visitor_collection.find_one({"username": {"$regex": f"^{username}$", "$options": "i"}})

        if not visitor:
            return jsonify({"status": "error", "message": "Visitor not found"}), 404

        if pre_registered_collection.find_one({"username": username, "status": "Checked In"}):
            return jsonify({"status": "error", "message": "Visitor already checked in"}), 400

        checkin_code = generate_checkin_code()
        checkin_data = {
            "username": visitor["username"],
            "email": visitor["email"],
            "phone": visitor["phone"],
            "host": visitor["host"],
            "purpose": visitor["purpose"],
            "status": "Checked In",
            "checkin_date": checkin_date,
            "checkin_code": checkin_code,
            "checkin_time": datetime.utcnow().isoformat()
        }
        pre_registered_collection.insert_one(checkin_data)

        send_checkin_email(visitor["email"], username, checkin_code)

        return jsonify({"status": "success", "message": f"Check-in successful! Check your email for the code: {checkin_code}"}), 201
    
    except Exception as e:
        return jsonify({"status": "error", "message": f"Server error: {str(e)}"}), 500

# Route to verify check-in code
@app.route("/verify-checkin", methods=["POST"])
def verify_checkin():
    try:
        data = request.json
        username = data.get("username", "").strip()
        entered_code = data.get("checkin_code", "").strip()

        if not username or not entered_code:
            return jsonify({"status": "error", "message": "Username and check-in code are required"}), 400

        checkin_record = pre_registered_collection.find_one({"username": username, "status": "Checked In"})
        
        if not checkin_record:
            return jsonify({"status": "error", "message": "No active check-in found for this visitor"}), 404

        if checkin_record["checkin_code"] != entered_code:
            return jsonify({"status": "error", "message": "Invalid check-in code"}), 401

        return jsonify({"status": "success", "message": "Check-in verified successfully"}), 200
    
    except Exception as e:
        return jsonify({"status": "error", "message": f"Server error: {str(e)}"}), 500

# Fetch Pre-Registered Visitor Details
@app.route("/fetch-visitor", methods=["GET"])
def fetch_visitor():
    username = request.args.get("username", "").strip()

    if not username:
        return jsonify({"status": "error", "message": "Username is required"}), 400

    visitor = visitor_collection.find_one({"username": {"$regex": f"^{username}$", "$options": "i"}}, {"_id": 0})

    if not visitor:
        return jsonify({"status": "error", "message": "Visitor not found"}), 404

    return jsonify({"status": "success", "visitor": visitor})

# Pre-Register a Visitor and Send Check-In Code
@app.route("/checkin", methods=["POST"])
def checkin():
    try:
        data = request.json
        if not data:
            return jsonify({"status": "error", "message": "Invalid data"}), 400

        visitor_name = data.get("username", "").strip()
        visitor_email = data.get("email", "").strip()
        visitor_phone = data.get("phone", "").strip()

        if not visitor_name or not visitor_email:
            return jsonify({"status": "error", "message": "Username and email are required"}), 400

        if pre_registered_collection.find_one({"username": visitor_name}):
            return jsonify({"status": "error", "message": "Visitor already checked in"}), 400

        checkin_code = generate_checkin_code()

        visitor_collection.insert_one({
            **data,
            "status": "Pending",
            "checkin_code": checkin_code,
            "checkin_time": datetime.utcnow().isoformat()
        })

        subject = "Your Visitor Check-In Code"
        body = f"Hello {visitor_name},\n\nYour check-in code is: {checkin_code}\n\nUse this code to complete your check-in process."
        msg = Message(subject=subject, recipients=[visitor_email], body=body)
        mail.send(msg)

        return jsonify({"status": "success", "message": "Check-in successful! Code sent to email."})
    
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# Visitor Index Page (Only for Visitors)
@app.route("/index", methods=["GET"])
def index():
    return render_template("index.html")


# Register a New Host (Admin API)
@app.route("/register", methods=["GET", "POST"])
def register_host():
    if request.method == "POST":
        username = request.form["username"].strip()
        password = request.form["password"].strip()
        email = request.form["email"].strip()
        phone = request.form["phone"].strip()

        #  Check if all fields are filled
        if not username or not password or not email or not phone:
            flash("All fields are required.", "error")
            return redirect(url_for("register_host"))

        #  Validate email format
        if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
            flash("Invalid email format.", "error")
            return redirect(url_for("register_host"))

        #  Validate phone format
        if not re.match(r"^\+?[0-9]{7,15}$", phone):  
            flash("Invalid phone number format.", "error")
            return redirect(url_for("register_host"))

        #  Check if username already exists
        if hosts_collection.find_one({"username": username}):
            flash("Username already exists. Please choose another one.", "error")
            return redirect(url_for("register_host"))

        #  Hash the password
        hashed_password = generate_password_hash(password)

        #  Save host details in MongoDB
        hosts_collection.insert_one({
            "username": username,
            "password": hashed_password,
            "email": email,
            "phone": phone
        })

        flash("Registration successful! Please log in.", "success")
        return redirect(url_for("host_login"))  # 🔹 Redirect to login page

    return render_template("register.html")  # Show registration form

# Host Login
@app.route("/login", methods=["GET", "POST"])
def login():
    """Handles host login and session management."""
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]

        host = hosts_collection.find_one({"username": username})
        
        if host and check_password_hash(host["password"], password):  #  Correct password check
            session["host"] = username  # Store in session
            return redirect(url_for("dashboard"))  # Redirect to dashboard

        return render_template("login.html", error="Invalid username or password")

    return render_template("login.html")


# Host Dashboard (Restricted Access)
@app.route("/dashboard", methods=["GET"])
def dashboard():
    """Host dashboard - Only accessible to logged-in hosts."""
    if "host" not in session:
        return redirect(url_for("login"))

    visitors = list(visitor_collection.find({}, {"_id": 0}))  # Fetch all visitors
    return render_template("dashboard.html", visitors=visitors)

def send_email(visitor_email, visitor_name, status):
    try:
        subject = f"Your Visit Request has been {status}"
        body = f"Hello {visitor_name},\n\nYour visit request has been {status}.\n\nThank you."
        
        msg = Message(subject=subject, recipients=[visitor_email], body=body)
        mail.send(msg)
        return jsonify({"status": "success", "message": "Email sent successfully!"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})  # Returns error in API response

def send_checkin_email(visitor_email, visitor_name, checkin_code):
    """Sends an email with the check-in code to the visitor."""
    try:
        subject = "Your Check-In Code"
        body = f"Hello {visitor_name},\n\nThank you for checking in.\nYour check-in code is: {checkin_code}\n\nBest regards,\nVisitor Management System"

        msg = Message(subject=subject, recipients=[visitor_email], body=body)
        mail.send(msg)
        print(f"Check-in email sent to {visitor_email}")
        return True
    except Exception as e:
        print(f"Error sending check-in email: {e}")
        return False
    
def send_email(to_email, subject, body):
    """Send an email using Flask-Mail"""
    msg = Message(subject, recipients=[to_email])
    msg.body = body
    mail.send(msg)

#approve visitor
@app.route('/approve_visitor', methods=['POST'])
def approve_visitor():
    data = request.json
    visitor_id = data.get("id")
    status = data.get("status")

    if not visitor_id or not status:
        return jsonify({"message": "Invalid request"}), 400

    try:
        visitor_object_id = ObjectId(visitor_id)
        query = {"_id": visitor_object_id}
    except:
        query = {"id": visitor_id}

    visitor = visitor_collection.find_one(query)

    if visitor:
        visitor["status"] = status
        visitor_email = visitor.get("email")  # Assuming the visitor has an email field

        if visitor_email:
            subject = "Visitor Request Update"
            message = f"Hello {visitor['username']}, your visit request has been {status}."
            send_email(visitor_email, subject, message)

        # Move the visitor to the appropriate collection
        if status == "Approved":
            approved_collection.insert_one(visitor)
        elif status == "Declined":
            declined_collection.insert_one(visitor)

        visitor_collection.delete_one(query)

        return jsonify({"message": f"Visitor {status} successfully!", "success": True}), 200
    else:
        return jsonify({"message": "Visitor not found!", "success": False}), 404


# Fetch All Visitors (Host Only)
@app.route("/visitors", methods=["GET"])
def get_visitors():
    if "host" not in session:
        return jsonify({"status": "error", "message": "Unauthorized"}), 403

    visitors = list(visitor_collection.find({}, {"_id": 0}))
    return jsonify(visitors)

#  Host Logout
@app.route("/logout")
def logout():
    """Logs out the host and redirects to login page."""
    session.pop("host", None)
    return redirect(url_for("login"))

#check out
@app.route('/checkout', methods=['GET', 'POST'])
def checkout():
    visitor_details = None

    if request.method == 'POST':
        if 'fetch' in request.form:
            visitor_name = request.form.get('visitor_name')

            # Case-insensitive search using regex
            visitor_details = visitor_collection.find_one(
                {"username": {"$regex": f"^{visitor_name}$", "$options": "i"}}
            )

            if not visitor_details:
                flash("Visitor not found!", "danger")

        elif 'confirm_checkout' in request.form:
            visitor_id = request.form.get('visitor_id')

            try:
                visitor = visitor_collection.find_one({"_id": ObjectId(visitor_id)})

                if visitor:
                    visitor["checkout_time"] = datetime.now()
                    checkout_collection.insert_one(visitor)  # Move data to checkout collection
                    visitor_collection.delete_one({"_id": ObjectId(visitor_id)})  # Remove from active visitors
                    flash("Visitor checked out successfully!", "success")
                    return redirect(url_for('checkout'))
                else:
                    flash("Error checking out visitor!", "danger")
            except Exception as e:
                flash(f"Error: {str(e)}", "danger")

    return render_template('checkout.html', visitor=visitor_details)


#  Run Flask App
if __name__ == "__main__":
    app.run(debug=True)
