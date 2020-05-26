import React from "react";
import { select, text } from "@storybook/addon-knobs";
import Message from "../components/Message";

export default {
    title: "Message",
    component: Message,
};

export const message = () => {
    const body = text("Text", "This is a message")
    const user = select("Sender", ["Player 1", "Player 2"], "Player 2")
    const message = { "text": body, "user": user }
    const name = select("User", ["Player 1", "Player 2"], "Player 1")
    return <Message message={message} name={name} />
}