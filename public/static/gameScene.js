import { angle } from '/static/gameCalculations.js'

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: "gameScene" });
    }

    init(socket) {
        this.socket = socket;
        console.log(socket);
    }

    preload() {
        this.load.image("background", "/assets/background.png");
        this.load.image("stars", "/assets/background-stars.png");
        this.load.image("tankbody1", "/assets/tankbody1.png");
        this.load.image("tankbody2", "/assets/tankbody2.png");
        this.load.image("tankbody3", "/assets/tankbody3.png");
        this.load.image("tankbody4", "/assets/tankbody4.png");
        this.load.spritesheet("tankbarrel", "/assets/tankbarrel.png", {
            frameWidth: 32,
            frameHeight: 256,
        });
        this.load.image("missile", "/assets/missile.png");
        this.load.spritesheet("comet", "/assets/comet.png", {
            frameWidth: 64,
            frameHeight: 128,
        });
        this.load.spritesheet("explosion", "/assets/explosion.png", {
            frameWidth: 128,
            frameHeight: 128,
        });
        this.load.image("base", "/assets/base.png");
        this.load.image("button", "/assets/button.png");
        this.load.image("halfbutton", "/assets/half-button.png");
        this.load.image("reloadmeter", "/assets/reload-meter-tex.png");
        this.load.image("crosshair", "/assets/crosshairs.png");
        this.load.image("shopbg", "/assets/shop-ui-main.png");
        this.load.image("specialholder", "/assets/special-attack-holder.png");
        this.load.spritesheet("laser", "assets/laser-bar.png", {
            frameWidth: 64,
            frameHeight: 64,
        });
    }

    create() {
        let self = this;

        this.socket.emit('requestInitialize');

        this.pointerInGame = true
        this.game.canvas.onmouseover = (e) => this.pointerInGame = true
        this.game.canvas.onmouseout = (e) => this.pointerInGame = false

        //Load background
        this.add.image(640, 360, "background").setScale(1);
        //this.add.image(640, 360, "stars").setScale(4);
        this.add.image(640, 360, "base").setScale(1);

        //Create animations
        this.anims.create({
            key: "explode",
            frameRate: 20,
            frames: this.anims.generateFrameNames("explosion", {
                start: 0,
                end: 15,
            }),
        });

        this.anims.create({
            key: "cometMain",
            frameRate: 20,
            repeat: -1,
            frames: this.anims.generateFrameNames("comet", {
                start: 0,
                end: 15,
            }),
        })

        this.anims.create({
            key: "fire",
            frameRate: 20,
            frames: this.anims.generateFrameNames("tankbarrel", {
                start: 1,
                end: 8,
            }),
        });

        this.anims.create({
            key: "laserFlux",
            frameRate: 8,
            repeat: -1,
            frames: this.anims.generateFrameNames("laser", {
                start: 0,
                end: 2,
            }),
        });

        //GroupsY
        this.missiles = this.physics.add.group();
        this.comets = this.physics.add.group();
        this.otherPlayers = this.physics.add.group();
        this.otherTankbodys = this.physics.add.group();
        this.crosshairs = this.physics.add.group();
        this.shopUI = this.add.group();
        //special variables for shop button placement
        this.shopUIButtonPlacerX = 80;
        this.shopUIButtonPlacerY = -85;

        this.spectate = false;

        this.socket.on("spectate", () => {
            this.spectate = true;
            this.spectateText = this.add.text(50, 200, 'Spectating', { fontSize: '24px' });
        })

        this.makeUI(this);
        this.focus = true;

        //Game variables
        this.shot = false;
        this.keypressed = false;
        this.reloading = false;
        this.UIOut = false;
        this.UITweening = false;
        this.noMissilesLeft = false;
        this.maxMissilesClientCopy = -1;

        this.specialAttackClientCopy = "none";
        this.specialAttackActive = false;
        this.specialAttackKey = this.input.keyboard.addKey('Q');

        this.created = true;

        //Initializing server-handled objects
        let UITextY = 15;
        this.socket.on('initHealth', baseHealth => {
            this.healthText = this.add.text(315, UITextY, `${baseHealth}`, { fontSize: '32px' })
                .setTint(0x303030).setDepth(101);
            this.shopUI.add(this.healthText);
        })
        this.socket.on('initTimer', timer => {
            this.timerText = this.add.text(190, UITextY, `${timer}`, { fontSize: '32px' })
                .setTint(0x303030).setDepth(101);
            this.shopUI.add(this.timerText);
        })
        this.socket.on('initCredits', cred => {
            this.creditText = this.add.text(700, UITextY, `${cred}`, { fontSize: '32px' })
                .setTint(0x303030).setDepth(101);
            this.shopUI.add(this.creditText);
        })
        this.socket.on('initScore', score => {
            this.scoreText = this.add.text(440, UITextY, `${score}`, { fontSize: '32px' })
                .setTint(0x303030).setDepth(101);
            this.shopUI.add(this.scoreText);
        })
        this.socket.on('initRound', round => {
            this.roundText = this.add.text(70, UITextY, `${round}`, { fontSize: '32px' })
                .setTint(0x303030).setDepth(101);
            this.shopUI.add(this.roundText);
        });
        this.socket.on("currentPlayers", (players) => {
            Object.keys(players).forEach((id) => {
                if (players[id].playerId === self.socket.id) {
                    self.addPlayer(self, players[id]);
                } else {
                    self.addOtherPlayers(self, players[id]);
                }
            });
        });
        this.socket.on("initComets", (serverComets) => {
            Object.keys(serverComets).forEach((comet) => {
                if (comet != undefined) {
                    self.addComet(self, serverComets[comet]);
                }
            });
        });

        //Events where new objects are created
        this.socket.on("newPlayer", (playerInfo) => {
            self.addOtherPlayers(self, playerInfo);
        });
        this.socket.on("newMissile", (missileInfo) => {
            self.addMissile(self, missileInfo);
        });
        this.socket.on("newCrosshair", (crosshairInfo) => {
            self.addCrosshair(self, crosshairInfo);
        });
        this.socket.on("missileFired", (id) => {
            self.otherPlayers.getChildren().forEach((otherPlayer) => {
                if (id == otherPlayer.playerId) {
                    otherPlayer.play("fire");
                }
            });
        });

        this.socket.on("laserFired", (center, dir, rot) => {
            self.displayLaser(self, center, dir, rot);
        })

        this.socket.on("newComet", (cometInfo) => {
            self.addComet(self, cometInfo);
        });

        //missile count display; reload bar display
        this.socket.on('missileCountChange', (id, newAmount, maxAmount, regenTime, displayBar) => {
            if (id == self.playerId) {
                if (this.debug) {
                    this.missileCountText.setText(`5 - Maximum missile capacity = ${newAmount}`);
                }
                if (newAmount == 0) { this.noMissilesLeft = true; } else { this.noMissilesLeft = false; }
                self.displayMissileCount(self, self, newAmount, maxAmount, regenTime);
                if (displayBar) { this.displayReloadBar(self, self, this.ship.x, regenTime, this.maxMissilesClientCopy); }
            }
            else {
                self.otherPlayers.getChildren().forEach(otherPlayer => {
                    if (id == otherPlayer.playerId) {
                        self.displayMissileCount(self, otherPlayer, newAmount, maxAmount, regenTime);
                        if (displayBar) { self.displayReloadBar(self, otherPlayer, otherPlayer.x, regenTime, this.maxMissilesClientCopy); }
                    }
                    self.displayMissileCount(
                        self,
                        self,
                        newAmount,
                        maxAmount,
                        regenTime
                    );
                });
            }
        });

        //Events where objects are destroyed
        this.socket.on("missileDestroyed", (missileId, size, time) => {
            self.missiles.getChildren().forEach((missile) => {
                if (missile.id == missileId) {
                    const explosion = this.add
                        .sprite(missile.x, missile.y, "explosion", 0)
                        .setScale(size / 128);
                    explosion.play("explode");
                    explosion.anims.setTimeScale(40 / time);
                    explosion.once(
                        Phaser.Animations.Events.SPRITE_ANIMATION_COMPLETE,
                        () => {
                            explosion.destroy();
                        }
                    );
                    missile.destroy();
                }
            });
        });

        this.socket.on("crosshairDestroyed", (crosshairId) => {
            self.crosshairs.getChildren().forEach((crosshair) => {
                if (crosshair.id == crosshairId) {
                    crosshair.destroy();
                }
            });
        });

        this.socket.on("cometDestroyed", (cometId, size, time) => {
            self.comets.getChildren().forEach((comet) => {
                if (comet.id == cometId) {
                    const explosion = this.add
                        .sprite(comet.x, comet.y, "explosion", 0)
                        .setScale(size / 96);
                    explosion.play("explode");
                    explosion.anims.setTimeScale(40 / time);
                    explosion.once(
                        Phaser.Animations.Events.SPRITE_ANIMATION_COMPLETE,
                        () => {
                            explosion.destroy();
                        }
                    );
                    comet.destroy();
                }
            });
        });

        this.socket.on("disconnect", (playerId) => {
            self.otherPlayers.getChildren().forEach((otherPlayer) => {
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
            self.otherTankbodys.getChildren().forEach((otherTankbody) => {
                if (playerId === otherTankbody.playerId) {
                    otherTankbody.destroy();
                }
            });

            if (playerId == self.playerId) {
                this.socket.close();
            }
        });
        this.socket.on("gameOver", (data) => {
            data['socket'] = this.socket;
            console.log('game -> end')
            this.scene.start("endScene", data);
            this.socket = undefined;
            console.log(this.socket);
        });

        //Events where object states are updated
        this.socket.on("baseDamaged", (info) => {
            self.comets.getChildren().forEach((comet) => {
                if (comet.id == info[0]) {
                    this.healthText.setText(`${info[1]}`);
                    const explosion = this.add
                        .sprite(comet.x, comet.y, "explosion", 0)
                        .setScale(1);
                    explosion.play("explode");
                    explosion.once(
                        Phaser.Animations.Events.SPRITE_ANIMATION_COMPLETE,
                        () => {
                            explosion.destroy();
                        }
                    );
                    comet.destroy();
                }
            });
        });
        this.socket.on("missileUpdate", (serverMissiles) => {
            self.missiles.getChildren().forEach((missile) => {
                //console.log(serverMissiles[missile.id].x + "," + serverMissiles[missile.id].y)
                missile.setPosition(
                    serverMissiles[missile.id].x,
                    serverMissiles[missile.id].y
                );
                //console.log(serverMissiles[missile.id].x + "," + serverMissiles[missile.id].y)
            });
        });
        this.socket.on("cometUpdate", (serverComets) => {
            self.comets.getChildren().forEach((comet) => {
                if (serverComets[comet.id] != undefined) {
                    comet.setPosition(
                        serverComets[comet.id].x,
                        serverComets[comet.id].y
                    );
                }
            });
        });
        this.socket.on("playerMoved", (playerInfo) => {
            self.otherPlayers.getChildren().forEach((otherPlayer) => {
                if (playerInfo.playerId === otherPlayer.playerId) {
                    otherPlayer.setRotation(playerInfo.rotation);
                }
            });
        });
        this.socket.on("timerUpdate", (timer) => {
            this.timerText.setText(`${timer}`);
        });
        this.socket.on("updateCredits", (credits) => {
            this.creditText.setText(`${credits}`);
        });
        this.socket.on("updateScore", (score) => {
            this.scoreText.setText(`${score}`);
        });
        this.socket.on("updateCost", (info) => {
            if (info[0] == "speed") {
                this.speedUpgradeText.setText(`Missile\nSpeed\n\n${info[1]}`);
            } else if (info[0] == "damage") {
                this.damageUpgradeText.setText(`Missile\nDamage\n\n${info[1]}`);
            } else if (info[0] == "radius") {
                this.radiusUpgradeText.setText(`Explosion\nRadius\n\n${info[1]}`);
            } else if (info[0] == "regenSpeed") {
                this.regenUpgradeText.setText(`Ammo Regen\nSpeed\n\n${info[1]}`);
            } else if (info[0] == "maxMissiles") {
                this.missileCountUpgradeText.setText(`Ammo\nCapacity\n\n${info[1]}`);
            }
        });
        this.socket.on("updateSpecialAttack", (id, newAttackName, color) => {

            if (id == self.playerId) {
                self.specialAttackClientCopy = newAttackName;
                self.updateSpecialAttackIcon(self, self, newAttackName, color);
            }
            else {
                self.otherPlayers.getChildren().forEach(otherPlayer => {
                    if (id == otherPlayer.playerId) {
                        self.updateSpecialAttackIcon(self, otherPlayer, newAttackName, color);
                    }
                });
            }


        })
        this.socket.on("updateRound", (round) => {
            this.roundText.setText(`${round}`);
        })
        this.socket.on("regenSpeedChange", newRegen => {
            if (this.debug) {
                this.regenSpeedText.setText(`6 - Regen speed = ${newRegen}s`);
            }
        })
        this.socket.on("cometLimitChange", cometLimit => {
            if (this.debug) {
                this.cometLimitText.setText(`7 - Maximum number of comets = ${cometLimit}`);
            }
        })
        this.socket.on('cometRateChange', cometRate => {
            if (this.debug) {
                this.cometRateText.setText(`8 - Comet spawn rate = ${cometRate}`);
            }
        })
        this.socket.on('cometHealthChange', cometHealth => {
            if (this.debug) {
                this.cometHealthText.setText(`9 - Comet health = ${cometHealth}`);
            }
        })
        this.socket.on('cometSpeedChange', cometSpeed => {
            if (this.debug) {
                this.cometSpeedText.setText(`0 - Comet speed = ${cometSpeed}`);
            }
        })
        this.socket.on('baseHealthChange', health => {
            if (this.debug) {
                this.healthText.setText(`${health}`);
            }
        })
        this.socket.on('reload', () => {
            location.reload();
        })
        this.socket.on('debug', data => {
            this.debug = true;
            this.debugMode = -1;
            this.debugText = this.add.text(this.ship.x - 20, this.ship.y, 'Debug', { fontSize: '24px' }).setDepth(100);
            this.debugRoundText = this.add.text(900, 120, `1 - Round`).setDepth(150);
            this.debugBaseHealthText = this.add.text(900, 140, `2 - Base Health`).setDepth(150);
            this.debugTimerText = this.add.text(900, 160, `3 - Timer`).setDepth(150);
            this.debugCreditText = this.add.text(900, 180, `4 - Credits`).setDepth(150);
            this.maxMissilesText = this.add.text(900, 200, `5 - Maximum missile capacity`).setDepth(150);
            this.regenSpeedText = this.add.text(900, 220, `6 - Regen speed = ${data.regenSpeed}s`).setDepth(150);
            this.cometLimitText = this.add.text(900, 240, `7 - Maximum number of comets = ${data.cometLimit}`).setDepth(150);
            this.cometRateText = this.add.text(900, 260, `8 - Comet spawn rate = ${data.cometRate}`).setDepth(150);
            this.cometHealthText = this.add.text(900, 280, `9 - Comet health = ${data.cometHealth}`).setDepth(150);
            this.cometSpeedText = this.add.text(900, 300, `0 - Comet speed = ${data.cometSpeed}`).setDepth(150);
        })
    }

    update() {
        if (this.created && !this.spectate && this.ship) {
            //Mouse handling
            let pointer = this.input.activePointer;

            this.ship.rotation = angle(pointer.x, pointer.y, this.ship.x, this.ship.y);
            this.socket.emit("rotationChange", this.ship.rotation);

            let UICutoffY = 120;

            //make the UI tray come out and go back in
            this.moveUI(pointer, UICutoffY);

            //Special attack activate
            if (this.specialAttackKey.isDown && !this.specialAttackActive && this.specialAttackClientCopy != "none") {
                this.specialAttackActive = true;
                this.specialAttackHolder.setTint(0xff0000);
            }

            if (pointer.isDown) {
                this.focus = this.pointerInGame
            }

            //Shot handling
            if (
                this.focus &&
                !this.shot &&
                pointer.isDown &&
                pointer.y >= UICutoffY &&
                !this.reloading &&
                (!this.noMissilesLeft || this.specialAttackActive)
            ) {
                this.ship.play("fire");
                this.shot = true;

                if (this.specialAttackActive) {
                    switch (this.specialAttackClientCopy) {
                        case "none":
                            this.specialAttackActive = false;
                        default: // attack is not none so assume it's something
                            this.socket.emit("specialShot");
                    }
                }

                if (!this.specialAttackActive) {
                    this.socket.emit("missileShot", {
                        x: this.ship.x,
                        y: this.ship.y,
                        mouseX: pointer.x,
                        mouseY: pointer.y,
                        rotation: this.ship.rotation,
                    });
                }
            }

            if (!pointer.isDown) {
                this.shot = false;
            }

            let keyb = this.input.keyboard;

            keyb.addListener('keydown', event => {
                if (!this.focus) {
                    return
                }
                if (event.keyCode === 192) {
                    this.socket.emit("enterDebug");
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
                                this.socket.emit('changeCometRate', -500 * negative);
                                break;
                            case 9:
                                this.socket.emit('changeCometHealth', 1 * negative);
                                break;
                        }
                    }
                }
            })

            if (this.key && !this.key.isDown) {
                this.keypressed = false;
            }
        }
    }

    //Function for UI tray movement
    moveUI(pointer, UICutoffY) {
        if (!this.UITweening) {
            if (pointer.y >= UICutoffY || !this.pointerInGame) {
                if (this.UIOut) {
                    this.tweens.add({
                        targets: this.shopUI.getChildren(),
                        y: "-=120",
                        duration: 100,
                    });
                    this.UITweening = true;
                    setTimeout(() => (this.UITweening = false), 150);
                    this.UIOut = false;
                }
            } else {
                if (!this.UIOut && this.pointerInGame) {
                    this.tweens.add({
                        targets: this.shopUI.getChildren(),
                        y: "+=120",
                        duration: 100,
                    });
                    this.UITweening = true;
                    setTimeout(() => (this.UITweening = false), 150);
                    this.UIOut = true;
                }
            }
        }
    }

    //Helper add functions
    addTankBody(self, playerInfo) {
        return self.add
            .sprite(playerInfo.x, playerInfo.y, "tankbody" + (1 + Math.round((playerInfo.x - 160) / 320.0)))
            .setScale(0.5)
            .setDepth(25);
    }

    addMissileCounter(self, somePlayer, playerInfo) {
        somePlayer.missileCountSprite = self.add.sprite(playerInfo.x - 45, 575, 'missile').setDisplaySize(20, 30).setDepth(100);
        somePlayer.missileCountText = self.add.text(playerInfo.x - 15, 575, '' + playerInfo.missiles + '/' + playerInfo.maxMissiles, { fontSize: '24px' })
            .setTint(0xffffff).setDepth(100);
    }

    addSpecialAttackHolder(self, somePlayer, playerInfo) {
        somePlayer.specialAttackHolder = self.add.sprite(playerInfo.x - 60, 650, 'specialholder').setDisplaySize(32, 32).setDepth(100);
    }

    updateSpecialAttackIcon(self, somePlayer, newAttackName, color) {
        if (somePlayer.specialAttackIcon != undefined) { somePlayer.specialAttackIcon.destroy(); }
        if (newAttackName == "none") {
            if (self === somePlayer) {
                self.specialAttackHolder.setTint(0xffffff);
            }
            return;
        }

        somePlayer.specialAttackIcon = self.add.sprite(somePlayer.specialAttackHolder.x, somePlayer.specialAttackHolder.y, newAttackName)
            .setDisplaySize(24, 24).setDepth(101).setTint(color);
    }

    addPlayer(self, playerInfo) {
        self.addTankBody(self, playerInfo);
        self.ship = self.physics.add.sprite(playerInfo.x, playerInfo.y - 10, 'tankbarrel')
            .setScale(0.7)
            .setDepth(20);
        self.ship.setDrag(100);
        self.ship.setAngularDrag(100);
        self.ship.setMaxVelocity(200);
        self.playerId = playerInfo.playerId;
        self.addMissileCounter(self, self, playerInfo);
        self.addSpecialAttackHolder(self, self, playerInfo);
        self.maxMissilesClientCopy = playerInfo.maxMissiles;
    }

    addOtherPlayers(self, playerInfo) {
        const otherTankbody = self.addTankBody(self, playerInfo);
        const otherPlayer = self.add
            .sprite(playerInfo.x, playerInfo.y - 10, "tankbarrel")
            .setScale(0.7)
            .setDepth(20);
        otherPlayer.playerId = playerInfo.playerId;
        otherPlayer.rotation = playerInfo.rotation;
        self.addMissileCounter(self, otherPlayer, playerInfo);
        self.addSpecialAttackHolder(self, otherPlayer, playerInfo);
        self.maxMissilesClientCopy = playerInfo.maxMissiles;
        otherTankbody.playerId = playerInfo.playerId;
        self.otherPlayers.add(otherPlayer);
        self.otherTankbodys.add(otherTankbody);
    }

    addMissile(self, missileInfo) {
        const missile = self.add
            .sprite(missileInfo.x, missileInfo.y, "missile")
            .setDepth(15)
            .setScale(0.1875);
        missile.rotation = missileInfo.rotation;
        missile.id = missileInfo.id;
        self.missiles.add(missile);
    }

    addCrosshair(self, crosshairInfo) {
        const crosshair = self.add
            .sprite(crosshairInfo.mouseX, crosshairInfo.mouseY, "crosshair")
            .setScale(0.3);

        crosshair.id = crosshairInfo.id;
        self.crosshairs.add(crosshair);
    }

    addComet(self, cometInfo) {
        const comet = self.add
            .sprite(cometInfo.x, cometInfo.y, "comet")
            .setDisplaySize(32, 64);
        comet.rotation = cometInfo.rotation;
        comet.id = cometInfo.id;
        comet.play("cometMain");
        self.comets.add(comet);
    }

    displayLaser(self, center, dir, rot) {
        let tempLaser = self.add.sprite(center.x + 670 * dir.x, center.y + 670 * dir.y, 'laser').setDisplaySize(100, 1280).setDepth(5);
        tempLaser.play('laserFlux');
        tempLaser.rotation = rot;
        tempLaser.alpha = 1;
        var drawLoop = setInterval(() => {
            tempLaser.alpha -= 0.02;
            if (tempLaser.alpha <= 0.01) {
                tempLaser.destroy();
                clearInterval(drawLoop);
            }
        }, 16)
    }

    displayReloadBar(self, shipThatHasThisBar, positionX, reloadTime, newMaxMissiles) {
        const width = 120;
        const height = 16;
        const positionY = 708;

        shipThatHasThisBar.maxMissilesClientCopy = newMaxMissiles;

        //show the empty bar
        const reloadBarBase = self.add.sprite(positionX, positionY, 'reloadmeter').setDisplaySize(width, height).setTint(0xbb0000).setDepth(100);
        const reloadBarFront = self.add.sprite(positionX - (width * 0.5), positionY, 'reloadmeter').setDisplaySize(0, height).setTint(0x00ff00).setDepth(101);
        //update every frame until max missiles
        let timer = 0;
        let oldMaxMissiles = newMaxMissiles;
        var drawLoop = setInterval(() => {
            if (timer >= reloadTime || shipThatHasThisBar.maxMissilesClientCopy != oldMaxMissiles) {
                reloadBarBase.destroy();
                reloadBarFront.destroy();
                clearInterval(drawLoop);
            }
            else {
                let progress = timer / reloadTime;
                reloadBarFront.setPosition(positionX - (width * 0.5) + (progress * width * 0.5), positionY);
                reloadBarFront.setDisplaySize(progress * width, height);
                timer += 16;
            }
        }, 16);
    }

    displayMissileCount(self, somePlayer, newAmount, maxAmount, regenTime) {
        somePlayer.maxMissilesClientCopy = maxAmount;
        somePlayer.missileCountText.setText('' + newAmount + '/' + maxAmount);
    }

    makeUI(self) {
        const shopUIBackground = self.add.sprite(640, -40, 'shopbg').setDisplaySize(1280, 200).setTint(0xffffff).setDepth(100);
        self.shopUI.add(shopUIBackground);

        if (!self.spectate) {
            self.makeUIButtons(self);
        }
    }

    makeButtonClickBehavior(self, button, onClickFunction) {
        button.on('pointerover', () => {
            button.setTint(0xfcfcfc);
        })
            .on('pointerout', () => {
                button.setTint(0xcfcfcf);
            })
            .on('pointerdown', onClickFunction)
    }

    //this helper makes a button
    makeUIButtonHelper(self, name, text, upgradeType) {
        let xpos = self.shopUIButtonPlacerX;
        let ypos = self.shopUIButtonPlacerY;
        self.shopUIButtonPlacerX += 160;

        self[name + 'Text'] = self.add.text(xpos - 40, ypos - 25, text, { fontSize: '18px' }).setDepth(102);
        self[name] = self.add.image(xpos, ypos, 'button').setDepth(101).setScale(1.5).setTint(0xcfcfcf)
            .setInteractive();
        self.makeButtonClickBehavior(self, self[name], () => {
            self.socket.emit('attemptUpgrade', upgradeType);
        })
        self.shopUI.add(self[name]);
        self.shopUI.add(self[name + "Text"]);
    }

    makeUIHalfButtonHelper(self, name, text, consumableType) {
        let xpos = self.shopUIButtonPlacerX;
        let ypos = self.shopUIButtonPlacerY;
        if (ypos > -80) {
            self.shopUIButtonPlacerY = -85;
            self.shopUIButtonPlacerX += 130;
        }
        else {
            self.shopUIButtonPlacerY += 65;
        }

        self[name + 'Text'] = self.add.text(xpos - 55, ypos - 32, text, { fontSize: '16px' }).setDepth(102).setTint(0x202020);
        self[name] = self.add.image(xpos, ypos - 19, 'halfbutton').setDepth(101).setScale(1.25).setTint(0xcfcfcf)
            .setInteractive();
        self.makeButtonClickBehavior(self, self[name], () => {
            self.socket.emit('attemptBuyConsumable', consumableType);
        })
        self.shopUI.add(self[name]);
        self.shopUI.add(self[name + 'Text']);
    }

    makeUIButtons(self) {
        this.makeUIButtonHelper(
            self,
            "speedUpgrade",
            "Missile\nSpeed\n\n1000",
            "speed"
        );
        this.makeUIButtonHelper(
            self,
            "damageUpgrade",
            "Missile\nDamage\n\n1000",
            "damage"
        );
        this.makeUIButtonHelper(
            self,
            "radiusUpgrade",
            "Explosion\nRadius\n\n500",
            "radius"
        );
        this.makeUIButtonHelper(
            self,
            "regenUpgrade",
            "Ammo Regen\nSpeed\n\n500",
            "regenSpeed"
        );
        this.makeUIButtonHelper(
            self,
            "missileCountUpgrade",
            "Ammo\nCapacity\n\n800",
            "maxMissiles"
        );

        this.makeUIHalfButtonHelper(
            self,
            "laserConsumable",
            "Laser Shots\n1500",
            "laser"
        );

        //To add more half-buttons, just list them as follows, and they will appear in the shop at an appropriate place

        /*this.makeUIHalfButtonHelper(
            self,
            "laserConsumable",
            "Laser Shots\n1500",
            "laser"
        );

        this.makeUIHalfButtonHelper(
            self,
            "laserConsumable",
            "Laser Shots\n1500",
            "laser"
        );*/
    }
}

export default GameScene;
