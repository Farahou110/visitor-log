from flask import Flask, render_template, request, jsonify
from pymongo import MongoClient
from flask_mail import Mail, Message
import os

app = Flask(__name__)  # Create a Flask app
app.secret_key = "your_secret_key"

# MongoDB Connection
client = MongoClient("mongodb://localhost:27017/")
db = client["VISITORS"]
visitors_collection = db["visitors"]  # Define visitors collection

# Flask-Mail Configuration
app.config["MAIL_SERVER"] = "smtp.gmail.com"
app.config["MAIL_PORT"] = 587
app.config["MAIL_USE_TLS"] = True
app.config["MAIL_USE_SSL"] = False
app.config["MAIL_USERNAME"] = os.getenv("MAIL_USERNAME")  # Set via environment variable
app.config["MAIL_PASSWORD"] = os.getenv("MAIL_PASSWORD")  # Use environment variable
mail = Mail(app)

# ----- ROUTES -----

@app.route("/", methods=["GET", "POST"])
def register():
    return render_template("index.html")

# 🔹 Route for Handling Check-In Form Submission
@app.route("/checkin", methods=["POST"])
def checkin():
    try:
        data = request.form.to_dict()  # Convert form data to dictionary
        visitors_collection.insert_one(data)  # Save visitor data to MongoDB
        return jsonify({"status": "success", "message": "Check-in successful"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# 🔹 Route for Handling Pre-Registration Code Validation
@app.route("/validate-prereg", methods=["POST"])
def validate_prereg():
    try:
        prereg_code = request.json.get("prereg_code")
        visitor = visitors_collection.find_one({"prereg_code": prereg_code})
        if visitor:
            return jsonify({"status": "success", "message": "Pre-registration found", "data": visitor}), 200
        return jsonify({"status": "error", "message": "Invalid pre-registration code"}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# 🔹 Route to Fetch All Visitors (For Admin Panel or Reports)
@app.route("/visitors", methods=["GET"])
def get_visitors():
    visitors = list(visitors_collection.find({}, {"_id": 0}))  # Exclude MongoDB ID field
    return jsonify(visitors)

# Run the Flask App
if __name__ == "__main__":
    app.run(debug=True)
