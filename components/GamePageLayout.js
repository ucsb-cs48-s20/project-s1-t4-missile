import io from "socket.io-client";
import React, { useState, useEffect } from "react";
import Favicon from "react-favicon";

// components
import GameWindow from "./GameWindow.js";
import "./GamePageLayout.scss";

const Game = () => {
    const [pageTitle, setTitle] = useState("Missile Defense Game");

    return (
        <div className="container">
            <Favicon url="/static/images/favicon.ico"></Favicon>
            <h1>{`${pageTitle}`}</h1>
            <GameWindow />
            <script type='module' src='/static/game.js'></script>
            <script type="text/javascript" src="/socket.io/socket.io.js"></script>
            <script type="text/javascript" src="//cdn.jsdelivr.net/npm/phaser@3.22.0/dist/phaser.js"></script>
        </div>
    );
};

export default Game;

/*

*/
