import Favicon from "react-favicon";
import dynamic from "next/dynamic";
import styles from "../components/styles";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from 'next/head'

// Hook
let cachedScripts = [];

function useScript(src) {
    // Keeping track of script loaded and error state
    const [stateScript, setStateScript] = useState({
        loaded: false,
        error: false
    });

    useEffect(
        () => {
            // If cachedScripts array already includes src that means another instance ...
            // ... of this hook already loaded this script, so no need to load again.
            if (cachedScripts.includes(src)) {
                setStateScript({
                    loaded: true,
                    error: false
                });
            } else {
                cachedScripts.push(src);

                // Create script
                let script = document.createElement("script");
                script.src = src;
                script.async = true;

                if (src === "/static/game.js") {
                    script.type = "module";
                }

                // Script event listener callbacks for load and error
                const onScriptLoad = () => {
                    setStateScript({
                        loaded: true,
                        error: false
                    });
                };

                const onScriptError = () => {
                    // Remove from cachedScripts we can try loading again
                    const index = cachedScripts.indexOf(src);
                    if (index >= 0) cachedScripts.splice(index, 1);
                    script.remove();

                    setStateScript({
                        loaded: true,
                        error: true
                    });
                };

                script.addEventListener("load", onScriptLoad);
                script.addEventListener("error", onScriptError);

                // Add script to document body
                document.body.appendChild(script);
                // Remove event listeners on cleanup

                return () => {
                    script.removeEventListener("load", onScriptLoad);
                    script.removeEventListener("error", onScriptError);
                };
            }
        },

        [src] // Only re-run effect if script src changes
    );
    return [stateScript.loaded, stateScript.error];
}

const DynamicGameWindow = dynamic(() => import("../components/GameWindow"), {
    ssr: false
});

const Test = () => {
    const [pageTitle, setPageTitle] = useState("Missile Defense Game");
    const [oldBodyStyle, setOldStyle] = useState("");

    const Router = useRouter();
    const [socketSrc, serror] = useScript(
        "/socket.io/socket.io.js"
    );
    /*
    const [phaserSrc, perror] = useScript(
       "//cdn.jsdelivr.net/npm/phaser@3.22.0/dist/phaser.js"
    );*/
    const [gameSrc, gerror] = useScript(
        "/static/game.js"
    );
    const [windowSrc, werror] = useScript(
        "/static/parentGameWindow.js"
    );

    /*
    // load scripts
    useEffect(() => {
        const socketSrc = document.createElement("script");
        const phaserSrc = document.createElement("script");
        const gameSrc = document.createElement("script");
        const windowSrc = document.createElement("script");

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

        /*
        document.body.appendChild(socketSrc);
        document.body.appendChild(phaserSrc);
        document.body.appendChild(windowSrc);
        document.body.appendChild(gameSrc);

        return () => {
            document.body.removeChild(gameSrc);
            document.body.removeChild(windowSrc);
            document.body.removeChild(socketSrc);
            document.body.removeChild(phaserSrc);
        };
    }, [Router]); */

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
        };
    }, [oldBodyStyle]);

    return (
        <div style={styles.container}>
            <Head>
                <script src="//cdn.jsdelivr.net/npm/phaser@3.22.0/dist/phaser.js"></script>
            </Head>
            <Favicon url="/static/images/favicon.ico"></Favicon>
            <h1>{`${pageTitle}`}</h1>
            
            <DynamicGameWindow />
        </div>
    );
};
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
