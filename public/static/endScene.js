/* Text formatting */
import { formatBUT, formatMED, formatLG } from '/static/textFormatting.js'

/* An ending scene that displays results and statistics about the game */
class EndScene extends Phaser.Scene {
    
    /* Defines the key identifier for the scene */
    constructor() {
        super({key: 'endScene'});
    }

    /* Passes the socket and receives statistics about the game */
    init(data) {
        this.socket = data.socket;
        this.round = data.round;
        this.score = data.score;
        this.cometsDestroyedStats = data.cometsDestroyedStats;
    }

    /* Loads the assets used in the scene */
    preload() {
        this.load.image('background', '/assets/background.png');
        this.load.image('button', '/assets/button.png');
    }

    /* Code run on creation */
    create() {

        /* Displays assets */
        this.add.image(640, 360, 'background').setScale(1);

        /* Creates texts to display statistics */
        this.add.text(460, 160, 'Game Over', formatLG);
        this.add.text(460, 260, `Round: ${this.round}`, formatMED);
        this.add.text(460, 310, `Score: ${this.score}`, formatMED);
        this.cometsDestroyedStats.forEach((player, i) => {
            this.add.text(460, 360 + (50 * i), `${player.name} destroyed ${player.cometsDestroyed} comets`, formatMED);
        });
        
        /* Creates return to lobby button */
        this.add.text(615, 625, 'Return\nto\nlobby', formatBUT).setDepth(1);
        this.lobbyButton = this.add.image(640, 650, 'button')
            .setInteractive()
            .on('pointerover', () => {
                this.lobbyButton.setTint(0xfcfcfc);
            })
            .on('pointerout', () => {
                this.lobbyButton.setTint(0xcfcfcf);
            })
            .on('pointerdown', () => {
                this.socket.emit('requestEndToLobby');
            });
        
        /* Reloads the window to start from the lobbyScene again */
        this.socket.on('reloadEnd', () => {
            location.reload();
        });
    }
}

export default EndScene;