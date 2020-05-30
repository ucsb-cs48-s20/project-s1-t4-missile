class LobbyScene extends Phaser.Scene {
    constructor() {
        super({key: "lobbyScene"});
    }

    preload() {
        this.load.image('background', '/assets/background.png');
        this.load.image('stars', '/assets/background-stars.png');
        this.load.image("start", "/assets/start.png");
    }

    create() {
        this.add.image(640, 360, 'background').setScale(5);
        this.add.image(640, 360, 'stars').setScale(4);
        this.startButton = this.add.image(640, 500, 'start').setTint(0xcfcfcf)
            .setScale(0.5)
            .setInteractive()
        this.startButton
            .on('pointerover', () => {
                this.startButton.setTint(0xfcfcfc);
            })
            .on('pointerout', () => {
                this.startButton.setTint(0xcfcfcf);
            })
            .on('pointerdown', () => {
                this.socket.emit('startGame');
            })
        
        
        const ENDPOINT = window.location.protocol + '//' + window.location.hostname + ':' + window.location.port;
        this.socket = io(ENDPOINT, { query: "purpose=game" });

        this.socket.on('initUsers', users => {
            this.userTexts = {};
            Object.keys(users).forEach((user, index) => {
                this.userTexts[user] = this.add.text(100, 50 + (50 * index), `${user} - ${users[user]}`, {fontSize: '24px'});
            })
        })

        this.socket.on('newUser', data => {
            this.userTexts[data[0]] = this.add.text(100, 50 + (50 * Object.keys(this.userTexts).length - 1), `${data[0]} - ${data[1]}`, {fontSize: '24px'});
        })

        this.socket.on('disconnect', userId => {
            if(this.userTexts[userId] != undefined) {
                this.userTexts[userId].destroy();
            }
            delete this.userTexts[userId];
        })

        this.socket.on('switchStart', () => {
            this.scene.start('gameScene', this.socket);
        })

        this.socket.on('gameOver', data => {
            data['socket'] = this.socket;
            this.scene.start("endScene", data);
        })
    }
}

export default LobbyScene;