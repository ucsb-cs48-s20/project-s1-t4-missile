import React, { useState, useEffect, useRef, createRef } from "react";
import io from "socket.io-client";

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
    const inputArea = createRef();
    const chatArea = useRef();
    const ENDPOINT = window.location.protocol + '//' + window.location.hostname + ':' + window.location.port

    useEffect(() => {
        socket = io(ENDPOINT, { query: "purpose=chat" }); // set connection

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

        function unfocusChat(event) {
            console.log("UNFOCUS FUNCTION")
            console.log(chatArea.current)
            console.log(chatArea.current.contains(event.target))
            if (chatArea.current && !chatArea.current.contains(event.target)) {
                // inputArea.current.blur()
                console.log("TODO")
            }
        }

        document.addEventListener("mousedown", unfocusChat)

        return () => {
            document.removeEventListener("mousedown", unfocusChat)
        }
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
            <div className="container" ref={chatArea}>
                <Messages messages={messages} name={name} />
                <Input ref={inputArea} focus={focus} message={message} setMessage={setMessage} sendMessage={sendMessage} />
            </div>
        </div>
    );
};

export default Chat;