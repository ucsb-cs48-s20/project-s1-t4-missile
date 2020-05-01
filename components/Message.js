import React from 'react';

import "./Message.scss";

import ReactEmoji from "react-emoji";

// event object contains info about details of the event
const Message = (props) => {
    let isSentByCurrentUser = false;
    const trimmedName = props.name.trim().toLowerCase();

    if (props.message.user === trimmedName) {
        isSentByCurrentUser = true;
    }

    // todo: differentiate chat elements between sent text and received text
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