import React from 'react';

import onlineIcon from '../public/assets/onlineIcon.png';
import ScrollToBottom from 'react-scroll-to-bottom';
import "./TextContainer.scss";

const TextContainer = (props) => {
    return(
        <div className="textContainer">
            {props.users ?
                (
                    <div>
                        <h1>Players in Lobby:</h1>
                        <ScrollToBottom className="activeContainer">
                            {props.users.map(user => {
                                return (
                                    <div key={user.name} className="activeItem">
                                        {user.name}
                                        <img src={onlineIcon} />
                                    </div>
                                );
                            })}
                        </ScrollToBottom>
                    </div>
                ) : null
            }
        </div>
    );
};

export default TextContainer;