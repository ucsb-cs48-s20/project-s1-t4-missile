/* Use React */
import React from 'react';

/* Allow emoji messages */
import ReactEmoji from "react-emoji";

/* Style sheet */
import "./Message.scss";

/* ----- Displays a single message ----- */
const Message = (props) => {
    /* Checks if the message was sent by the player */
    let isSentByCurrentUser = false;
    const trimmedName = props.name.trim();
    if (props.message.user === trimmedName) {
        isSentByCurrentUser = true;
    }

    return(
        isSentByCurrentUser ? (
            <div className="messageContainer justifyEnd">
                <p className="sentText pr-10">{trimmedName}</p>
                <div className="messageBox backgroundBlue">
                    <p className="messageText colorWhite">{ReactEmoji.emojify(props.message.text)}</p>
                </div>
            </div>
        )
        : (
            <div className="messageContainer justifyStart">
                <div className="messageBox backgroundLight">
                    <p className="messageText colorDark">{ReactEmoji.emojify(props.message.text)}</p>
                </div>
                <p className="sentText pl-10">{props.message.user}</p>
            </div>
        )
    );
};

export default Message;