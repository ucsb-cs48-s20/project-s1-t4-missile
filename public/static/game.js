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
    this.load.image('missile', '/assets/missile.png')
}

function create() {
    let self = this;
    this.socket = io();
    this.missiles = this.physics.add.group();
    this.otherPlayers = this.physics.add.group(); //Create group to manage other players, makes collision way easier
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
    this.socket.on('missileDestroyed', missileId => {
        self.missiles.getChildren().forEach(missile => {
            if(missile.id = missileId) {
                missile.destroy();
            }
        })
    })
    this.socket.on('missileUpdate', serverMissiles => {
        self.missiles.getChildren().forEach(missile => {
            console.log(serverMissiles[missile.id]);
            missile.setPosition(serverMissiles[missile.id].x, serverMissiles[missile.id].y);
        })
    })
    this.socket.on('disconnect', function (playerId) {
        self.otherPlayers.getChildren().forEach(function (otherPlayer) { //getChildren() returns all members of a group in an array
            if (playerId === otherPlayer.playerId) { //Removes the game object from the game
                otherPlayer.destroy();
            }
        })
    })
}


function update() {
    if (this.ship) {
        let pointer = this.input.activePointer;

        let mvtAngle = Math.atan2(pointer.y - this.ship.y, pointer.x - this.ship.x);
        let diffAngle = mvtAngle - (this.ship.rotation - Math.PI*0.5);
        if (diffAngle > Math.PI){
            diffAngle -= Math.PI*2.0;
        }
        if (diffAngle < -Math.PI){
            diffAngle += Math.PI*2.0;
        }
        this.ship.setAngularVelocity(600*diffAngle);
        if(pointer.isDown) {
            console.log("Missile fired");
            this.socket.emit('missileShot', {
                x: this.ship.x,
                y: this.ship.y,
                rotation: this.ship.rotation,
                speedX: -1 * Math.cos(this.ship.rotation + Math.PI / 2) * 20,
                speedY: -1 * Math.sin(this.ship.rotation + Math.PI / 2) * 20
            })
        }
        
    }
}

function addPlayer(self, playerInfo) {
    //adds the ship w/ arcade physics
    self.ship = self.physics.add.image(playerInfo.x, playerInfo.y, 'ship').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
    if (playerInfo.team === 'blue') {
        self.ship.setTint(0x0000ff);
    } else {
        self.ship.setTint(0xff0000);
    }
    self.ship.setDrag(100); //resistance the object will face when moving
    self.ship.setAngularDrag(100);
    self.ship.setMaxVelocity(200); //max speed
}

function addOtherPlayers(self, playerInfo) {
    const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'otherPlayer').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
    if (playerInfo.team === 'blue') {
        otherPlayer.setTint(0x0000ff);
    } else {
        otherPlayer.setTint(0xff0000);
    }
    otherPlayer.playerId = playerInfo.playerId;
    self.otherPlayers.add(otherPlayer); //adds the player to the list
}

function addMissile(self, missileInfo) {
    const missile = self.add.sprite(missileInfo.x, missileInfo.y, 'missile');
    missile.angle = missileInfo.rotation;
    missile.id = missileInfo.id;
    console.log("Missile " + missile.id + " added client-side");
    self.missiles.add(missile);
}
