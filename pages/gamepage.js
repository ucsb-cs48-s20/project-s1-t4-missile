import Favicon from "react-favicon";
import dynamic from "next/dynamic";
import styles from "../components/styles";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

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
                // script.async = true;

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

const DynamicGameWindow = dynamic(() => import("../components/gameWindow.js"), {
    ssr: false
});

const GamePageScript = () => {
    const [socketSrc, serror] = useScript("/socket.io/socket.io.js");
    const [phaserSrc, perror] = useScript("//cdn.jsdelivr.net/npm/phaser@3.22.0/dist/phaser.js");
    
    if (!socketSrc || !phaserSrc) {
        return null;
    }else {
        return(<PageLayout></PageLayout>);
    }
};

const PageLayout = () => {
    const [pageTitle, setPageTitle] = useState("Missile Defense");
    const [oldBodyStyle, setOldStyle] = useState("");

    const Router = useRouter();

    const [gameSrc, gerror] = useScript("/static/game.js");

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
            <Favicon url="/assets/site/favicon.ico"></Favicon>
            <h1>{`${pageTitle}`}</h1>
            <DynamicGameWindow />
        </div>
    );
}

export default GamePageScript;