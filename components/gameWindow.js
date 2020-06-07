import React from 'react';
import './GameWindow.scss';
import Chat from './ChatLayout'

function Make() {
    return (
        <div className="main gameWindow">
            <div id="gameWindow" className="game">
            </div>
            <Chat className="chat"/>
        </div>
    )
}

export default Make;