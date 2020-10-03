/* Text formatting */
import { formatTUT, formatSMMED, formatMED } from '/static/textFormatting.js';

/* ---------- Scene that handles starting the game and role switching ---------- */
class LobbyScene extends Phaser.Scene {

    /* ----- Defines the key identifier for the scene ----- */
    constructor() {
        super({ key: "lobbyScene" });
    }

    /* ----- Receives the socket to avoid multiple socket creations ----- */
    init(socket) {
        this.socket = socket;
    }

    /* ----- Loads assets ----- */
    preload() {
        this.load.image('title', '/assets/game/background/title-screen.jpg');
        this.load.image("start", "/assets/game/ui/start.png");
    }

    /* ----- Code that runs when scene starts ----- */
    create() {

        /* Draws background */
        this.add.image(640, 360, 'title').setScale(0.65, 0.65);

        /* Prevents right clicking to open context menu */
        this.game.canvas.oncontextmenu = (e) => e.preventDefault()

        /* Defaults player role to spectator */
        this.role = 'spectator';

        /* Creates a list of users */
        this.userTexts = {};

        /* Defaults that the game is not in progress */
        this.inProgress = false;

        /* Defaults that the game is not finished */
        this.gameFinished = false;

        /* Creates start button */
        this.startButton = this.add.image(640, 600, 'start').setTint(0xcfcfcf)
            .setScale(0.5)
            .setInteractive()
            .on('pointerover', () => {
                /* If user is a spectator, tooltip shows that tells them they can't start game */
                if(!this.gameFinished && !this.inProgress && this.role == 'spectator') {
                    this.spectatorHelpText = this.add.text(this.startButton.x - 120, this.startButton.y - 110, 'Only players can start the game.\nClick on your name to switch roles.', formatTUT);
                }
                /* If user tries to start game when game is finished*/
                else if(this.gameFinished) {
                    this.gameFinishedText = this.add.text(this.startButton.x - 120, this.startButton.y - 110, 'Cannot start game until players return.', 
                        formatTUT);
                }
                this.startButton.setTint(0xfcfcfc);
            })
            .on('pointerout', () => {
                /* If spectator tooltip exists, remove it on hover out */
                this.startButton.setTint(0xcfcfcf);
                if(this.spectatorHelpText) {
                    this.spectatorHelpText.destroy();
                }
                if(this.gameFinishedText) {
                    this.gameFinishedText.destroy();
                }
            })
            .on('pointerdown', () => {
                /* If the game is in progress, allow them to join the game in progress */
                /* Otherwise start the game */
                if(!this.gameFinished) {
                    if(this.inProgress) {
                        this.socket.emit('joinInProgress');
                    } else {
                        this.socket.emit('startGame');
                    }
                }
            })

        /* Requests the server for a list of users to initialize userTexts*/
        this.socket.emit('requestUsers');

        /* Response from requestUsers */
        this.socket.on('updateUsers', users => {
            /* Destroys pre-existing user texts */
            if (Object.keys(this.userTexts).length != 0) {
                Object.keys(this.userTexts).forEach(user => {
                    this.userTexts[user].destroy();
                })
            }

            /* Displays user name and role for each user */
            Object.keys(users).forEach((user, index) => {
                this.userTexts[user] = this.add.text(100, 50 + (50 * index), 
                    `${users[user].name} - ${users[user].role}`, formatMED);

                /* Updates the role for the current user */
                if(user == this.socket.id) {
                    this.role = users[user].role;
                    this.userTexts[user]
                        .setInteractive()
                        .on('pointerover', () => {
                            /* Tooltip to switch roles */
                            this.userTexts[user].setTint(0xfcfcfc);
                            this.roleHelpText = this.add.text(this.userTexts[user].x + this.userTexts[user].width + 25, 
                                this.userTexts[user].y + 11, 'Click to switch roles', formatTUT);
                        })
                        .on('pointerout', () => {
                            /* Removes tooltip */
                            this.userTexts[user].setTint(0xcfcfcf);
                            this.roleHelpText.destroy();
                        })
                        .on('pointerdown', () => {
                            /* Attempts to switch role when user clicks their name */
                            this.socket.emit('attemptSwitchRole');
                            if(this.roleHelpText) {
                                this.roleHelpText.destroy();
                            }
                        })
                }
            })
        })

        /* Updates the lobby if the game is in progress */
        this.socket.on('inProgress', () => {
            this.progressText = this.add.text(900, 50, 'Game in progress', formatSMMED);
            this.inProgress = true;
        })

        /* Updates the lobby if the game is finished */
        this.socket.on('gameFinished', () => {
            if(this.progressText) {
                this.progressText.destroy();
            }
            this.gameFinished = true;
            this.endText = this.add.text(900, 50, 'Game has ended,\nwaiting for players\nto return...', formatSMMED);
        })

        /* Reloads the lobby if players return */
        this.socket.on('reloadLobby', () => {
            location.reload();
        })

        /* If all players leave when a game is in progress, reset the status */
        this.socket.on('clearLobby', () => {
            this.inProgress = false;
            if(this.progressText) {
                this.progressText.destroy();
            }
        })

        /* Creates/updates a countdown timer when a player presses a button to start the game */
        this.socket.on('updateCountdownTimer', (time) => {
            if(!this.timerText) {
                this.timerText = this.add.text(500, 360, `Game starting in ${time}...`, formatMED);
            } else {
                this.timerText.setText(`Game starting in ${time}...`)
            }
        })

        /* Switches the scene when countdown timer strikes 0 */
        this.socket.on('switchStart', () => {
            this.scene.start('gameScene', this.socket);
            this.socket = undefined;
        })
    }
}

export default LobbyScene;