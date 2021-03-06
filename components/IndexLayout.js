/* React Hooks */
import React, { useState } from "react";

/* Client-side transitions */
import Router from 'next/router';

/* Head component */
import Head from "next/head";

/* Style sheet */
import "./IndexLayout.scss";

/* ----- Displays the index page ----- */
const Layout = () => {
    /* React Hook for the player's name */
    const [name, setName] = useState("");

    return (
        <div className="joinOuterContainer">
            <Head>
                <title>Missile Defense</title>
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1"
                />
                <meta charSet="utf-8" />
            </Head>
            <div className="joinInnerContainer">
                <h1 className="heading">Missile Defense</h1>
                <div>
                    <input
                        placeholder="Name"
                        className="joinInput"
                        type="text"
                        onChange={(event) => setName(event.target.value)}
                    />
                </div>
                <button className="button mt-20" type="submit"
                    onClick={(event) => (!name) ? event.preventDefault() : Router.push(`/gamepage?name=${name}`)}>Play</button>
            </div>
        </div>
    );
}

export default Layout;