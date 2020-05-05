class EndScene extends Phaser.Scene {
    constructor() {
        super({key: "endScene"});
    }

    init(data) {
        this.round = data.round;
        this.score = data.score;
    }

    preload() {
        this.load.image('background', '/assets/background.png');
        this.load.image('stars', '/assets/background-stars.png');
    }

    create() {
        this.add.image(640, 360, 'background').setScale(5);
        this.add.image(640, 360, 'stars').setScale(4);
        this.add.text(460, 310, 'Game Over', {fontSize: '64px'});
        this.add.text(460, 410, `Round: ${this.round}`, {fontSize: '32px' });
        this.add.text(460, 460, `Score: ${this.score}`, {fontSize: '32px' })
    }
}

export default EndScene;