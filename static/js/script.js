document.addEventListener("DOMContentLoaded", () => {

    // socket setting
    socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port, {transports: ['websocket']});

    //store current room id which it's messages on screen
    if (!localStorage.getItem("activeRoom")) {
        localStorage.setItem("activeRoom", 0);
        getMessages(0);
        document.querySelector("#chatlist").children[0].classList.add("active"); 
    }
    else
    {
        getMessages(localStorage.getItem("activeRoom"));
        try
        {
            document.querySelector("#chatlist").children[localStorage.getItem("activeRoom")].classList.add("active"); 
        }
        catch
        {
            localStorage.setItem("activeRoom", 0);
            getMessages(0);
            document.querySelector("#chatlist").children[0].classList.add("active");
        }
    }

    //check if username set
    if (!localStorage.getItem("username")) {
        document.querySelector("#namewclose").style.display = "none"; //Hide close icon to prevent user get in without username
        toggleNameEditWindow();
    }
    else
    {        
        document.querySelector("#namelink").innerHTML = localStorage.getItem("username") 
    }

    socket.on("receive_message", message => {
        if (localStorage.getItem("activeRoom") == message.room)
        {
            addMessageToChatScreen(message);
            scrollToBottom();
        }
    })

    socket.on("new_room", room => {
        var content = "<div class=\"chatbanner\"><p class=\"roomname\" data-room-id=" + room.room_id + ">" +  room.room_name + "</p></div>";
        document.querySelector("#chatlist").innerHTML += content;
        document.querySelectorAll(".chatbanner").forEach(button => {
            button.addEventListener("click", () => { 
                if (document.getElementsByClassName("active").length != 0)
                    document.getElementsByClassName("active")[0].classList.remove("active");
                button.classList.add("active");
                var roomId = button.children[0].dataset.roomId;
                localStorage.setItem("activeRoom", roomId);
                document.querySelector("#messages").innerHTML = "";
                getMessages(roomId); 
            });
        })
    })

    document.querySelectorAll("#namelink, #namewclose").forEach(button => {
        button.addEventListener("click", toggleNameEditWindow);
    });

    document.querySelectorAll("#addroombtn, #roomwclose").forEach(button => {
        button.addEventListener("click", toggleAddRoomWindow);
    });

    document.querySelector("#textmessage").addEventListener("keydown", function(event) {
        if (event.keyCode === 13) {
            event.preventDefault();
            sendMessage();
        }
      });

    document.querySelector("#submitnamebtn").addEventListener("click", () => {
        var newName = document.querySelector("#newusername").value;
        if (!validName(newName)) {
            document.querySelector("#warning").style.display = "block";
        }
        else
        {
            submitUserName(newName);
            document.querySelector("#namewclose").style.display = "block";
            document.querySelector("#warning").style.display = "none";
            toggleNameEditWindow();
        }
    })

    document.querySelector("#submitroombtn").addEventListener("click", () => {
        var newRoomName = document.querySelector("#newroomname").value;
        socket.emit("add_room", {"room_name": newRoomName});
    })

    document.querySelector("#sendmessagebutton").addEventListener("click", sendMessage);

    document.querySelectorAll(".chatbanner").forEach(button => {
        button.addEventListener("click", () => {
            if (document.getElementsByClassName("active").length != 0)
                document.getElementsByClassName("active")[0].classList.remove("active");
            button.classList.add("active");
            var room_id = button.children[0].dataset.roomId;
            localStorage.setItem("activeRoom", room_id);
            document.querySelector("#messages").innerHTML = "";
            getMessages(room_id); 
        });
    })
});

onload = () => {
    scrollToBottom();
}

function getMessages(room_id) {
    //get all messages of a room from server
    const request = new XMLHttpRequest();
    request.open("POST", "/get_messages" + "?room_id=" + room_id);

    request.onload = () => {
        const data = JSON.parse(request.responseText);
        for (i = 0; i < data.length; i++) {
            const message = data[i];
            addMessageToChatScreen(message);
            scrollToBottom();
        }
    }
    request.send();
    return false;
}

function sendMessage() {
    if(localStorage.getItem("username")) {
        text = document.querySelector("#textmessage").value;
        if (text.length != 0)
        {
            document.querySelector("#textmessage").value = "";
            user = document.querySelector("#namelink").innerHTML;
            room = localStorage.getItem("activeRoom");;
            socket.emit("submit_message", {"text": text, "user": user, "room": room});
        }
    }
}

function toggleNameEditWindow() {
    var displayStatus = getComputedStyle(document.querySelector("#namewindow")).display;
    if (displayStatus == "none")
        document.querySelector("#namewindow").style.display = "grid";
    else
        document.querySelector("#namewindow").style.display = "none";
}

function toggleAddRoomWindow() {
    var displayStatus = getComputedStyle(document.querySelector("#addroomwindow")).display;
    if (displayStatus == "none")
        document.querySelector("#addroomwindow").style.display = "grid";
    else
        document.querySelector("#addroomwindow").style.display = "none";
}

function validName(name) {
    var usernameRegex = /^[a-zA-Z0-9,ç,Ç,ğ,Ğ,ı,İ,ö,Ö,ş,Ş,ü,Ü]+$/;
    return (!(name.length > 16) && usernameRegex.test(name));
}

function submitUserName(newName) {
    document.querySelector("#namelink").innerHTML = newName;
    localStorage.setItem("username", newName)
    document.querySelector("#messages").innerHTML = "";
    getMessages(localStorage.getItem("activeRoom"));
}

function scrollToBottom() {
    var chatScreen = document.getElementById("messages");
    chatScreen.scrollTop = chatScreen.scrollHeight;
}

function detectMessageType(message) { 
    //detect the messageType(sentmsg or receivedmsg) to add it as class on message div.
    if (message.user == localStorage.getItem("username"))
    {
        return "sentmsg";
    }
    return "receivedmsg";
}

function adjustTailPoints(messageType) {
    if (messageType == "sentmsg")
    {
        return "<polygon points=\"20,20 0,0 0,20\"/\>";
    }
    return "<polygon points=\"0,20 20,20 20,0\"/\>";
}

function addMessageToChatScreen(message) {
    //add message to DOM
    var messageType = detectMessageType(message) //sent or received?
    var tailPoints = adjustTailPoints(messageType); //left pointing if received, right pointing if sent
    var content = "<div class=\"" + messageType + " message\"\>" +
                "<div class=\"tail\"\>" +
                    "<svg height=\"20\" width=\"20\"\>" +
                        tailPoints +
                    "</svg\>" +
                "</div\>" +
                    "<div class=\"content\"\>" +
                        "<div class=\"msgsender\">" + message.user + "</div\>" +
                        "<div class=\"msgtext\">" + message.text + "</div\>" +
                        "<div class=\"msgtime\">" + calculateClientTimeOfMessage(message.time) + "</div\>" + 
                    "</div\>" +
                "</div>";
    document.querySelector("#messages").innerHTML += content;
}

function calculateClientTimeOfMessage(time) {
    //input: String(HH:MM)
    //return: String(HH:MM)
    var offsetAsMinute = new Date().getTimezoneOffset();
    var serverHour = parseInt(time[0] + time[1]);
    var serverMinute = parseInt(time[3] + time[4]);
    var serverTimeAsMinute = serverHour * 60 + serverMinute;
    var clientTimeAsMinute = (serverTimeAsMinute - offsetAsMinute) % 1440;
    if (clientTimeAsMinute < 0)
        clientTimeAsMinute = 1440 + clientTimeAsMinute;
    var clientTimeMinute = clientTimeAsMinute % 60;
    var clientTimeHour = Math.floor(clientTimeAsMinute / 60);
    return clientTimeHour.toString().padStart(2, '0') + ":" + clientTimeMinute.toString().padStart(2, '0');
}