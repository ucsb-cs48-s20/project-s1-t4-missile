/* React Hooks */
import React, { useRef } from 'react';

/* Style sheet */
import "./Input.scss";

/* ----- Displays the input box where players can type their messages ----- */
const Input = (props) => {
    /* Sets up React Hooks */
    const input = useRef()
    const sendButton = useRef()
    
    /* Focuses and unfocuses the chat area in response to React Hooks */
    if (!props.focus) {
        if (input.current) {
            input.current.blur()
        }
        if (sendButton.current) {
            sendButton.current.blur()
        }
    }

    return (
        <form className="form">
            <input
                ref={input}
                className="input"
                type="text"
                placeholder="Type a message..."
                value={props.message}
                onChange={(event) => props.setMessage(event.target.value)}
                onKeyPress={(event) => event.key === 'Enter' ? props.sendMessage(event) : null}
            />
            <button ref={sendButton} className="sendButton" onClick={(event) => props.sendMessage(event)}>Send</button>
        </form>
    );
};

export default Input;