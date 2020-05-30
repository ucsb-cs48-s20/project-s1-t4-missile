import React from "react";
import { select, text } from "@storybook/addon-knobs";
import ChatLayout from "../components/ChatLayout";

export default {
    title: "ChatLayout",
    component: ChatLayout,
};

export const layout = () => {
    return <ChatLayout />;
};