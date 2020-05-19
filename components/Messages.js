import React from 'react';
import ScrollToBottom from 'react-scroll-to-bottom';
import Message from './Message';
import "./Messages.scss";

// messages is the box containing message components
// draws message components from the messages array in ChatLayout.js
const Messages = (props) => {
    return(
        <ScrollToBottom className="messages">
            {props.messages.map((message, i) => {
                    return (
                        <div key={i}><Message message={message} name={props.name} /></div>
                    );
                })        
            }
        </ScrollToBottom>
    );
};

export default Messages;