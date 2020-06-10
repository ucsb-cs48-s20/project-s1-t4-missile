/* Use React */
import React from 'react';
import ScrollToBottom from 'react-scroll-to-bottom';

/* React component to display */
import Message from './Message';

/* Style sheet */
import "./Messages.scss";

/* ----- Displays a list of message components in the chat box ----- */
const Messages = (props) => {
    return (
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