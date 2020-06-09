/* Angle function for calculating barrel angle */
import { angle } from '/static/gameCalculations.js';

/* Text formatting */
import { formatTUT, formatBUT, formatSMMED, formatMED } from '/static/textFormatting.js';

/* Button behavior helper */
import { assignButtonBehavior } from '/static/buttonUtils.js';

/* ---------- Scene that handles redrawing of the game and server-client interactions ---------- */
class GameScene extends Phaser.Scene {

    /* ----- Defines the key identifier for the scene ----- */
    constructor() {
        super({ key: 'gameScene' });
    }

    /* ----- Receives the socket to avoid mutliple socket creations ----- */
    init(socket) {
        this.socket = socket;
    }

    /* ----- Loads game assets ----- */
    preload() {
        
        /* Background sprites */
        this.load.image('background', '/assets/background.png');
        this.load.image('base', '/assets/base.png');
        
        /* Player/game sprites */
        this.load.image('tankbody1', '/assets/tankbody1.png');
        this.load.image('tankbody2', '/assets/tankbody2.png');
        this.load.image('tankbody3', '/assets/tankbody3.png');
        this.load.image('tankbody4', '/assets/tankbody4.png');
        this.load.image('missile', '/assets/missile.png');
        this.load.image('crosshair', '/assets/crosshairs.png');
        this.load.image('flak', '/assets/flak-icon.png');
        this.load.image('nuke', '/assets/nuke-icon.png');

        /* UI Sprites */
        this.load.image('button', '/assets/button.png');
        this.load.image('halfbutton', '/assets/half-button.png');
        this.load.image('reloadmeter', '/assets/reload-meter-tex.png');
        this.load.image('shopbg', '/assets/shop-ui-main.png');
        this.load.image('specialholder', '/assets/special-attack-holder.png');
        this.load.image('info', '/assets/info.png');

        /* Spritesheets */
        this.load.spritesheet('tankbarrel', '/assets/tankbarrel.png', {
            frameWidth: 32,
            frameHeight: 256
        });
        this.load.spritesheet('comet', '/assets/comet.png', {
            frameWidth: 64,
            frameHeight: 128
        });
        this.load.spritesheet('nuke-projectile', '/assets/nuke-projectile.png', {
            frameWidth: 256,
            frameHeight: 256
        });
        this.load.spritesheet('explosion', '/assets/explosion.png', {
            frameWidth: 128,
            frameHeight: 128
        });
        this.load.spritesheet('laser', 'assets/laser-bar.png', {
            frameWidth: 64,
            frameHeight: 64
        });
    }

    /* ----- Code that runs on scene start ----- */
    create() {
        
        /* Display background sprites */
        this.add.image(640, 360, 'background').setScale(1);
        this.add.image(640, 360, 'base').setScale(1);

        /* Creates animations */
        this.anims.create({
            key: 'explode',
            frameRate: 20,
            frames: this.anims.generateFrameNames('explosion', {
                start: 0,
                end: 15
            })
        });
        this.anims.create({
            key: 'cometRevolve',
            frameRate: 20,
            repeat: -1,
            frames: this.anims.generateFrameNames('comet', {
                start: 0,
                end: 15
            })
        });

        this.anims.create({
            key: 'fireShot',
            frameRate: 20,
            frames: this.anims.generateFrameNames('tankbarrel', {
                start: 1,
                end: 8
            })
        });
        this.anims.create({
            key: 'laserFlux',
            frameRate: 8,
            repeat: -1,
            frames: this.anims.generateFrameNames('laser', {
                start: 0,
                end: 2
            })
        });

        this.anims.create({
            key: 'nukeRevolve',
            frameRate: 20,
            repeat: -1,
            frames: this.anims.generateFrameNames('nuke-projectile', {
                start: 0,
                end: 15
            })
        });

        /* Creates object groups */
        this.missiles = this.physics.add.group();
        this.comets = this.physics.add.group();
        this.otherPlayers = this.physics.add.group();
        this.otherTankbodies = this.physics.add.group();
        this.crosshairs = this.physics.add.group();
        this.shopUI = this.add.group();

        /* Focus data */
        this.pointerInGame = true
        this.game.canvas.onmouseover = () => this.pointerInGame = true
        this.game.canvas.onmouseout = () => this.pointerInGame = false
        this.focus = true;

        /* Player is set to default spectate */
        this.spectate = false;

        /* Requests information about comets, other players, missiles on screen */
        this.socket.emit('requestInitialize');

        /* UI variables */
        this.shopUIButtonPlacerX = 80;
        this.shopUIButtonPlacerY = -85;
        this.UIOut = false;
        this.UITweening = false;

        /* Creates the UI */
        this.makeUI();

        /* Client input variables */
        this.shot = false;
        this.keypressed = false;
        this.reloading = false;

        /* Game state variables */
        this.missilesEmpty = false;
        this.maxMissilesClientCopy = -1;
        this.activeConsumable = false;
        this.specialAttackActive = false;
        this.specialAttackKey = this.input.keyboard.addKey('Q', false);

        /* Handles data returned from requestInitialize */
        this.socket.on('initHealth', (baseHealth) => {
            this.healthText = this.add.text(315, 15, `${baseHealth}`, formatMED)
                .setTint(0x303030)
                .setDepth(1);
            this.shopUI.add(this.healthText);
        });

        this.socket.on('initTimer', (timer) => {
            this.timerText = this.add.text(190, 15, `${timer}`, formatMED)
                .setTint(0x303030)
                .setDepth(1);
            this.shopUI.add(this.timerText);
        });

        this.socket.on('initCredits', (cred) => {
            this.creditText = this.add.text(700, 15, `${cred}`, formatMED)
                .setTint(0x303030)
                .setDepth(1);
            this.shopUI.add(this.creditText);
        });

        this.socket.on('initScore', (score) => {
            this.scoreText = this.add.text(440, 15, `${score}`, formatMED)
                .setTint(0x303030)
                .setDepth(1);
            this.shopUI.add(this.scoreText);
        });

        this.socket.on('initRound', (round) => {
            this.roundText = this.add.text(70, 15, `${round}`, formatMED)
                .setTint(0x303030)
                .setDepth(1);
            this.shopUI.add(this.roundText);
        });

        this.socket.on('initComets', (serverComets) => {
            Object.keys(serverComets).forEach((comet) => {
                if (comet != undefined) {
                    this.addComet(serverComets[comet]);
                }
            });
        });

        this.socket.on('initSpectate', () => {
            this.spectate = true;
            this.spectateText = this.add.text(50, 300, 'Spectating', formatMED);
            if(this.infoButton) {
                this.infoButton.destroy();
            }
        });

        this.socket.on('currentPlayers', (players) => {
            Object.keys(players).forEach((id) => {
                if (players[id].playerId === this.socket.id) {
                    this.addPlayer(players[id]);
                } else {
                    this.addOtherPlayers(players[id]);
                }
            });
        });

        /* Handles object creation */
        this.socket.on('newPlayer', (playerInfo) => {
            this.addOtherPlayers(playerInfo);
        });

        this.socket.on('newMissile', (missileInfo) => {
            this.addMissile(missileInfo);
        });

        this.socket.on('newCrosshair', (crosshairInfo) => {
            this.addCrosshair(crosshairInfo);
        });

        this.socket.on('newComet', cometInfo => {
            this.addComet(cometInfo);
        });


        /* Handles firing animations */
        this.socket.on('missileFired', (id) => {
            this.otherPlayers.getChildren().forEach((otherPlayer) => {
                if (id == otherPlayer.playerId) {
                    otherPlayer.play('fireShot');
                }
            });
        });

        this.socket.on('laserFired', (center, dir, rot) => {
            this.displayLaser(center, dir, rot);
        });

        this.socket.on('flakFired', () => {
            let pointer = this.input.activePointer;
            this.socket.emit('missileShot', {
                x: this.ship.x,
                y: this.ship.y,
                mouseX: pointer.x + 400 * Math.random() - 200,
                mouseY: pointer.y + 400 * Math.random() - 200,
                rotation: this.ship.rotation + 0.6 * Math.random() - 0.3,
                flakSpecial: true
            });
        });

        this.socket.on('nukeFired', () => {
            let pointer = this.input.activePointer;
            this.socket.emit('missileShot', {
                x: this.ship.x,
                y: this.ship.y,
                mouseX: pointer.x,
                mouseY: pointer.y,
                rotation: this.ship.rotation,
                nukeSpecial: true
            });
        });

        /* Handles game object updates */
        this.socket.on('updateBase', (info) => {
            this.comets.getChildren().forEach((comet) => {
                if (comet.id == info[0]) {
                    this.healthText.setText(`${info[1]}`);
                    const explosion = this.add.sprite(comet.x, comet.y, 'explosion', 0).setScale(1);
                    explosion.play('explode');
                    explosion.once(Phaser.Animations.Events.SPRITE_ANIMATION_COMPLETE, () => { explosion.destroy(); });
                    comet.destroy();
                }
            });
        });

        this.socket.on('updateMissiles', (serverMissiles) => {
            this.missiles.getChildren().forEach((missile) => {
                missile.setPosition(serverMissiles[missile.id].x, serverMissiles[missile.id].y);
            });
        });

        this.socket.on('updateComets', (serverComets) => {
            this.comets.getChildren().forEach((comet) => {
                if (serverComets[comet.id] != undefined) {
                    comet.setPosition(serverComets[comet.id].x, serverComets[comet.id].y);
                }
            });
        });

        this.socket.on('playerMoved', (playerInfo) => {
            this.otherPlayers.getChildren().forEach((otherPlayer) => {
                if (playerInfo.playerId === otherPlayer.playerId) {
                    otherPlayer.setRotation(playerInfo.rotation);
                }
            });
        });

        /* Handles UI updates */
        this.socket.on('updateMissileCount', (id, newAmount, maxAmount, regenTime, displayBar) => {
                if (id == this.playerId) {
                    if (this.debug) {
                        this.missileCountText.setText(`5 - Maximum missile capacity = ${newAmount}`);
                    }
                    if (newAmount == 0) {
                        this.missilesEmpty = true;
                    } else {
                        this.missilesEmpty = false;
                    }
                    console.log('entered')
                    this.displayMissileCount(this, newAmount, maxAmount);
                    if (displayBar) {
                        this.displayReloadBar(this, this.ship.x, regenTime, this.maxMissilesClientCopy);
                    }
                } else {
                    this.otherPlayers.getChildren().forEach(otherPlayer => {
                        if (id == otherPlayer.playerId) {
                            this.displayMissileCount(otherPlayer, newAmount, maxAmount);
                            if (displayBar) {
                                this.displayReloadBar(otherPlayer, otherPlayer.x, regenTime, 
                                    this.maxMissilesClientCopy);
                            }
                        }
                        this.displayMissileCount(this, newAmount, maxAmount);
                    });
                }
            }
        );

        this.socket.on('updateIncomingStatus', (info) => {
            if (info.timer == 0) {
                this.incomingStatusText.destroy();
            } else {
                if(this.incomingStatusText) {
                    this.incomingStatusText.destroy();
                }
                this.incomingStatusText = this.add.text(50, 200, `${info.status} in ${info.timer}...`, formatMED);
            } 
        });

        this.socket.on('updateTimer', (timer) => {
            this.timerText.setText(`${timer}`);
        });

        this.socket.on('updateCredits', (credits) => {
            this.creditText.setText(`${credits}`);
        });

        this.socket.on('updateScore', (score) => {
            this.scoreText.setText(`${score}`);
        });

        this.socket.on('updateCost', (info) => {
            if (info[0] == 'speed') {
                this.speedUpgradeText.setText(`Missile\nSpeed\n\n${info[1]}`);
            } else if (info[0] == 'damage') {
                this.damageUpgradeText.setText(`Missile\nDamage\n\n${info[1]}`);
            } else if (info[0] == 'radius') {
                this.radiusUpgradeText.setText(`Explosion\nRadius\n\n${info[1]}`);
            } else if (info[0] == 'regenSpeed') {
                this.regenUpgradeText.setText(`Ammo Regen\nSpeed\n\n${info[1]}`);
            } else if (info[0] == 'maxMissiles') {
                this.missileCountUpgradeText.setText(`Ammo\nCapacity\n\n${info[1]}`);
            }
        });

        this.socket.on('updateSpecialAttack', (id, newAttackName, color) => {
            if (id == this.playerId) {
                this.updateSpecialAttackIcon(this, newAttackName, color);
                if (newAttackName === 'none') {
                    this.specialAttackActive = false;
                    this.activeConsumable = false;
                } else {
                    this.activeConsumable = true;
                }
            } else {
                this.otherPlayers.getChildren().forEach((otherPlayer) => {
                    if (id == otherPlayer.playerId) {
                        this.updateSpecialAttackIcon(
                            otherPlayer,
                            newAttackName,
                            color
                        );
                    }
                });
            }
        });

        this.socket.on('updateRound', (round) => {
            this.roundText.setText(`${round}`);
        });

        /* Handles object destruction */
        this.socket.on('missileDestroyed', (missileId, size, time) => {
            this.missiles.getChildren().forEach((missile) => {
                if (missile.id == missileId) {
                    const explosion = this.add.sprite(missile.x, missile.y, 'explosion', 0)
                        .setScale(size / 96);
                    explosion.play('explode');
                    explosion.anims.setTimeScale(40 / time);
                    explosion.once(Phaser.Animations.Events.SPRITE_ANIMATION_COMPLETE, () => { explosion.destroy(); });
                    missile.destroy();
                }
            });
        });

        this.socket.on('crosshairDestroyed', (crosshairId) => {
            this.crosshairs.getChildren().forEach((crosshair) => {
                if (crosshair.id == crosshairId) {
                    crosshair.destroy();
                }
            });
        });

        this.socket.on('cometDestroyed', (cometId, size, time) => {
            this.comets.getChildren().forEach((comet) => {
                if (comet.id == cometId) {
                    const explosion = this.add.sprite(comet.x, comet.y, 'explosion', 0)
                        .setScale(size / 96);
                    explosion.play('explode');
                    explosion.anims.setTimeScale(40 / time);
                    explosion.once(Phaser.Animations.Events.SPRITE_ANIMATION_COMPLETE,() => { explosion.destroy(); });
                    comet.destroy();
                }
            });
        });

        /* Handles game over & switch to endScene */
        this.socket.on('gameOver', data => {
            data['socket'] = this.socket;
            this.scene.start('endScene', data);
            this.socket = undefined;
        });

        /* Handles player disconnect */
        this.socket.on('disconnect', playerId => {
            this.otherPlayers.getChildren().forEach(otherPlayer => {
                if (playerId === otherPlayer.playerId) {
                    otherPlayer.missileCountSprite.destroy();
                    otherPlayer.missileCountText.destroy();
                    otherPlayer.specialAttackHolder.destroy();
                    if (otherPlayer.specialAttackIcon != undefined) {
                        otherPlayer.specialAttackIcon.destroy();
                    }
                    otherPlayer.destroy();
                }
            });
            this.otherTankbodies.getChildren().forEach((otherTankbody) => {
                if (playerId === otherTankbody.playerId) {
                    otherTankbody.destroy();
                }
            });

            if (playerId == this.playerId) {
                this.socket.close();
            }
        });

        /* Handles entering debug mode */        
        this.socket.on('debug', data => {
            this.debug = true;
            this.debugMode = -1;
            this.debugText = this.add.text(this.ship.x - 20, this.ship.y, 'Debug', formatSMMED).setDepth(3);
            this.debugRoundText = this.add.text(900, 120, `1 - Round`).setDepth(3);
            this.debugBaseHealthText = this.add.text(900, 140, `2 - Base Health`).setDepth(3);
            this.debugTimerText = this.add.text(900, 160, `3 - Timer`).setDepth(3);
            this.debugCreditText = this.add.text(900, 180, `4 - Credits`).setDepth(3);
            this.maxMissilesText = this.add.text(900, 200, `5 - Maximum missile capacity`).setDepth(3);
            this.regenSpeedText = this.add.text(900, 220, `6 - Regen speed = ${data.regenSpeed}s`).setDepth(3);
            this.cometLimitText = this.add.text(900, 240, `7 - Maximum number of comets = ${data.cometLimit}`)
                .setDepth(3);
            this.cometRateText = this.add.text(900, 260, `8 - Comet spawn rate = ${data.cometRate}`).setDepth(3);
            this.cometHealthText = this.add.text(900, 280, `9 - Comet health = ${data.cometHealth}`).setDepth(3);
            this.cometSpeedText = this.add.text(900, 300, `0 - Comet speed = ${data.cometSpeed}`).setDepth(3);
        });
    
        /* Handles debug mode commands */
        this.socket.on('regenSpeedChange', (newRegen) => {
            if (this.debug) {
                this.regenSpeedText.setText(`6 - Regen speed = ${newRegen}s`);
            }
        });

        this.socket.on('cometLimitChange', (cometLimit) => {
            if (this.debug) {
                this.cometLimitText.setText(
                    `7 - Maximum number of comets = ${cometLimit}`
                );
            }
        });

        this.socket.on('cometRateChange', (cometRate) => {
            if (this.debug) {
                this.cometRateText.setText(
                    `8 - Comet spawn rate = ${cometRate}`
                );
            }
        });

        this.socket.on('cometHealthChange', (cometHealth) => {
            if (this.debug) {
                this.cometHealthText.setText(
                    `9 - Comet health = ${cometHealth}`
                );
            }
        });

        this.socket.on('cometSpeedChange', (cometSpeed) => {
            if (this.debug) {
                this.cometSpeedText.setText(`0 - Comet speed = ${cometSpeed}`);
            }
        });
        this.socket.on('baseHealthChange', (health) => {
            if (this.debug) {
                this.healthText.setText(`${health}`);
            }
        });
    }

    /* ----- Code that runs continuously as the game loops ----- */
    update() {

        /* Sends key inputs by players only to the server */
        if (!this.spectate && this.ship) {
            
            /* Barrel tracking */
            let pointer = this.input.activePointer;
            this.ship.rotation = angle(pointer.x, pointer.y, this.ship.x, this.ship.y);
            this.socket.emit('rotationChange', this.ship.rotation);

            /* Moves the UI */
            let UICutoffY = 120;
            this.moveUI(pointer, UICutoffY);

            /* Updates focus */
            if (pointer.isDown) {
                this.focus = this.pointerInGame;
            }

            /* Activates special attack */
            if (this.focus && this.specialAttackKey.isDown && !this.specialAttackActive && this.activeConsumable) {
                this.specialAttackActive = true;
                this.specialAttackHolder.setTint(0xff0000);
            }

            /* Handles missile/special firing */
            if (this.focus && !this.shot && pointer.isDown && pointer.y >= UICutoffY && !this.reloading &&
                (!this.missilesEmpty || this.specialAttackActive)) {
                this.ship.play('fireShot');
                this.shot = true;

                if (this.specialAttackActive) {
                    this.socket.emit('specialShot');
                    this.activeConsumable = false;
                }

                if (!this.specialAttackActive) {
                    this.socket.emit('missileShot', {
                        x: this.ship.x,
                        y: this.ship.y,
                        mouseX: pointer.x,
                        mouseY: pointer.y,
                        rotation: this.ship.rotation
                    });
                }
            }
            if (!pointer.isDown) {
                this.shot = false;
            }

            /* Handles keyboard inputs for debug mode */
            let keyb = this.input.keyboard;
            keyb.addListener('keydown', event => {
                if (!this.focus) {
                    return;
                }
                if (event.keyCode === 192) {
                    this.socket.emit('enterDebug');
                }
                if (this.debug) {
                    if (event.keyCode === 48) {
                        this.debugMode = event.keyCode - 48;
                        this.debugText.setText('cometSpeed');
                    }
                    if (event.keyCode === 49) {
                        this.debugMode = event.keyCode - 48;
                        this.debugText.setText('round');
                    }
                    if (event.keyCode === 50) {
                        this.debugMode = event.keyCode - 48;
                        this.debugText.setText('baseHealth');
                    }
                    if (event.keyCode === 51) {
                        this.debugMode = event.keyCode - 48;
                        this.debugText.setText('timer');
                    }
                    if (event.keyCode === 52) {
                        this.debugMode = event.keyCode - 48;
                        this.debugText.setText('credits');
                    }
                    if (event.keyCode === 53) {
                        this.debugMode = event.keyCode - 48;
                        this.debugText.setText('maxMissiles');
                    }
                    if (event.keyCode === 54) {
                        this.debugMode = event.keyCode - 48;
                        this.debugText.setText('regenSpeed');
                    }
                    if (event.keyCode === 55) {
                        this.debugMode = event.keyCode - 48;
                        this.debugText.setText('cometLimit');
                    }
                    if (event.keyCode === 56) {
                        this.debugMode = event.keyCode - 48;
                        this.debugText.setText('cometRate');
                    }
                    if (event.keyCode === 57) {
                        this.debugMode = event.keyCode - 48;
                        this.debugText.setText('cometHealth');
                    }

                    let negative = 1;
                    if (event.keyCode === 189) {
                        negative = -1;
                    }

                    if (!this.keypressed && (event.keyCode === 189 || event.keyCode === 187)) {
                        this.key = new Phaser.Input.Keyboard.Key(keyb, event.keyCode);
                        this.keypressed = true;
                        switch (this.debugMode) {
                            case 0:
                                this.socket.emit('changeCometSpeed', 1 * negative);
                                break;
                            case 1:
                                this.socket.emit('changeRound');
                                break;
                            case 2:
                                this.socket.emit('changeBaseHealth', 10 * negative);
                                break;
                            case 3:
                                this.socket.emit('changeTimer', 5 * negative);
                                break;
                            case 4:
                                this.socket.emit('changeCredits', 100 * negative);
                                break;
                            case 5:
                                this.socket.emit('changeMaxMissiles', 1 * negative);
                                break;
                            case 6:
                                this.socket.emit('changeRegenSpeed', 1 * negative);
                                break;
                            case 7:
                                this.socket.emit('changeCometLimit', 1 * negative);
                                break;
                            case 8:
                                this.socket.emit('changeCometRate', -150 * negative);
                                break;
                            case 9:
                                this.socket.emit('changeCometHealth', 1 * negative);
                                break;
                        }
                    }
                }
            });
            if (this.key && !this.key.isDown) {
                this.keypressed = false;
            }
        }
    }

    /* ---------- Helper functions ---------- */

    /* ----- UI creation helper functions ----- */

    /* Main create UI function */
    makeUI() {

        /* Creates the UI panel at the top of the screen */
        const shopUIBackground = this.add.sprite(640, -40, 'shopbg')
            .setDisplaySize(1280, 200)
            .setTint(0xffffff)
            .setDepth(1);
        this.shopUI.add(shopUIBackground);
        
        /* If the user is not a spectator, create info buttons & the upgrade/consumable buttons */
        if (!this.spectate) {
            this.makeInfoButton();
            this.makeUIButtons();
        }
    }

    /* Creates the info button */
    makeInfoButton() {

        /* Info button displays text on hover over, removes text when not hovering */
        this.infoButton = this.add.image(1220, 50, 'info')
            .setScale(0.5)
            .setDepth(1)
            .setInteractive()
            .on('pointerover', () => {
                this.roundInfoText = this.add.text(10, 185, 
`The current
round`,
                    formatTUT).setDepth(2);
                this.timerInfoText = this.add.text(100, 185, 
`Seconds remaining
until the 
round/break ends`, 
                    formatTUT).setDepth(2);
                this.healthInfoText = this.add.text(240, 185, 
`Current base 
health`, 
                    formatTUT).setDepth(2);
                this.scoreInfoText = this.add.text(360, 185, 'Current game score', formatTUT).setDepth(2);
                this.creditInfoText = this.add.text(640, 185, 'Current amount of credits', formatTUT).setDepth(2);
                this.missileCountInfoText = this.add.text(this.ship.x - 100, 600, 
                    'The amount of missiles you have', formatTUT).setDepth(2);
                this.instructionsText = this.add.text(900, 165, 
`Firing Missiles: 
Click anywhere to fire a missile.
The missile explodes at the crosshair, 
and the explosion damage to the comets.

Firing Consumables:
If you purchase a fireable consumable, 
press 'q' and click to fire in the desired direction.

Win/Loss Condition:
As the rounds progress, 
comets increase in number, speed, and damage.
If a comet reaches the base, 
your base will receive damage equal to 
the comet's current health.
You lose when base health reaches 0.`, 
                    formatTUT);
            })
            .on('pointerout', () => {
                if (this.roundInfoText) {
                    this.roundInfoText.destroy();
                }
                if (this.timerInfoText) {
                    this.timerInfoText.destroy();
                }
                if (this.healthInfoText) {
                    this.healthInfoText.destroy();
                }
                if (this.scoreInfoText) {
                    this.scoreInfoText.destroy();
                }
                if (this.creditInfoText) {
                    this.creditInfoText.destroy();
                }
                if (this.missileCountInfoText) {
                    this.missileCountInfoText.destroy();
                }
                if (this.instructionsText) {
                    this.instructionsText.destroy();
                }
            })
    }

    /* Function to pass in what buttons need to be made */
    makeUIButtons() {
        this.makeButton(
            'speedUpgrade',
            'Missile\nSpeed\n\n1000',
            'speed',
            'Increases the rate\nat which missiles fly'
        );
        this.makeButton(
            'damageUpgrade',
            'Missile\nDamage\n\n1000',
            'damage',
            'Increases the damage\nof your missiles'
        );
        this.makeButton(
            'radiusUpgrade',
            'Explosion\nRadius\n\n400',
            'radius',
            'Increases the explosion\nradius of your missiles'
        );
        this.makeButton(
            'regenUpgrade',
            'Ammo Regen\nSpeed\n\n500',
            'regenSpeed',
            'Increases how fast\nyour missiles regenerate'
        );
        this.makeButton(
            'missileCountUpgrade',
            'Ammo\nCapacity\n\n800',
            'maxMissiles',
            'Increases how many\nmissiles you can store'
        );

        this.makeHalfButton(
            'laserConsumable',
            'Laser\n1500',
            'laser',
            'Fires a laser beam in\na line,hitting multiple\ntargets. Grants 3 uses'
        );

        this.makeHalfButton(
            'flakConsumable',
            'Flak\n100',
            'flak',
            'For 10 seconds, fire\nnumerous smaller missiles\nnear the cursor location'
        );

        this.makeHalfButton(
            'nukeConsumable',
            'Nuke\n200',
            'nuke',
            'Huge explosion radius'
        )
    }

    /* Helper function to make full-sized buttons for missile upgrades */
    makeButton(name, text, upgradeType, description) {

        /* Updates position of button */
        let xpos = this.shopUIButtonPlacerX;
        let ypos = this.shopUIButtonPlacerY;
        this.shopUIButtonPlacerX += 160;

        /* Creates the button and assigns it to attemptUpgrade when clicked */
        this[name + 'Text'] = this.add.text(xpos - 40, ypos - 25, text, formatBUT)
            .setDepth(2)
            .setTint(0x202020);
        this[name] = this.add.image(xpos, ypos, 'button')
            .setDepth(1)
            .setScale(1.5)
            .setTint(0xcfcfcf)
            .setInteractive()
            .on('pointerover', () => {
                this.upgradeHelpText = this.add.text(xpos - 60, ypos + 270, description, formatTUT).setDepth(2);
            })
            .on('pointerout', () => {
                if (this.upgradeHelpText) {
                    this.upgradeHelpText.destroy();
                }
            })
        assignButtonBehavior(this[name], () => {
            this.socket.emit('attemptUpgrade', upgradeType);
        });

        /* Adds button to shop */
        this.shopUI.add(this[name]);
        this.shopUI.add(this[name + 'Text']);
    }

    /* Helper function to add half buttons to shop */
    makeHalfButton(name, text, consumableType, description) {

        /* Calculates position of where button should be placed */
        let xpos = this.shopUIButtonPlacerX;
        let ypos = this.shopUIButtonPlacerY;
        if (ypos > -80) {
            this.shopUIButtonPlacerY = -85;
            this.shopUIButtonPlacerX += 130;
        } else {
            this.shopUIButtonPlacerY += 65;
        }

        /* Creates button and assigns it to attemptBuyConsumable when clicked */
        this[name + 'Text'] = this.add.text(xpos - 55, ypos - 32, text, formatBUT)
            .setDepth(2)
            .setTint(0x202020);
        this[name] = this.add.image(xpos, ypos - 19, 'halfbutton')
            .setDepth(1)
            .setScale(1.25)
            .setTint(0xcfcfcf)
            .setInteractive()
            .on('pointerover', () => {
                this.upgradeHelpText = this.add.text(xpos - 60, ypos + 270, description, formatTUT).setDepth(2);
            })
            .on('pointerout', () => {
                if (this.upgradeHelpText) {
                    this.upgradeHelpText.destroy();
                }
            })
        assignButtonBehavior(this[name], () => {
            this.socket.emit('attemptBuyConsumable', consumableType);
        });

        /* Adds buttons to UI */
        this.shopUI.add(this[name]);
        this.shopUI.add(this[name + 'Text']);
    }

    /* Adds the missile counter */
    addMissileCounter(player, playerInfo) {
        player.missileCountSprite = this.add.sprite(playerInfo.x - 45, 575, 'missile')
            .setDisplaySize(20, 30)
            .setDepth(3);
        player.missileCountText = this.add.text(playerInfo.x - 15, 575, 
            `${playerInfo.missiles}/${playerInfo.maxMissiles}`, formatSMMED)
            .setTint(0xffffff)
            .setDepth(3);
    }

    /* Adds the special attack holder */
    addSpecialAttackHolder(player, playerInfo) {
        player.specialAttackHolder = this.add.sprite(playerInfo.x - 60, 650, 'specialholder')
            .setDisplaySize(32, 32)
            .setDepth(3);
    }

    /* ----- UI update helper functions ----- */

    /* Moves the UI downwards when user hovers over it */
    moveUI(pointer, UICutoffY) {
        if (!this.UITweening) {
            if (pointer.y >= UICutoffY || !this.pointerInGame) {
                if (this.UIOut) {
                    this.tweens.add({
                        targets: this.shopUI.getChildren(),
                        y: '-=120',
                        duration: 100
                    });
                    this.UITweening = true;
                    setTimeout(() => (this.UITweening = false), 150);
                    this.UIOut = false;
                }
            } else {
                if (!this.UIOut && this.pointerInGame) {
                    this.tweens.add({
                        targets: this.shopUI.getChildren(),
                        y: '+=120',
                        duration: 100
                    });
                    this.UITweening = true;
                    setTimeout(() => (this.UITweening = false), 150);
                    this.UIOut = true;
                }
            }
        }
    }

    /* Updates the special attack icon with the purchased consumable */
    updateSpecialAttackIcon(player, newAttackName, color) {

        /* Clears the special attack holder */
        if (player.specialAttackIcon != undefined) {
            player.specialAttackIcon.destroy();
        }
        if (newAttackName == 'none') {
            if (this === player) {
                this.specialAttackHolder.setTint(0xffffff);
            }
            return;
        }
        
        /* Adds the special attack icon if it exists*/
        player.specialAttackIcon = this.add.sprite(player.specialAttackHolder.x, player.specialAttackHolder.y,      
            newAttackName)
            .setDisplaySize(24, 24)
            .setDepth(3)
            .setTint(color);
    }

    /* Updates reload bar */
    displayReloadBar(ship, positionX, reloadTime, newMaxMissiles) {
        const width = 120;
        const height = 16;
        const positionY = 708;

        ship.maxMissilesClientCopy = newMaxMissiles;

        /* Creates the progress and full reload bar */
        const reloadBarBase = this.add.sprite(positionX, positionY, 'reloadmeter')
            .setDisplaySize(width, height)
            .setTint(0xbb0000)
            .setDepth(3);
        const reloadBarFront = this.add.sprite(positionX - width * 0.5, positionY, 'reloadmeter')
            .setDisplaySize(0, height)
            .setTint(0x00ff00)
            .setDepth(3);

        let timer = 0;
        let oldMaxMissiles = newMaxMissiles;

        /* Updates the reload bar until it is full */
        let drawLoop = setInterval(() => {
            if (timer >= reloadTime || ship.maxMissilesClientCopy != oldMaxMissiles) {
                reloadBarBase.destroy();
                reloadBarFront.destroy();
                clearInterval(drawLoop);
            } else {
                let progress = timer / reloadTime;
                reloadBarFront.setPosition(positionX - width * 0.5 + progress * width * 0.5, positionY);
                reloadBarFront.setDisplaySize(progress * width, height);
                timer += 16;
            }
        }, 16);
    }

    /* Updates the missile count */
    displayMissileCount(somePlayer, newAmount, maxAmount) {
        somePlayer.maxMissilesClientCopy = maxAmount;
        somePlayer.missileCountText.setText('' + newAmount + '/' + maxAmount);
    }

    /* ----- Object creation helper functions ----- */

    /* Main function for adding players */
    addPlayer(playerInfo) {
        this.addTankBody(playerInfo);
        this.ship = this.physics.add.sprite(playerInfo.x, playerInfo.y - 10, 'tankbarrel')
            .setScale(0.7)
            .setDepth(2);
        this.playerId = playerInfo.playerId;
        this.addMissileCounter(this, playerInfo);
        this.addSpecialAttackHolder(this, playerInfo);
        this.maxMissilesClientCopy = playerInfo.maxMissiles;
    }

    /* Adds a player that isn't the current player */
    addOtherPlayers(playerInfo) {
        const otherTankbody = this.addTankBody(playerInfo);
        const otherPlayer = this.add.sprite(playerInfo.x, playerInfo.y - 10, 'tankbarrel')
            .setScale(0.7)
            .setDepth(2);
        otherPlayer.playerId = playerInfo.playerId;
        otherPlayer.rotation = playerInfo.rotation;
        this.addMissileCounter(otherPlayer, playerInfo);
        this.addSpecialAttackHolder(otherPlayer, playerInfo);
        this.maxMissilesClientCopy = playerInfo.maxMissiles;
        otherTankbody.playerId = playerInfo.playerId;
        this.otherPlayers.add(otherPlayer);
        this.otherTankbodies.add(otherTankbody);
    }

    /* Adds the body of the player/tank sprite */
    addTankBody(playerInfo) {
        return this.add.sprite(playerInfo.x, playerInfo.y, 'tankbody' + (1 + Math.round((playerInfo.x - 160) / 320.0)))
            .setScale(0.5)
            .setDepth(1);
    }

    /* Adds a missile to the screen */
    addMissile(missileInfo) {
        let missile;
        if (!missileInfo.flakSpecial && !missileInfo.nukeSpecial) {
            missile = this.add.sprite(missileInfo.x, missileInfo.y, 'missile')
                .setDepth(2)
                .setScale(0.1875);
        } else if (missileInfo.flakSpecial) {
            missile = this.add.sprite(missileInfo.x, missileInfo.y, 'missile')
                .setDepth(2)
                .setScale(0.02);
        }else {
            missile = this.add.sprite(missileInfo.x, missileInfo.y, 'nuke-projectile')
                .setDepth(2)
                .setScale(0.25);
            missile.play('nukeRevolve');
        }
        missile.rotation = missileInfo.rotation;
        missile.id = missileInfo.id;
        this.missiles.add(missile);
    }

    /* Adds a crosshair to the screen */
    addCrosshair(crosshairInfo) {
        const crosshair = this.add.sprite(crosshairInfo.mouseX, crosshairInfo.mouseY, 'crosshair')
            .setScale(0.3);
        crosshair.id = crosshairInfo.id;
        this.crosshairs.add(crosshair);
    }

    /* Adds a comet to the screen */
    addComet(cometInfo) {
        const comet = this.add.sprite(cometInfo.x, cometInfo.y, 'comet')
            .setDisplaySize(32, 64);
        comet.rotation = cometInfo.rotation;
        comet.id = cometInfo.id;
        comet.play('cometRevolve');
        this.comets.add(comet);
    }

    /* Adds a laser to the screen */
    displayLaser(center, dir, rot) {
        let tempLaser = this.add.sprite(center.x + 670 * dir.x, center.y + 670 * dir.y, 'laser')
            .setDisplaySize(100, 1280)
            .setDepth(3);
        tempLaser.play('laserFlux');
        tempLaser.rotation = rot;
        tempLaser.alpha = 1;
        let drawLoop = setInterval(() => {
            tempLaser.alpha -= 0.02;
            if (tempLaser.alpha <= 0.01) {
                tempLaser.destroy();
                clearInterval(drawLoop);
            }
        }, 16);
    }
}
    

export default GameScene;
