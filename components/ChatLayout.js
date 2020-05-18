import React, { useState, useEffect } from "react";
import io from "socket.io-client";

// Styling
import "./ChatLayout.scss";

// Components
import Input from "./Input.js";
import Messages from "./Messages.js";

let socket;

const Chat = () => {
<<<<<<< HEAD
    const [name, setName] = useState("");
=======
>>>>>>> js/hz - chat shows up if you're lucky
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const ENDPOINT = "localhost:3000";

    useEffect(() => {
        socket = io(ENDPOINT); // set connection

<<<<<<< HEAD
        socket.emit("join", { name: "Player" }, (str) => {
=======
        socket.emit("join", { name: 'Player' }, (str) => {
>>>>>>> js/hz - chat shows up if you're lucky
            // if str isn't null, error has occured
            if (str) {
                alert(str);
            }
        });

        // necessary, or name will be null upon rejoin
        // name will be null upon rejoin because
        // socket connected to 
        return () => {
            socket.disconnect();
        };
    }, [ENDPOINT]);

    useEffect(() => {
        // receive message event from server
        socket.on("message", (message) => {
            console.log("received message.");
            setMessages((msgs) => {
                return ([...msgs, message]);
            });
        });
<<<<<<< HEAD

        socket.on("defaultName", ({ name }) => {
            setName(name);
        });
=======
>>>>>>> js/hz - chat shows up if you're lucky
    }, []);

    const sendMessage = (event) => {
        event.preventDefault();

        // if message isn't empty
        if (message) {
            socket.emit("sendMessage", message, () => setMessage(""));
        }
    };

    return (
        <div className="outerContainer">
            <div className="container">
<<<<<<< HEAD
                <Messages messages={messages} name={name} />
=======
                <Messages messages={messages} name='Player' />
>>>>>>> js/hz - chat shows up if you're lucky
                <Input message={message} setMessage={setMessage} sendMessage={sendMessage} />
            </div>
        </div>
    );
};

export default Chat;
