/* React Hooks */
import React, { useState, useEffect, useRef } from "react";

/* React components */
import Input from "./Input.js";
import Messages from "./Messages.js";
import TextContainer from "./TextContainer.js";

/* Server connection functions */
import io from "socket.io-client";
import { useRouter } from "next/router";

/* Style sheet */
import "./ChatLayout.scss";

/* Chat socket */
let socket;

/* ----- Displays the entire chat room area ----- */
const Chat = () => {
    /* Sets up React Hooks */
    const [name, setName] = useState("");
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState("");
    const [focus, setFocus] = useState("");
    const chatArea = useRef();

    /* Used to establish a connection */
    const ENDPOINT = window.location.protocol + '//' + window.location.hostname + ':' + window.location.port;
    const Router = useRouter();

    useEffect(() => {
        /* Sets up the chat room connection */
        socket = io(ENDPOINT, { query: "purpose=chat" });

        /* Gets the player's name from the router object */
        const { name } = Router.query;
        setName(name);

        /* Checks for errors */
        socket.emit("join", { name: name }, (str) => {
            if (str) {
                alert(str);
            }
        });

        /* Cleans up the socket so the player's name won't be null when they rejoin */
        return () => {
            socket.disconnect();
        };
    }, [Router, ENDPOINT]);

    /* ----- Sets up socket event listeners ----- */
    useEffect(() => {
        /* Handles messages received from the server */
        socket.on("message", (message) => {
            setMessages((msgs) => {
                return ([...msgs, message]);
            });
        });

        /* Sets the player's default name */
        socket.on("defaultName", ({ name }) => {
            setName(name);
        });

        /* Handles information about the other players in the room */
        socket.on("roomData", (obj) => {
            setUsers(obj.users);
        })

        /* Checks whether the game or chat should have focus for receiving user inputs */
        function updateFocus(event) {
            if (chatArea.current) {
                setFocus(chatArea.current.contains(event.target));
            }
        }

        /* Listens for mouse clicks, which indicate a possible change in focus */
        document.addEventListener("mousedown", updateFocus);

        /* Cleans up the click listener */
        return () => {
            document.removeEventListener("mousedown", updateFocus);
        }
    }, [Router]);

    /* Handles sending messages */
    const sendMessage = (event) => {
        event.preventDefault();

        /* Makes sure the message isn't empty */
        if (message) {
            socket.emit("sendMessage", message, () => setMessage(""));
        }
    };

    return (
        <div className="outerContainer">
            <div className="container" ref={chatArea}>
                <TextContainer users={users} />
                <Messages messages={messages} name={name} />
                <Input focus={focus} message={message} setMessage={setMessage} sendMessage={sendMessage} />
            </div>
        </div>
    );
};

export default Chat;