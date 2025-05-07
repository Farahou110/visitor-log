# Route to check-in visitor
# @app.route("/checkin-visitor", methods=["POST"])
# def checkin_visitor():
#     try:
#         visitor_name = request.form.get("username", "").strip()
#         visitor_email = request.form.get("email", "").strip()
#         visitor_phone = request.form.get("phone", "").strip()
#         purpose = request.form.get("purpose", "").strip()
#         host = request.form.get("host", "").strip()

#         if not visitor_name or not visitor_email:
#             flash("Username and email are required.", "error")
#             return redirect(url_for("index"))  # Redirect back to form

#         if pre_registered_collection.find_one({"username": visitor_name}):
#             flash("Visitor already checked in.", "warning")
#             return redirect(url_for("index"))

#         checkin_code = generate_checkin_code()

#         visitor_collection.insert_one({
#             "username": visitor_name,
#             "email": visitor_email,
#             "phone": visitor_phone,
#             "purpose": purpose,
#             "host": host,
#             "status": "Pending",
#             "checkin_code": checkin_code,
#             "checkin_time": datetime.utcnow().isoformat()
#         })

#         subject = "Your Visitor Check-In Code"
#         body = f"Hello {visitor_name},\n\nYour check-in code is: {checkin_code}\n\nUse this code to complete your check-in process."
#         msg = Message(subject=subject, recipients=[visitor_email], body=body)
#         mail.send(msg)

#         flash("Check-in successful! Please check your email for the code.", "success")
#         return redirect(url_for("checkin_success"))

#     except Exception as e:
#         flash(f"Error: {str(e)}", "danger")
#         return redirect(url_for("index"))



   # This returns a cursor, so convert it directly to a list
# @app.route("/dashboard", methods=["GET", "POST"])
# def dashboard():
#     if "host" not in session:
#         flash("Please log in first.", "warning")
#         return redirect(url_for("login"))

#     username = session.get("host")
#     # status_filter = request.args.get("status", "pending")

#     # Handle approve/reject POST action
#     if request.method == "POST":
#         action = request.form.get("action")
#         visitor_id = request.form.get("visitor_id")

#         if not action or not visitor_id:
#             flash("Missing action or visitor ID.", "danger")
#             return redirect(url_for("dashboard", ))

#                 # status=status_filter


#         # Try to convert to ObjectId if possible
#         try:
#             query = {"_id": ObjectId(visitor_id)}
#         except:
#             query = {"id": visitor_id}

#         visitor = visitor_collection.find_one(query)

#         if visitor:
#             visitor["status"] = action.capitalize()
#             visitor_email = visitor.get("email")

#             # Send email notification
#             if visitor_email:
#                 subject = "Visitor Request Update"
#                 message = f"Hello {visitor['username']}, your visit request has been {action.capitalize()}."
#                 send_email(visitor_email, subject, message)

#         #     # Move to approved/declined collections
#         #     if action.lower() == "approve":
#         #         approved_collection.insert_one(visitor)
#         #     elif action.lower() == "reject":
#         #         declined_collection.insert_one(visitor)

#         #     visitor_collection.delete_one(query)
#         #     flash(f"Visitor {action.capitalize()} successfully!", "success")
#         # else:
#         #     flash("Visitor not found.", "danger")

#         # return redirect(url_for("dashboard", ))
#         #         # status=status_filter



#     # Filter visitors by status and host
#     visitors = list(visitor_collection.find({"host": username}))

#                         # , "status": {"$regex": f"^{status_filter}$", "$options": "i"}


#     return render_template("dashboard.html", visitors=visitors, )
#             # status_filter=status_filter



# def send_checkin_email(visitor_email, visitor_name, checkin_code):
#     """Sends an email with the check-in code to the visitor."""
#     try:
#         subject = "Your Check-In Code"
#         body = f"Hello {visitor_name},\n\nThank you for checking in.\nYour check-in code is: {checkin_code}\n\nBest regards,\nVisitor Management System"

#         msg = Message(subject=subject, recipients=[visitor_email], body=body)
#         mail.send(msg)
#         print(f"Check-in email sent to {visitor_email}")
#         return True
#     except Exception as e:
#         print(f"Error sending check-in email: {e}")
#         return False
    

# # Approve visitor
# @app.route('/approve_visitor', methods=['POST'])
# def approve_visitor():
#     data = request.json
#     visitor_id = data.get("id")
#     status = data.get("status")

#     if not visitor_id or not status:
#         return jsonify({"message": "Invalid request"}), 400

#     try:
#         visitor_object_id = ObjectId(visitor_id)
#         query = {"_id": visitor_object_id}
#     except:
#         query = {"id": visitor_id}

#     visitor = visitor_collection.find_one(query)

#     if visitor:
#         visitor["status"] = status
#         visitor_email = visitor.get("email")

#         if visitor_email:
#             subject = "Visitor Request Update"
#             message = f"Hello {visitor['username']}, your visit request has been {status}."
#             send_email(visitor_email, subject, message)

#         # Move the visitor to the appropriate collection
#         if status == "Approved":
#             approved_collection.insert_one(visitor)
#         elif status == "Declined":
#             declined_collection.insert_one(visitor)

#         visitor_collection.delete_one(query)

#         return jsonify({"message": f"Visitor {status} successfully!", "success": True}), 200
#     else:
#         return jsonify({"message": "Visitor not found!", "success": False}), 404