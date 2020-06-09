/* Game scenes */
import LobbyScene from '/static/lobbyScene.js'
import GameScene from '/static/gameScene.js'
import EndScene from '/static/endScene.js'

/* Game config */
const config = {
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

/* Create instance of game with the config above */
const game = new Phaser.Game(config);

/* Create game socket for the client, passing in the name */
const ENDPOINT = `${window.location.protocol}//${window.location.hostname}:${window.location.port}`;
const name = window.location.href.substring(window.location.href.indexOf('=') + 1);
const socket = io(ENDPOINT, { query: `purpose=game&name=${name}` })

/* Adds the game scene to the Phaser scene manager */
game.scene.add('lobbyScene', new LobbyScene());
game.scene.add('gameScene', new GameScene());
game.scene.add('endScene', new EndScene());

/* Starts the client at the lobbyScene */
game.scene.start('lobbyScene', socket); 








