export const assignButtonBehavior = (button, onClickFunction) => {
    button
        .setInteractive()
        .on("pointerover", () => {
            button.setTint(0xfcfcfc);
        })
        .on("pointerout", () => {
            button.setTint(0xcfcfcf);
        })
        .on("pointerdown", onClickFunction);
}