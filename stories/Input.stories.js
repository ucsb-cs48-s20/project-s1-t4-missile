import React from "react";
import { select, text } from "@storybook/addon-knobs";
import Input from "../components/Input";

export default {
    title: "Input",
    component: Input,
};

export const inputEmpty = () => {
    return <Input />;
};

export const inputNotEmpty = () => {
    const message = text("Message", "This is a test message that has not been sent.");
    return <Input message={message} />;
}