import GameScene from '/static/gameScene.js'

let gameScene = new GameScene();

let config = {
    type: Phaser.AUTO, 
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

game.scene.add('gameScene', gameScene);

game.scene.start('gameScene');

