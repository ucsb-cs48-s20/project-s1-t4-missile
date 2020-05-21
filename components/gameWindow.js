import React from 'react';
import Chat from '../components/ChatLayout';
import styles from './styles';
import './GameWindow.scss';

function Make() {
    return (
        <div className="main" style={styles.gameWindow}>
            <div id="gameWindow" className="game" />
            <Chat className="chat" />
        </div>
    )
}

export default Make;