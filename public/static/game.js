let config = {
    type: Phaser.AUTO, //chooses the render type (WebGL or Canvas, if browser supports WebGL will use WebGL, otherwise Canvas)
    parent: 'phaser-example', //renders the game in an existing <canvas> element with 'phaser-example' if it exists, otherwise creates it
    width: 800, //screen width/height
    height: 600,
    physics: {
        default: 'arcade', //Phaser stuff
        arcade: {
            debug: false,
            gravity: { y: 0 } //0 gravity
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

let game = new Phaser.Game(config);

function preload() {
    this.load.image('ship', '/assets/spaceShips_001.png')
    this.load.image('otherPlayer', 'assets/enemyBlack5.png')
    this.load.image('tankbody','assets/tank_body.png')
    this.load.image('tankbarrel','assets/tank_barrel.png')
    this.load.image('missile', '/assets/missile.png')
    this.load.image('comet', '/assets/asteroid-edited.png')
    this.load.spritesheet('explosion', '/assets/explosion.png', {frameWidth: 16, frameHeight: 16 })
}

function create() {
    let self = this;
    this.socket = io();
    this.shot = false;
    this.missiles = this.physics.add.group();
    this.comets = this.physics.add.group();
    this.otherPlayers = this.physics.add.group(); //Create group to manage other players, makes collision way easier
    this.otherTankbodys = this.physics.add.group();
    this.anims.create({
        key: 'explode',
        frameRate: 10,
        frames: this.anims.generateFrameNames('explosion', {start: 0, end: 4})
    })
    this.socket.on('currentPlayers', function (players) { //Listens for currentPlayers event, executes function when triggered
        //Creates an array from the players object that was passed in from the event in server.js
        Object.keys(players).forEach(function (id) {
            if (players[id].playerId === self.socket.id) {
                addPlayer(self, players[id]); //pass current player info and reference to current scene
            } else {
                addOtherPlayers(self, players[id]);
            }
        })
    })
    this.socket.on('newPlayer', function (playerInfo) {
        addOtherPlayers(self, playerInfo); //adds new player to the game
    })
    this.socket.on('newMissile', function(missileInfo) {
        addMissile(self, missileInfo);
    })
    this.socket.on('newComet', cometInfo => {
        addComet(self, cometInfo);
    })
    this.socket.on('missileDestroyed', missileId => {
        self.missiles.getChildren().forEach(missile => {
            if(missile.id == missileId) {
                const explosion = this.add.sprite(missile.x, missile.y, 'explosion', 0).setScale(5);
                explosion.play('explode');
                explosion.once(Phaser.Animations.Events.SPRITE_ANIMATION_COMPLETE, () => { explosion.destroy() })
                missile.destroy();
            }
        })
    })
    this.socket.on('cometDestroyed', cometId => {
        self.comets.getChildren().forEach(comet => {
            if(comet.id == cometId) {
                comet.destroy();
            }
        })
    })
    this.socket.on('missileUpdate', serverMissiles => {
        self.missiles.getChildren().forEach(missile => {
            missile.setPosition(serverMissiles[missile.id].x, serverMissiles[missile.id].y);
        })
    })
    this.socket.on('cometUpdate', serverComets => {
        self.comets.getChildren().forEach(comet => {
            if(serverComets[comet.id] != undefined) {
                comet.setPosition(serverComets[comet.id].x, serverComets[comet.id].y);
            }
        })
    })
    this.socket.on('playerMoved', playerInfo => {
        self.otherPlayers.getChildren().forEach(otherPlayer => {
            if(playerInfo.playerId === otherPlayer.playerId) {
                otherPlayer.setRotation(playerInfo.rotation);
            }
        })
    })
    this.socket.on('disconnect', function (playerId) {
        self.otherPlayers.getChildren().forEach(function (otherPlayer) { //getChildren() returns all members of a group in an array
            if (playerId === otherPlayer.playerId) { //Removes the game object from the game
                otherPlayer.destroy();
            }
        })

        self.otherTankbodys.getChildren().forEach(function (otherTankbody) {
            if (playerId === otherTankbody.playerId) {
                otherTankbody.destroy();
            }
        })
    })
}


function update() {
    if (this.ship) {
        let pointer = this.input.activePointer;
        let mvtAngle = Math.atan2(pointer.y - this.ship.y, pointer.x - this.ship.x);
        
        if (mvtAngle > 0.0) { //don't aim below the ground!
            if (mvtAngle < Math.PI*0.5){ //right side but below the ground
                mvtAngle = 0.0;
            }
            else { //left side below the ground
                mvtAngle = Math.PI;
            }
        }
      
        let diffAngle = mvtAngle - (this.ship.rotation - Math.PI*0.5);

        if (diffAngle > Math.PI){
            diffAngle -= Math.PI*2.0;
        }
        if (diffAngle < -Math.PI){
            diffAngle += Math.PI*2.0;
        }
        this.ship.setAngularVelocity(600*diffAngle);
        this.socket.emit('rotationChange', this.ship.rotation);

        if(!this.shot && pointer.isDown) {
            this.shot = true;
            this.socket.emit('missileShot', {
                x: this.ship.x,
                y: this.ship.y,
                rotation: this.ship.rotation,
                speedX: -1 * Math.cos(this.ship.rotation + Math.PI / 2) * 20,
                speedY: -1 * Math.sin(this.ship.rotation + Math.PI / 2) * 20,
                dmg: 1,
                radius: 75
            })
        }

        if(!pointer.isDown) {
            this.shot = false;
        }
        
    }
}

function addTankBody(self, playerInfo) {
    return self.add.sprite(playerInfo.x, playerInfo.y+30, 'tankbody').setOrigin(0.5,0.5).setDisplaySize(103,90);
}

function addPlayer(self, playerInfo) {
    //adds the ship w/ arcade physics
    self.ship = self.physics.add.image(playerInfo.x, playerInfo.y, 'tankbarrel').setOrigin(0.5, 1.0).setDisplaySize(23, 60);
    
    addTankBody(self, playerInfo);
    self.ship.setDrag(100); //resistance the object will face when moving
    self.ship.setAngularDrag(100);
    self.ship.setMaxVelocity(200); //max speed
}

function addOtherPlayers(self, playerInfo) {
    const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'tankbarrel').setOrigin(0.5, 1.0).setDisplaySize(23, 60);
    const otherTankbody = addTankBody(self, playerInfo);
    otherPlayer.playerId = playerInfo.playerId;
    otherTankbody.playerId = playerInfo.playerId;
    self.otherPlayers.add(otherPlayer); //adds the player to the list
    self.otherTankbodys.add(otherTankbody); //add their tank body to be deleted appropriately
}

function addMissile(self, missileInfo) {
    const missile = self.add.sprite(missileInfo.x, missileInfo.y, 'missile');
    missile.rotation = missileInfo.rotation;
    missile.id = missileInfo.id;
    self.missiles.add(missile);
}

function addComet(self, cometInfo) {
    const comet = self.add.sprite(cometInfo.x, cometInfo.y, 'comet').setDisplaySize(23, 60);
    comet.rotation = cometInfo.rotation;
    comet.id = cometInfo.id;
    self.comets.add(comet);
}
