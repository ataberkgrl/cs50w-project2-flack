import os

from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit
from datetime import datetime
import json

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)
socketio.init_app(app, cors_allowed_origins="*")

rooms = []
id_counter = 0

class chatRoom:
    def __init__(self, room_name):
        global id_counter
        self.id = id_counter
        id_counter += 1
        self.name = room_name
        self.messages = []

class chatMessage:
    def __init__(self, text, user, time):
        self.text = text
        self.user = user
        self.time = time

rooms.append(chatRoom("General"))

@app.route("/", methods=["GET"])
def index():
    if request.method == "GET":
        return render_template("index.html", rooms=rooms)

@app.route("/get_messages", methods=["POST"])
def get_messages():
    room_id = request.args.get("room_id")
    for room in rooms:
        if room.id == int(room_id):
            if len(room.messages) != 0:
                for message in room.messages:
                    return json.dumps([message.__dict__ for message in room.messages])
            return "fail"

@socketio.on("submit_message")
def submit_message(data):
    text = data["text"]
    user = data["user"]
    room_id = data["room"]
    time = datetime.now().strftime("%H:%M")
    msgObject = chatMessage(text, user, time)
    for room in rooms:
        if int(room.id) == int(room_id):
            room.messages.append(msgObject)
            if len(room.messages) >= 100:
                room.messages.pop(0)
    emit("receive_message", {"text": text, "user": user, "time": time, "room": room_id}, broadcast=True)

@socketio.on("add_room")
def submit_message(data):
    room_name = data["room_name"]
    roomObject = chatRoom(room_name)
    rooms.append(roomObject)
    emit("new_room", {"room_name": roomObject.name, "room_id": str(roomObject.id)}, broadcast=True)