import React, { useState, useEffect } from "react";

// Styling
import "./ChatLayout.scss";

// Components
import Input from "./Input.js";
import Messages from "./Messages.js";

let socket;

const Chat = () => {
    const [name, setName] = useState("");
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    // const dev = process.env.NODE_ENV
    // console.log('Environment: ' + dev)
    const PORT = window.location.port || 3000
    console.log('location.port: ' + window.location.port)
    const ENDPOINT = window.location.protocol + '//' + window.location.hostname + ':' + PORT
    // const ENDPOINT = dev == 'production' ? window.location.origin : "localhost:3000";
    console.log('Endpoint: ' + ENDPOINT)
    // const ENDPOINT = "localhost:3000";

    useEffect(() => {
        socket = io(ENDPOINT, {query: "purpose=chat"}); // set connection
        
        socket.emit("join", { name: "Player" }, (str) => {
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

        socket.on("defaultName", ({ name }) => {
            setName(name);
        });
    }, []);

    const sendMessage = (event) => {
        event.preventDefault();

        // if message isn't empty
        if (message) {
            socket.emit("sendMessage", message, () => setMessage(""));
        }
    };

    return (
        <div className="outerContainer" className="chat">
            <div className="container">
                <Messages messages={messages} name={name} />
                <Input message={message} setMessage={setMessage} sendMessage={sendMessage} />
            </div>
        </div>
    );
};

export default Chat;