class EndScene extends Phaser.Scene {
    constructor() {
        super({key: "endScene"});
    }

    init(data) {
        this.socket = data.socket;
        this.round = data.round;
        this.score = data.score;
        this.kills = data.kills;
    }

    preload() {
        this.load.image('background', '/assets/background.png');
        this.load.image('stars', '/assets/background-stars.png');
        this.load.image("button", "/assets/button.png");
    }

    create() {
        this.add.image(640, 360, 'background').setScale(1);
        //this.add.image(640, 360, 'stars').setScale(4);
        this.add.text(460, 260, 'Game Over', {fontSize: '64px'});
        this.add.text(460, 360, `Round: ${this.round}`, {fontSize: '32px' });
        this.add.text(460, 410, `Score: ${this.score}`, {fontSize: '32px' })
        this.kills.forEach((kill, i) => {
            this.add.text(460, 360 + (50 * i), `Player ${i + 1} destroyed ${kill} comets`, {fontSize: '32px'})
        })
        this.add.text(615, 625, 'Return\nto\nlobby').setDepth(50);
        this.lobbyButton = this.add.image(640, 650, 'button')
            .setInteractive();

        this.lobbyButton
            .on('pointerover', () => {
                this.lobbyButton.setTint(0xfcfcfc);
            })
            .on('pointerout', () => {
                this.lobbyButton.setTint(0xcfcfcf);
            })
            .on('pointerdown', () => {
                console.log(this.socket)
                this.socket.emit('returnToLobby');
            })
        
        this.socket.on('switchLobby', () => {
            /*
            console.log('end -> lobby')
            this.scene.start('lobbyScene', this.socket);
            this.socket = undefined;
                console.log(this.socket);*/
            location.reload();
            
        })
    }
}

export default EndScene;