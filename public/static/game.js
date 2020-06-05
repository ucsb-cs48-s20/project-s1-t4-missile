import LobbyScene from '/static/lobbyScene.js'
import GameScene from '/static/gameScene.js'
import EndScene from '/static/endScene.js'

let config = {
    type: Phaser.AUTO,
    parent: 'gameWindow',
    width: 1280,
    height: 720,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            gravity: { y: 0 }
        }
    },
};

let game = new Phaser.Game(config);

const ENDPOINT = window.location.protocol + '//' + window.location.hostname + ':' + window.location.port;
console.log(window.location.href);
let socket = io(ENDPOINT, { query: `purpose=game&name=${window.location.href.substring(window.location.href.indexOf('=') + 1)}` })

game.scene.add('lobbyScene', new LobbyScene());
game.scene.add('gameScene', new GameScene());
game.scene.add('endScene', new EndScene());

game.scene.start('lobbyScene', socket); // got rid of timer








