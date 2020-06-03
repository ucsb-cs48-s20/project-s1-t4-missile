import React from 'react';

import onlineIcon from '../public/assets/onlineIcon.png';
import ScrollToBottom from 'react-scroll-to-bottom';
import "./TextContainer.scss";

const TextContainer = (props) => {
    return(
        /*
        <div className="textContainer">
            <h1>Players in Lobby:</h1>
            {props.users ?
                (
                    <div>
                        <ScrollToBottom className="activeContainer">
                            {props.users.map(user => {
                                return (
                                    <div key={user.name} className="activeItem">
                                        {user.name}
                                        <img src={onlineIcon} />
                                    </div>
                                );
                            })}
                            <p>Nostrud nisi duis veniam ex esse laboris consectetur officia et. Velit cillum est veniam culpa magna sit exercitation excepteur consectetur ea proident. Minim pariatur nisi dolore Lorem ipsum adipisicing do. Ea cupidatat Lorem sunt fugiat. Irure est sunt nostrud commodo sint.</p>
                            <p>Duis consectetur ad in fugiat et aliquip esse adipisicing occaecat et sunt ea occaecat ad. Tempor anim consequat commodo veniam nostrud sunt deserunt adipisicing Lorem Lorem magna irure. Eu ut ipsum magna nulla sunt duis Lorem officia pariatur. Nostrud nisi anim nostrud ea est do nostrud cupidatat occaecat dolor labore do anim. Laborum quis veniam ipsum ullamco voluptate sit ea qui adipisicing aliqua sunt dolor nulla. Nulla consequat sunt qui amet. Pariatur esse pariatur veniam non fugiat laboris eu nulla incididunt.</p>
                            <p>Laboris duis do consectetur aliquip non aliquip ad ad quis minim. Aute magna tempor occaecat magna fugiat culpa. Commodo id eiusmod ea pariatur consequat fugiat minim est anim. Ipsum amet ipsum eu nisi. Exercitation minim amet incididunt tempor do ut id in officia eu sit est. Dolor qui laboris laboris tempor sunt velit eiusmod non ipsum exercitation ut sint ipsum officia.</p>
                        </ScrollToBottom>
                    </div>
                ) : null //className="activeContainer"
            }
        </div>
        */
        
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