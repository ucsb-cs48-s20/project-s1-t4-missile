class EndScene extends Phaser.Scene {
    constructor() {
        super({key: "endScene"});
    }

    preload() {
        this.load.image('background', '/assets/background.png');
        this.load.image('stars', '/assets/background-stars.png');
    }

    create() {
        this.add.image(640, 360, 'background').setScale(5);
        this.add.image(640, 360, 'stars').setScale(4);
        this.add.text(460, 360, 'Game Over', {fontSize: '64px'});
    }
}

export default EndScene;