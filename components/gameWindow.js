import React from 'react';
import Chat from '../components/ChatLayout';
import styles from './styles';
import './GameWindow.scss';

function Make() {
    return (
        <div class="main" style={styles.gameWindow}>
            <div id="gameWindow" class="game"/>
            <Chat class="chat"/>
        </div>
    )
}

export default Make;