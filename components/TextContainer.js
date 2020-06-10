/* Use React */
import React from 'react';

/* Chat functionality */
import onlineIcon from '../public/assets/site/onlineIcon.png';
import ScrollToBottom from 'react-scroll-to-bottom';

/* Style sheet */
import "./TextContainer.scss";

/* ----- Displays the list of players in the lobby ----- */
const TextContainer = (props) => {
    return(
        <ScrollToBottom className="textContainer">
            <h1 className="title">Players in Lobby:</h1>
            <div className="activeContainer">
                {props.users ? 
                    (
                        <div>
                            {props.users.map(user => {
                                return (
                                    <div key={user.name} className="activeItem">
                                        <img src={onlineIcon} />
                                        {user.name}
                                    </div>
                                );
                            })}
                        </div>
                    ) : null
                } 
            </div>
        </ScrollToBottom>
    );
};

export default TextContainer;