class LobbyScene extends Phaser.Scene {
    constructor() {
        super({ key: "lobbyScene" });
    }

    init(socket) {
        this.socket = socket;
        console.log(this.socket);
    }

    preload() {
        this.load.image('background', '/assets/background.png');
        this.load.image('stars', '/assets/background-stars.png');
        this.load.image("start", "/assets/start.png");
    }

    create() {
        this.game.canvas.oncontextmenu = (e) => e.preventDefault()
        this.add.image(640, 360, 'background').setScale(5);
        this.add.image(640, 360, 'stars').setScale(4);

        if (this.socket == undefined) {
            const ENDPOINT = window.location.protocol + '//' + window.location.hostname + ':' + window.location.port;
            this.socket = io(ENDPOINT, { query: "purpose=game" });
        }

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
                if(this.inProgress) {
                    this.socket.emit('joinInProgress');
                } else {
                    this.socket.emit('startGame');
                }
            })

        this.socket.emit('requestUsers');
        this.userTexts = {};
        this.inProgress = false;

        this.socket.on('initUsers', users => {
            if (Object.keys(this.userTexts).length != 0) {
                Object.keys(this.userTexts).forEach(user => {
                    this.userTexts[user].destroy();
                })
            }
            console.log(users);
            Object.keys(users).forEach((user, index) => {
                this.userTexts[user] = this.add.text(100, 50 + (50 * index), `${users[user].name} - ${users[user].role}`, { fontSize: '24px' });
                if(user == this.socket.id) {
                    this.userTexts[user]
                        .setInteractive()
                        .on('pointerover', () => {
                            this.userTexts[user].setTint(0xfcfcfc);
                        })
                        .on('pointerout', () => {
                            this.userTexts[user].setTint(0xcfcfcf);
                        })
                        .on('pointerdown', () => {
                            this.socket.emit('attemptSwitchRole');
                        })
                }
            })
        })

        this.socket.on('inProgress', () => {
            this.progressText = this.add.text(900, 50, 'Game in progress', { fontSize: '24px'});
            this.inProgress = true;
        })

        this.socket.on('gameFinished', () => {
            if(this.progressText) {
                this.progressText.destroy();
            }
            this.endText = this.add.text(900, 50, 'Game has ended,\nwaiting for players\nto return...', { fontSize: '24px' });
        })

        this.socket.on('restart', () => {
            location.reload();
        })

        this.socket.on('clearLobby', () => {
            this.inProgress = false;
            if(this.progressText) {
                this.progressText.destroy();
            }
        })

        this.socket.on('updateTimer', (time) => {
            if(!this.timerText) {
                this.timerText = this.add.text(640, 360, `Game starting in ${time}...`, {font: 'Trebuchet MS', fontSize: '24px'});
            } else {
                this.timerText.setText(`Game starting in ${time}...`)
            }
        })

        this.socket.on('disconnect', userId => {
            console.log(this.userTexts)
            if (this.userTexts[userId] != undefined) {
                this.userTexts[userId].destroy();
            }
            delete this.userTexts[userId];
        })

        this.socket.on('switchStart', () => {
            console.log("lobby -> game");
            this.scene.start('gameScene', this.socket);
            this.socket = undefined;
            console.log(this.socket);
        })

        this.socket.on('lobbyToEnd', data => {
            console.log("lobby -> end");
            data['socket'] = this.socket;
            this.scene.start("endScene", data);
            this.socket = undefined;
            console.log(this.socket);
        })
    }

}

export default LobbyScene;