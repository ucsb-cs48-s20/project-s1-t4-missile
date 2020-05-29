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
        
        const ENDPOINT = window.location.protocol + '//' + window.location.hostname + ':' + window.location.port;
        this.socket = io(ENDPOINT, { query: "purpose=game" });

        this.socket.on('initUsers', users => {
            this.userTexts = {};
            Object.keys(users).forEach((user, index) => {
                this.userTexts[user] = this.add.text(460, 200 + (50 * index), `User ${user} is a ${users[user]}`, {fontSize: '32px'});
            })
        })

        this.socket.on('newUser', data => {
            this.userTexts[data[0]] = this.add.text(460, 200 + (50 * Object.keys(this.userTexts).length - 1), `User ${data[0]} is a ${data[1]}`, {fontSize: '32px'});
        })

        this.socket.on('disconnect', userId => {
            delete userTexts[userId];
        })
    }
}

export default LobbyScene;