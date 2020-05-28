import React from 'react';
import Chat from './ChatLayout.js';
import './GameWindow.scss';

function Make() {
    return (
        <div className="main gameWindow">
            <div id="gameWindow" className="game"/>
            <Chat className="chat"/>
        </div>
    )
}

export default Make;