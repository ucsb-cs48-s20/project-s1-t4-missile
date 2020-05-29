import Favicon from 'react-favicon'
import dynamic from 'next/dynamic'
import styles from '../components/styles'
import React, { useState, useEffect } from "react"
import { useRouter } from "next/router";

const DynamicGameWindow = dynamic(
    () => import("../components/GameWindow"),
    { ssr: false }
)

const Test = () => {
    const [pageTitle, setPageTitle] = useState("Missile Defense Game");
    const [oldBodyStyle, setOldStyle] = useState("");

    const Router = useRouter();

    // load scripts
    useEffect(() => {
        const socketSrc = document.createElement('script');
        const phaserSrc = document.createElement('script');
        const gameSrc = document.createElement('script');
        const windowSrc = document.createElement('script');

        socketSrc.src = "/socket.io/socket.io.js";
        socketSrc.async = true;

        phaserSrc.src = "//cdn.jsdelivr.net/npm/phaser@3.22.0/dist/phaser.js";
        phaserSrc.async = true;

        gameSrc.src = "/static/game.js";
        gameSrc.async = true;
        gameSrc.type = "module";

        windowSrc.src = "/static/parentGameWindow.js";
        windowSrc.async = true;

        /*
        <script type='module' src='/static/game.js'></script>
        <script src='/static/parentGameWindow.js'></script>
        */
      
        document.body.appendChild(socketSrc);
        document.body.appendChild(phaserSrc);
        document.body.appendChild(windowSrc);
        document.body.appendChild(gameSrc);
        
        return () => {
            document.body.removeChild(gameSrc);
            document.body.removeChild(windowSrc);
            document.body.removeChild(socketSrc);
            document.body.removeChild(phaserSrc);
        }
    }, [Router]);

    useEffect(() => {
        setOldStyle(document.body.style);
        document.title = pageTitle;

        for (var i in styles.body) {
            if (styles.body.hasOwnProperty(i)) {
                document.body.style[i] = styles.body[i];
            }
        }

        return () => {
            document.body.style = oldBodyStyle;
        }
    }, [oldBodyStyle]);

    return (
        <div style={styles.container}>
            <Favicon url="/static/images/favicon.ico"></Favicon>
            <h1>{`${pageTitle}`}</h1>

            <DynamicGameWindow />
            <script src="//cdn.jsdelivr.net/npm/phaser@3.22.0/dist/phaser.js"></script>
        </div>
    );
}
/*

        setSocket(document.createElement('script'));
        setPhaser(document.createElement('script'));
        setGame(document.createElement('script'));
        setWindow(document.createElement('script'));

        setSocket({
            ...socketSrc,
            src: "/socket.io/socket.io.js",
            async: true
        });

        setPhaser({
            ...phaserSrc,
            src: "//cdn.jsdelivr.net/npm/phaser@3.22.0/dist/phaser.js",
            async: true
        })

        setGame({
            ...gameSrc,
            src: "/static/game.js",
            async: true,
            type: "module"
        })

        setWindow({
            ...gameWindowSrc,
            src: "/static/parentGameWindow.js",
            async: true
        });*/

export default Test;
               