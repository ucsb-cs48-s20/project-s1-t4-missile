class LobbyScene extends Phaser.Scene {
    constructor() {
        super({key: "lobbyScene"});
    }

    preload() {
        this.load.image('background', '/assets/background.png');
        this.load.image('stars', '/assets/background-stars.png');
    }

    create() {
        this.add.image(640, 360, 'background').setScale(5);
        this.add.image(640, 360, 'stars').setScale(4);
        this.add.text(460, 260, 'Game Over', {fontSize: '64px'});
        this.add.text(460, 360, `Round: ${this.round}`, {fontSize: '32px' });
        this.add.text(460, 410, `Score: ${this.score}`, {fontSize: '32px' })
        this.kills.forEach((kill, i) => {
            this.add.text(460, 460 + (50 * i), `Player ${i + 1} destroyed ${kill} comets`, {fontSize: '32px'})
        })
    }
}

export default EndScene;