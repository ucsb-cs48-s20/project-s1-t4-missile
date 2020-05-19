// import io from 'socket.io-client';

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: "gameScene" });
    }

    preload() {
        this.load.image('background', '/assets/background.png');
        this.load.image('stars', '/assets/background-stars.png');
        this.load.image('tankbody', '/assets/tankbody.png')
        this.load.spritesheet('tankbarrel', '/assets/tankbarrel.png', { frameWidth: 128, frameHeight: 128 })
        this.load.image('missile', '/assets/missile.png')
        this.load.image('comet', '/assets/comet.png')
        this.load.spritesheet('explosion', '/assets/explosion.png', { frameWidth: 16, frameHeight: 16 })
        this.load.image('base', '/assets/base.png')
        this.load.image('button', '/assets/button.png')
        this.load.image('reloadmeter', '/assets/reload-meter-tex.png')
        this.load.image('crosshair', '/assets/crosshairs.png')
        this.load.image('shopbg', '/assets/shop-ui-main.png')
    }

    create() {
        let self = this;

        //Load background
        this.add.image(640, 360, "background").setScale(5);
        this.add.image(640, 360, "stars").setScale(4);
        this.add.image(640, 820, "base").setScale(15);

        //Create animations
        this.anims.create({
            key: "explode",
            frameRate: 10,
            frames: this.anims.generateFrameNames("explosion", {
                start: 0,
                end: 4,
            }),
        });
        this.anims.create({
            key: "fire",
            frameRate: 15,
            frames: this.anims.generateFrameNames("tankbarrel", {
                start: 1,
                end: 7,
            }),
        });

        //Load socket
        this.socket = io('localhost:5000', {query: "purpose=game"});
        
        //Groups
        this.missiles = this.physics.add.group();
        this.comets = this.physics.add.group();
        this.otherPlayers = this.physics.add.group();
        this.otherTankbodys = this.physics.add.group();
        this.crosshairs = this.physics.add.group();
        this.shopUI = this.add.group();

        this.spectate = false;

        this.socket.on('spectate', () => {
            this.spectate = true;
            this.spectateText = this.add.text(50, 200, 'Spectating', { fontSize: '24px' });
        })
        
        this.makeUI(this);

        //Game variables
        this.shot = false;
        this.reloading = false;
        this.UIOut = false;
        this.UITweening = false;
        this.noMissilesLeft = false;

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
        })
        this.socket.on('currentPlayers', players => {
            Object.keys(players).forEach(id => {
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
        this.socket.on("newComet", (cometInfo) => {
            self.addComet(self, cometInfo);
        });

        //reload bar display. this event is recieved by all players including who shot it
        this.socket.on('missileReload', (id, reloadTime) => {
            if (id == self.playerId) {
                this.reloading = true;
                setTimeout(() => { this.reloading = false; }, reloadTime);
                self.displayReloadBar(self, this.ship.x, reloadTime);
            }
            else {
                self.otherPlayers.getChildren().forEach(otherPlayer => {
                    if (id == otherPlayer.playerId) {
                        self.displayReloadBar(self, otherPlayer.x, reloadTime);
                    }
                })
            }
        })

        //missile count display. somewhat similar to the missile reload.
        this.socket.on('missileCountChange', (id, newAmount, maxAmount, regenTime) => {
            if (id == self.playerId) {
                if (newAmount == 0){ this.noMissilesLeft = true; } else { this.noMissilesLeft = false; }
                self.displayMissileCount(self, self, newAmount, maxAmount, regenTime);
            }
            else {
                self.otherPlayers.getChildren().forEach(otherPlayer => {
                    if (id == otherPlayer.playerId) {
                        self.displayMissileCount(self, otherPlayer, newAmount, maxAmount, regenTime);
                    }
                })
            }
        })

        //Events where objects are destroyed
        this.socket.on("missileDestroyed", (missileId) => {
            self.missiles.getChildren().forEach((missile) => {
                if (missile.id == missileId) {
                    const explosion = this.add
                        .sprite(missile.x, missile.y, "explosion", 0)
                        .setScale(5);
                    explosion.play("explode");
                    // TODO: make explosion length animation reflect its duration
                    // TODO: make explosion size reflect its size
                    //explosion.anims.msPerFrame = 500;
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
            })
        });

        this.socket.on("cometDestroyed", (cometId) => {
            self.comets.getChildren().forEach((comet) => {
                if (comet.id == cometId) {
                    const explosion = this.add
                        .sprite(comet.x, comet.y, "explosion", 0)
                        .setScale(5);
                    explosion.play("explode");
                    // TODO: make explosion length animation reflect its duration
                    // TODO: make explosion size reflect its size
                    //explosion.anims.msPerFrame = 500;
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
                    otherPlayer.destroy();
                }
            });
            self.otherTankbodys.getChildren().forEach((otherTankbody) => {
                if (playerId === otherTankbody.playerId) {
                    otherTankbody.destroy();
                }
            })
        })
        this.socket.on('gameOver', data => {
            this.scene.start('endScene', data);
        })

        //Events where object states are updated
        this.socket.on("baseDamaged", (info) => {
            self.comets.getChildren().forEach((comet) => {
                if (comet.id == info[0]) {
                    this.healthText.setText(`${info[1]}`);
                    const explosion = this.add
                        .sprite(comet.x, comet.y, "explosion", 0)
                        .setScale(5);
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
                missile.setPosition(
                    serverMissiles[missile.id].x,
                    serverMissiles[missile.id].y
                );
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
            } else if(info[0] == "damage") {
                this.damageUpgradeText.setText(`Missile\nDamage\n\n${info[1]}`);
            } else if(info[0] == "radius") {
                this.radiusUpgradeText.setText(`Explosion\nRadius\n\n${info[1]}`);
            }else if(info[0] == "regenSpeed") {
                this.regenUpgradeText.setText(`Ammo Regen\nSpeed\n\n${info[1]}`);
            }else if(info[0] == "maxMissiles") {
                this.missileCountUpgradeText.setText(`Ammo\nCapacity\n\n${info[1]}`);
            }
        })
        this.socket.on('updateRound', round => {
            this.roundText.setText(`${round}`);
        })
    }

    update() {
        if (!this.spectate && this.ship) {
            //Mouse handling
            let pointer = this.input.activePointer;
            let mvtAngle = Math.atan2(
                pointer.y - this.ship.y,
                pointer.x - this.ship.x
            );
            if (mvtAngle > 0.0) {
                if (mvtAngle < Math.PI * 0.5) {
                    mvtAngle = 0.0;
                } else {
                    mvtAngle = Math.PI;
                }
            }

            //instant rotation change
            this.ship.rotation = mvtAngle + Math.PI * 0.5;
            this.socket.emit("rotationChange", this.ship.rotation);

            let UICutoffY = 120;

            //make the UI tray come out and go back in
            this.moveUI(pointer, UICutoffY);

            //Shot handling
            if (!this.shot && pointer.isDown && pointer.y >= UICutoffY && !this.reloading && !this.noMissilesLeft) {
                this.shot = true;
                this.ship.play("fire");
                this.socket.emit("missileShot", {
                    x: this.ship.x,
                    y: this.ship.y,
                    mouseX: pointer.x,
                    mouseY: pointer.y,
                    rotation: this.ship.rotation,
                });
            }

            if (!pointer.isDown) {
                this.shot = false;
            }
        }
    }

    //Function for UI tray movement
    moveUI(pointer, UICutoffY) {
        

        if (!this.UITweening) {
            if (pointer.y >= UICutoffY) {
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
            }
            else {
                if (!this.UIOut) {
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
            .sprite(playerInfo.x, playerInfo.y - 10, "tankbody")
            .setScale(1.25).setDepth(10);
    }
    
    addMissileCounter(self, somePlayer, playerInfo) {
        somePlayer.missileCountSprite = self.add.sprite(playerInfo.x - 45, 575, 'missile').setDisplaySize(20,30).setDepth(100);
        somePlayer.missileCountText = self.add.text(playerInfo.x - 15, 575, '' + playerInfo.missiles + '/' + playerInfo.maxMissiles, { fontSize: '24px' })
                                    .setTint(0xffffff).setDepth(100);
    }

    addPlayer(self, playerInfo) {
        self.addTankBody(self, playerInfo);
        self.ship = self.physics.add.sprite(playerInfo.x, playerInfo.y - 10, 'tankbarrel').setScale(1.25).setDepth(20);
        self.ship.setDrag(100); 
        self.ship.setAngularDrag(100);
        self.ship.setMaxVelocity(200); 
        self.playerId = playerInfo.playerId;
        self.addMissileCounter(self, self, playerInfo);
    }

    addOtherPlayers(self, playerInfo) {
        const otherTankbody = self.addTankBody(self, playerInfo);
        const otherPlayer = self.add
            .sprite(playerInfo.x, playerInfo.y - 10, "tankbarrel")
            .setScale(1.25).setDepth(20);
        otherPlayer.playerId = playerInfo.playerId;
        otherPlayer.rotation = playerInfo.rotation;
        self.addMissileCounter(self, otherPlayer, playerInfo);

        otherTankbody.playerId = playerInfo.playerId;
        self.otherPlayers.add(otherPlayer);
        self.otherTankbodys.add(otherTankbody);
        
    }

    addMissile(self, missileInfo) {
        const missile = self.add.sprite(
            missileInfo.x,
            missileInfo.y,
            "missile"
        ).setDepth(15);
        missile.rotation = missileInfo.rotation;
        missile.id = missileInfo.id;
        self.missiles.add(missile);
    }

    
    addCrosshair(self, crosshairInfo) {
          const crosshair = self.add
          .sprite(crosshairInfo.mouseX, crosshairInfo.mouseY, "crosshair")
          .setScale(0.05);
          
          crosshair.id = crosshairInfo.id;
          self.crosshairs.add(crosshair);
    }

    addComet(self, cometInfo) {
        const comet = self.add
            .sprite(cometInfo.x, cometInfo.y, "comet")
            .setDisplaySize(23, 60);
        comet.rotation = cometInfo.rotation;
        comet.id = cometInfo.id;
        self.comets.add(comet);
    }

    displayReloadBar(self, positionX, reloadTime) {
        const width = 120;
        const height = 16;
        const positionY = 708;
        
        //show the empty bar
        const reloadBarBase = self.add.sprite(positionX, positionY, 'reloadmeter').setDisplaySize(width, height).setTint(0xbb0000).setDepth(100);
        const reloadBarFront = self.add.sprite(positionX - (width*0.5), positionY, 'reloadmeter').setDisplaySize(0, height).setTint(0x00ff00).setDepth(101);
        //update every frame until it's full
        let timer = 0;
        var drawLoop = setInterval(() => {
            if (timer >= reloadTime){
                reloadBarBase.destroy();
                reloadBarFront.destroy();
                clearInterval(drawLoop);
            }
            else
            {
                let progress = timer/reloadTime;
                reloadBarFront.setPosition(positionX - (width*0.5) + (progress*width*0.5), positionY);
                reloadBarFront.setDisplaySize(progress*width, height);
                timer += 16;
            }
        }, 16);

    }

    displayMissileCount(self, somePlayer, newAmount, maxAmount, regenTime) {
        somePlayer.missileCountText.setText('' + newAmount + '/' + maxAmount);
    }

    makeUI(self) {
        const shopUIBackground = self.add.sprite(640,-40, 'shopbg').setDisplaySize(1280,200).setTint(0xffffff).setDepth(100);
        self.shopUI.add(shopUIBackground);

        if(!self.spectate) {
            self.makeUIButtons(self);
        }
        
    }

    //this helper makes a button
    makeUIButtonHelper(self, name, xpos, text, upgradeType){
        self[name + 'Text'] = self.add.text(xpos-40, -110, text, { fontSize: '18px' }).setDepth(102);
        self[name] = self.add.image(xpos, -85, 'button').setDepth(101).setScale(1.5).setTint(0xcfcfcf)
            .setInteractive();
        self[name].on('pointerover', () => {
                self[name].setTint(0xfcfcfc);
            })
            .on('pointerout', () => {
                self[name].setTint(0xcfcfcf);
            })  
            .on('pointerdown', () => {
                self.socket.emit('attemptUpgrade', upgradeType);
            })
        self.shopUI.add(self[name]);
        self.shopUI.add(self[name + 'Text']);
    }

    makeUIButtons(self) {
        this.makeUIButtonHelper(self, 'speedUpgrade', 80, 'Missile\nSpeed\n\n1000', 'speed');
        this.makeUIButtonHelper(self, 'damageUpgrade', 240, 'Missile\nDamage\n\n1000', 'damage');
        this.makeUIButtonHelper(self, 'radiusUpgrade', 400, 'Explosion\nRadius\n\n500', 'radius');
        this.makeUIButtonHelper(self, 'regenUpgrade', 560, 'Ammo Regen\nSpeed\n\n500', 'regenSpeed');
        this.makeUIButtonHelper(self, 'missileCountUpgrade', 720, 'Ammo\nCapacity\n\n800', 'maxMissiles');
    }
}

export default GameScene;
