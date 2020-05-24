import React, { useState } from "react";
import Link from "next/link";
import Head from "next/head";

import "./IndexLayout.scss";

const Layout = (props) => {
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
                <h1 className="heading">Join</h1>
                <div>
                    <input
                        placeholder="Name"
                        className="joinInput"
                        type="text"
                        onChange={(event) => setName(event.target.value)}
                    />
                </div>
                <Link href={`/gamepage?name=${name}`}>
                    <button className="button mt-20" type="submit"
                     onClick={(event) => (!name) ? event.preventDefault() : null}>Sign In</button>
                </Link>
            </div>
        </div>
    );
}

export default Layout;