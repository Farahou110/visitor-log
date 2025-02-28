from flask import Flask, render_template, request, jsonify
from pymongo import MongoClient
from flask_mail import Mail, Message
import os

app = Flask(__name__)  
app.secret_key = "your_secret_key"

# ✅ MongoDB Connection
client = MongoClient("mongodb://localhost:27017/")
db = client["VISITORS"]
visitors_collection = db["visitor"]  # Collection to store check-ins

# ✅ Flask-Mail Configuration
app.config["MAIL_SERVER"] = "smtp.gmail.com"
app.config["MAIL_PORT"] = 587
app.config["MAIL_USE_TLS"] = True
app.config["MAIL_USE_SSL"] = False
app.config["MAIL_USERNAME"] = os.getenv("MAIL_USERNAME")  
app.config["MAIL_PASSWORD"] = os.getenv("MAIL_PASSWORD")  
mail = Mail(app)

# ----- ROUTES -----

@app.route("/", methods=["GET", "POST"])
def register():
    return render_template("index.html")

# ✅ 🔹 Route for Handling Check-In Form Submission (Save to MongoDB)
@app.route("/checkin", methods=["POST"])
def checkin():
    try:
        data = request.json  # Get JSON data from request

        if not data:
            return jsonify({"status": "error", "message": "Invalid data"}), 400
        
        visitors_collection.insert_one(data)  # Save visitor data to MongoDB

        return jsonify({"status": "success", "message": "Check-in successful"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# ✅ 🔹 Route to Fetch All Visitors (Admin Panel or Reports)
@app.route("/visitors", methods=["GET"])
def get_visitors():
    visitors = list(visitors_collection.find({}, {"_id": 0}))  # Exclude MongoDB ID field
    return jsonify(visitors)

# Run the Flask App
if __name__ == "__main__":
    app.run(debug=True)
