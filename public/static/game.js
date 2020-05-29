import LobbyScene from '/static/lobbyScene.js'
import GameScene from '/static/gameScene.js'
import EndScene from '/static/endScene.js'

let lobbyScene = new LobbyScene();
let gameScene = new GameScene();
let endScene = new EndScene();

let config = {
    type: Phaser.AUTO,
    //parent: 'gameWindow',  doesnt work with dynamic game window. see parentGameWindow.js
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

game.scene.add('lobbyScene', lobbyScene);
game.scene.add('gameScene', gameScene);
game.scene.add('endScene', endScene);
game.scene.start('lobbyScene');

