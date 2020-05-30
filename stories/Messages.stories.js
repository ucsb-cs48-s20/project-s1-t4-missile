import React from "react";
import { select, text } from "@storybook/addon-knobs";
import Messages from "../components/Messages";

export default {
    title: "Messages",
    component: Messages,
};

export const messagesEmpty = () => {
    const messages = []
    const name = "Player 1"
    return <Messages messages={messages} name={name} />;
};

export const messagesNotEmpty = () => {
    const text_1 = text("Message 1", "This is the first message")
    const text_2 = text("Message 2", "This is the second message")
    const sender_1 = select("Sender 1", ["Player 1", "Player 2"], "Player 1")
    const sender_2 = select("Sender 2", ["Player 1", "Player 2"], "Player 2")
    const message1 = { "text": text_1, "user": sender_1 }
    const message2 = { "text": text_2, "user": sender_2 }
    const messages = [message1, message2]
    const name = select("User", ["Player 1", "Player 2"], "Player 1")
    return <Messages messages={messages} name={name} />
}