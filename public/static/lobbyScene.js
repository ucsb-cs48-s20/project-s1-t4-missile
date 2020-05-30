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
                this.userTexts[user] = this.add.text(100, 50 + (50 * index), `${user} - ${users[user]}`, {fontSize: '24px'});
            })
        })

        this.socket.on('newUser', data => {
            this.userTexts[data[0]] = this.add.text(100, 50 + (50 * Object.keys(this.userTexts).length - 1), `${data[0]} - ${data[1]}`, {fontSize: '24px'});
        })

        this.socket.on('disconnect', userId => {
            delete userTexts[userId];
        })
    }
}

export default LobbyScene;