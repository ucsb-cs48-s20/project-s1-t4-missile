//Server setup
const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server)
const next = require('next');
const cors = require('cors');
const dev = process.env.NODE_ENV
const nextApp = next({ dev });
const nextHandler = nextApp.getRequestHandler();
const PORT = process.env.PORT || 3000;

const { addUser, removeUser, getUser } = require('./utils/chatUsers.js');
const { distance } = require('./utils/serverCalculations.js');

nextApp.prepare().then(() => {
    app.get('*', (req, res) => {
        return nextHandler(req, res)
    })

    server.listen(PORT, (err) => {
        if (err) throw err
        console.log(`> Ready on port ${PORT}`);
    })
})

app.use(cors())

//Game variables
let round = 1;
let numComets = 0;
let baseHealth = 50;
let missileId = 0;
let timer = 60;
let roundOver = false;
let score = 0;

let reloadSpeed = 0.5;
let numMissiles = 2;
let laserDamage = 4;

let gameState = 'lobby';

//Variables that change with rounds
let cometLimit = 10;
let cometRate = 1500;
let cometHealth = 1;
let cometSpeed = 2.5;

//Object storage
let players = {};
let playerSlots = {
    p1: undefined,
    p2: undefined,
    p3: undefined,
    p4: undefined
}
let users = {};
let missiles = {};
let comets = {};
let explosions = {};

for (let i = 0; i < cometLimit; i++) {
    comets[i] = undefined;
}

io.on('connect', socket => {
    console.log(socket.handshake.query.purpose);
    if (socket.handshake.query.purpose === "game") {
        console.log(`${socket.id} connected`);
        console.log(gameState);

        users[socket.id] = 'spectator';

        if (gameState == 'lobby') {
            io.emit('initUsers', users);
        } else if (gameState == 'game') {
            setTimeout(() => { socket.emit('inProgress') }, 500);
        } else {
            setTimeout(() => { socket.emit('gameFinished') }, 500);
        }

        socket.on('joinInProgress', () => {
            socket.emit('switchStart');
            socket.broadcast.emit('newPlayer', players[socket.id]);
        })

        socket.on('startGame', () => {
            if (users[socket.id] == 'player') {
                gameState = 'game';
                io.emit('switchStart');
            }
        })

        socket.on('requestInitialize', () => {
            initializeGame(socket.id);
        })

        socket.on('returnToLobby', () => {
            gameState = 'lobby';
            io.emit('switchLobby');
            io.emit('restart');
        })

        socket.on('requestUsers', () => {
            socket.emit('initUsers', users);
        })

        //Handles client inputs
        socket.on('attemptSwitchRole', () => {
            if (users[socket.id] == 'player') {
                users[socket.id] = 'spectator';
                delete players[socket.id];
                for (let i = 0; i < 4; i++) {
                    if (playerSlots[i] == socket.id) {
                        playerSlots[i] = undefined;
                    }
                }
                io.emit('initUsers', users);
            } else {
                let nextSlot = getNextSlot();
                if (nextSlot != -1) {
                    users[socket.id] = 'player';
                    playerSlots[nextSlot] = socket.id;
                    players[socket.id] = {
                        rotation: 0,
                        x: 160 + 320 * nextSlot,
                        y: 670,
                        playerId: socket.id,
                        credits: 0,
                        kills: 0,
                        damage: 1,
                        radius: 60,
                        missiles: 2,
                        maxMissiles: 2,
                        rechargingMissiles: false,
                        regenSpeed: 0.4,

                        specialAttack: "none",
                        specialAttackAmmo: 0,

                        debugging: false,
                        speed: 10,
                    };
                    io.emit('initUsers', users);
                }
            }
        })
        socket.on('missileShot', missileData => {
            let thisPlayer = players[socket.id];
            if (thisPlayer.missiles > 0) {
                missileData["id"] = missileId;
                missiles[missileId] = missileData;
                missiles[missileId].startX = missiles[missileId].x
                missiles[missileId].startY = missiles[missileId].y
                missiles[missileId].speedX = -1 * Math.cos(missileData.rotation + Math.PI / 2) * players[socket.id].speed;
                missiles[missileId].speedY = -1 * Math.sin(missileData.rotation + Math.PI / 2) * players[socket.id].speed;
                missiles[missileId].dmg = players[socket.id].damage;
                missiles[missileId].radius = players[socket.id].radius;
                missiles[missileId].playerId = socket.id;

                if (missileId > 1000) {
                    missileId = 0;
                } else {
                    missileId++;
                }
                io.emit('newMissile', missiles[missileId - 1]);
                io.emit('newCrosshair', missiles[missileId - 1]);
                socket.broadcast.emit('missileFired', socket.id);

                //change number of missiles
                let displayBar = false;
                if (thisPlayer.missiles == thisPlayer.maxMissiles) { displayBar = true; }
                thisPlayer.missiles--;
                let regenMs = (1.0 / thisPlayer.regenSpeed) * 1000;
                io.emit('missileCountChange', socket.id, thisPlayer.missiles, thisPlayer.maxMissiles, regenMs, displayBar);
                giveBulletsUntilMax(socket.id, thisPlayer, regenMs);
            }
        })
        socket.on('rotationChange', rotation => {
            if (players[socket.id] != undefined) {
                players[socket.id].rotation = rotation;
                socket.broadcast.emit('playerMoved', players[socket.id]);
            }
        })
        socket.on('attemptUpgrade', upgrade => {
            if (upgrade == 'speed') {
                let cost = 1000 + (players[socket.id].speed - 10) * 100;
                attemptUpgrade(socket.id, upgrade, 1, cost, 100);
            } else if (upgrade == 'damage') {
                let cost = 900 + (players[socket.id].damage * 100);
                attemptUpgrade(socket.id, upgrade, 1, cost, 100);
            } else if (upgrade == 'radius') {
                let cost = 500 + ((players[socket.id].radius - 60) / 10) * 100;
                attemptUpgrade(socket.id, upgrade, 10, cost, 100);
            } else if (upgrade == 'regenSpeed') {
                let cost = 100 + Math.round(1000 * players[socket.id].regenSpeed);
                if (attemptUpgrade(socket.id, upgrade, 0.1, cost, 100)) {
                    io.to(socket.id).emit('regenSpeedChange', players[socket.id].regenSpeed);
                }
            } else if (upgrade == 'maxMissiles') {
                let cost = 400 * players[socket.id].maxMissiles;
                let upgradeDone = attemptUpgrade(socket.id, upgrade, 1, cost, 400); // doing extra display/reload stuff when succeed
                if (upgradeDone) {
                    let regenMs = (1.0 / players[socket.id].regenSpeed) * 1000;
                    io.emit('missileCountChange', socket.id, players[socket.id].missiles, players[socket.id].maxMissiles, regenMs, true);
                    players[socket.id].rechargingMissiles = false;
                    giveBulletsUntilMax(socket.id, players[socket.id], regenMs);
                }
            }
        });

        socket.on('attemptBuyConsumable', consumableName => {
            if (consumableName == 'laser') {
                let bought = attemptBuyConsumable(socket.id, consumableName, 1500);
                if (bought) {
                    players[socket.id].specialAttackAmmo = 3;
                }
            }
        })

        socket.on('specialShot', () => {
            let myPlayer = players[socket.id];
            if (myPlayer.specialAttack == "none") { return; }
            else if (myPlayer.specialAttack == "laser") {
                io.emit('updateSpecialAttack', socket.id, 'laser', 0x555555 * (myPlayer.specialAttackAmmo - 1));
                fireLaser(socket.id);
            }


            myPlayer.specialAttackAmmo -= 1;
            if (myPlayer.specialAttackAmmo <= 0) {
                myPlayer.specialAttack = "none";
                io.emit('updateSpecialAttack', socket.id, 'none', 0x000000);
            }
        })

        socket.on('enterDebug', () => {
            if (!players[socket.id].debugging) {
                console.log(`${socket.id} entered debug mode`);
                players[socket.id].debugging = true;
                socket.emit('debug', {
                    'regenSpeed': players[socket.id].regenSpeed,
                    'maxMissiles': players[socket.id].maxMissiles,
                    'cometLimit': cometLimit,
                    'cometRate': cometRate,
                    'cometHealth': cometHealth,
                    'cometSpeed': cometSpeed,
                    'credits': players[socket.id].credits
                });
            }
        })
        socket.on('changeCometSpeed', increment => {
            cometSpeed += increment;
            io.to(socket.id).emit('cometSpeedChange', cometSpeed);
        })
        socket.on('changeRound', () => {
            round++;
            io.emit('updateRound', round);
            increaseDifficulty();
        })
        socket.on('changeBaseHealth', increment => {
            baseHealth += increment;
            io.emit('baseHealthChange', baseHealth);
        })
        socket.on('changeTimer', increment => {
            timer += increment;
            io.emit('timerUpdate', timer);
        })
        socket.on('changeCredits', increment => {
            players[socket.id].credits += increment;
            io.to(socket.id).emit('updateCredits', players[socket.id].credits);
        })
        socket.on('changeMaxMissiles', increment => {
            players[socket.id].maxMissiles += increment;
            let regenMs = (1.0 / players[socket.id].regenSpeed) * 1000;
            io.emit('missileCountChange', socket.id, players[socket.id].missiles, players[socket.id].maxMissiles, regenMs, true);
            players[socket.id].rechargingMissiles = false;
            giveBulletsUntilMax(socket.id, players[socket.id], regenMs);
        })
        socket.on('changeRegenSpeed', increment => {
            players[socket.id].regenSpeed += increment;
            io.to(socket.id).emit('regenSpeedChange', players[socket.id].regenSpeed);
        })
        socket.on('changeCometLimit', increment => {
            cometLimit += increment;
            io.to(socket.id).emit('cometLimitChange', cometLimit);
        })
        socket.on('changeCometRate', increment => {
            cometRate += increment;
            io.to(socket.id).emit('cometRateChange', cometRate);
        })
        socket.on('changeCometHealth', increment => {
            cometHealth += increment;
            io.to(socket.id).emit('cometHealthChange', cometHealth);
        })

        //Destroys objects on server & clients
        socket.on('disconnect', () => {
            console.log(`${socket.id} disconnected`)
            if (users[socket.id] == 'player') {
                delete players[socket.id];
                removeFromSlot(socket.id);
            }
            delete users[socket.id];
            io.emit('disconnect', socket.id);
        })
    } else {

        console.log(`Chat socket ${socket.id} connected`)

        let defaultName = `${socket.id}`

        //Handles the chat stuff
        socket.on('disconnect', () => {
            console.log('User has left!');
            const user = removeUser(socket.id);

            if (user) {
                io.to(user.room).emit('message', { user: 'admin', text: `${user.name} has left.` });
            }

            socket.disconnect();
        })

        socket.on('join', (obj, callback) => {
            const { error, user } = addUser({ id: socket.id, name: defaultName, room: 'Room' });
            console.log(`Adding ${obj.name} to room ${user.room}`);

            if (error) {
                return (callback(error));
            }

            socket.emit('message', { user: 'admin', text: `${user.name}, welcome to the room!` });
            socket.emit('defaultName', { name: `${defaultName}` });
            socket.broadcast.to(user.room).emit('message', { user: 'admin', text: `${user.name} has joined the room.` });
            socket.join(user.room);

            callback();
        });

        socket.on('sendMessage', (message, callback) => {
            const user = getUser(socket.id);

            io.to(user.room).emit('message', { user: user.name, text: message });
            callback();
        });

    }
})

//Helper functions
function getNextSlot() {
    for (i = 0; i < 4; i += 1) {
        if (playerSlots[i] == undefined) { return i; }
    }
    return -1;
}

function removeFromSlot(id) {
    Object.keys(playerSlots).forEach(player => {
        if (playerSlots[player] == id) {
            playerSlots[player] = undefined;
            return;
        }
    })
    return;
}

function getNumPlayers() {
    return Object.keys(players).length;
}

function attemptUpgrade(socketID, upgradeName, upgradeIncrement, cost, costIncrement) {
    if (players[socketID].credits >= cost) {
        players[socketID][upgradeName] += upgradeIncrement;
        players[socketID].credits -= cost;
        io.to(socketID).emit('updateCredits', players[socketID].credits);
        io.to(socketID).emit('updateCost', [upgradeName, cost + costIncrement]);
        return true;
    }

    return false;
}

function attemptBuyConsumable(socketID, consumableName, cost) {
    if (players[socketID].credits >= cost) {
        players[socketID].credits -= cost;
        players[socketID].specialAttack = consumableName;
        io.to(socketID).emit('updateCredits', players[socketID].credits);
        io.emit('updateSpecialAttack', socketID, consumableName, 0xffffff);
        return true;
    }

    return false;
}

function initializeGame(socketId) {
    io.to(socketId).emit('initComets', comets);
    io.to(socketId).emit('initHealth', baseHealth);
    io.to(socketId).emit('initTimer', timer);
    io.to(socketId).emit('initScore', score);
    io.to(socketId).emit('initRound', round);
    if (users[socketId] != 'spectator') {
        io.to(socketId).emit('initCredits', 0);
    } else {
        io.to(socketId).emit('spectate');
    }
    io.to(socketId).emit('currentPlayers', players);
}

// give the player missiles until they have their max amount. 
function giveBulletsUntilMax(socketId, player, regenMs) {
    let oldMissilesMax = player.maxMissiles;
    if (!player.rechargingMissiles) {
        player.rechargingMissiles = true;
        setTimeout(() => {
            //giveBulletsUntilMax is called again when missile number is upgraded. this is why i'm checking it after the timeout
            if (oldMissilesMax != player.maxMissiles) { return; }

            player.missiles++;
            let displayBar = false;
            if (player.missiles < player.maxMissiles) { displayBar = true; }
            io.emit('missileCountChange', socketId, player.missiles, player.maxMissiles, regenMs, displayBar);
            if (player.missiles >= player.maxMissiles) {
                player.missiles = player.maxMissiles;
                player.rechargingMissiles = false;
            }
            else //why is this part weird? because we want the player to see the decrease immediately, when upgrading regen speed.
            {
                player.rechargingMissiles = false;
                giveBulletsUntilMax(socketId, player, (1.0 / player.regenSpeed) * 1000);
            }
        }, regenMs);
    }
}

//Update functions
function updateProjectiles() {
    if (gameState == 'game') {
        updateMissiles();
        updateComets();
        detectCollisions();
        explosionDamage();
    }
}

function updateMissiles() {
    if (gameState == 'game') {
        Object.keys(missiles).forEach(id => {
            missiles[id].x = missiles[id].x + missiles[id].speedX;
            missiles[id].y = missiles[id].y + missiles[id].speedY;

            let travelDist = distance(missiles[id].x, missiles[id].y, missiles[id].startX, missiles[id].startY);
            let targetDist = distance(missiles[id].mouseX, missiles[id].mouseY, missiles[id].startX, missiles[id].startY);
            let isAtTarget = missiles[id].x >= missiles[id].mouseX - 10 && missiles[id].x <= missiles[id].mouseX + 10 && missiles[id].y >= missiles[id].mouseY - 10 && missiles[id].y <= missiles[id].mouseY + 10
            if (isAtTarget || travelDist >= targetDist) {
                // create explosion on missile destroy
                explosionLocation = [missiles[id].x, missiles[id].y]
                // handles the special situation where the missile is travelling too fast and is never detected inside the explosion zone
                if (travelDist > targetDist && !isAtTarget) {
                    explosionLocation[0] = missiles[id].mouseX
                    // use the target y-location only if it is above the base
                    if (missiles[id].mouseY <= missiles[id].startY) {
                        explosionLocation[1] = missiles[id].mouseY
                    }
                }

                explosions[id] = {
                    x: explosionLocation[0],
                    y: explosionLocation[1],
                    id: id,
                    dmg: missiles[id].dmg,
                    radius: missiles[id].radius,
                    currentRadius: 0,
                    playerId: missiles[id].playerId,
                    durationLimit: 40,
                    startTick: 0
                }

                let time = explosions[id].durationLimit + 5;
                let size = missiles[id].radius;

                delete missiles[id];
                io.emit('missileDestroyed', id, size, time);
                io.emit('crosshairDestroyed', id);
            } else if (missiles[id].x < -10 || missiles[id].x > 1290 || missiles[id].y < -10 || missiles[id].y > 730) {
                // deletes missiles if they happen to fly off screen
                delete missiles[id];
                io.emit('missileDestroyed', id);
                io.emit('crosshairDestroyed', id);
            }
        })
        io.emit('missileUpdate', missiles);
    }
}

function updateComets() {
    if (gameState == 'game') {
        Object.keys(comets).forEach(id => {
            if (comets[id] != undefined) {
                comets[id].x = comets[id].x + comets[id].speedX;
                comets[id].y = comets[id].y + comets[id].speedY;
            }
        })
        io.emit('cometUpdate', comets);
    }
}

function detectCollisions() {
    if (gameState == 'game') {
        Object.keys(comets).forEach(cometId => {
            if (comets[cometId] != undefined) {
                if (comets[cometId].y >= 600) {
                    numComets--;
                    baseHealth -= comets[cometId].hp;
                    comets[cometId] = undefined;
                    if (baseHealth > 0) {
                        io.emit('baseDamaged', [cometId, baseHealth]);
                    } else {
                        kills = [];
                        Object.keys(players).forEach(playerId => {
                            kills.push(players[playerId].kills)
                        })
                        io.emit('gameOver', { 'round': round, 'score': score, 'kills': kills });
                        io.emit('gameFinished');
                        clearGame();
                    }
                }
            }
        })
    }
}

function fireLaser(socketID) {
    let myPlayer = players[socketID];

    //unit vector of the laser direction
    let laserDir = {
        "x": Math.sin(myPlayer.rotation),
        "y": -Math.cos(myPlayer.rotation)
    };

    io.emit('laserFired', {
        "x": myPlayer.x,
        "y": myPlayer.y
    },
        laserDir, myPlayer.rotation);

    Object.keys(comets).forEach(cometId => {
        if (comets[cometId] == undefined) { return; }
        let thisComet = comets[cometId];
        //it's time for some crappy linear algebra. it finds the distance from the line of the laser.
        let localPos = {
            "x": thisComet.x - myPlayer.x,
            "y": thisComet.y - myPlayer.y
        };

        let projectionLength = (localPos.x * laserDir.x) + (localPos.y * laserDir.y);
        let projection = {
            "x": projectionLength * laserDir.x,
            "y": projectionLength * laserDir.y
        };
        let orthogonalPart = {
            "x": localPos.x - projection.x,
            "y": localPos.y - projection.y
        };
        let squareDistFromLaser = (orthogonalPart.x * orthogonalPart.x) + (orthogonalPart.y * orthogonalPart.y); // not using square root probably saves time
        if (squareDistFromLaser < 10000) { // 100 * 100
            thisComet.hp -= laserDamage;
            if (thisComet.hp <= 0) {
                destroyComet(cometId, socketID);
            }
        }
    })
}

function destroyComet(cometId, awardPlayerSocketID) {
    if (players[awardPlayerSocketID] != undefined) {
        players[awardPlayerSocketID].credits += comets[cometId].credits;
        players[awardPlayerSocketID].kills += 1;
        io.to(awardPlayerSocketID).emit('updateCredits', players[awardPlayerSocketID].credits);
    }

    score += comets[cometId].credits;
    io.emit('updateScore', score);
    numComets--;

    explosions[cometId + 'comet'] = {
        x: comets[cometId].x,
        y: comets[cometId].y,
        id: cometId + 'comet',
        dmg: comets[cometId].dmg,
        radius: comets[cometId].radius,
        currentRadius: 0,
        playerId: awardPlayerSocketID,
        durationLimit: comets[cometId].durationLimit,
        startTick: 0
    }

    let size = comets[cometId].radius;
    let time = comets[cometId].durationLimit + 5;

    comets[cometId] = undefined;
    io.emit('cometDestroyed', cometId, size, time);
}

function explosionDamage() {
    if (gameState == 'game') {
        Object.keys(explosions).forEach(explosionId => {
            Object.keys(comets).forEach(cometId => {
                if (comets[cometId] != undefined && explosions[explosionId] != undefined) {
                    let dist = Math.sqrt(Math.pow(comets[cometId].x - explosions[explosionId].x, 2) + Math.pow(comets[cometId].y - explosions[explosionId].y, 2));
                    // TODO: make explosion animation sprite reflect its radius
                    if (dist < explosions[explosionId].currentRadius && !(explosionId in comets[cometId])) {
                        comets[cometId].hp -= explosions[explosionId].dmg;
                        comets[cometId][explosionId] = true;
                        if (comets[cometId].hp <= 0 || comets[cometId].x < -10 || comets[cometId].x > 1290 || comets[cometId].y < -10 || comets[cometId].y > 730) {
                            destroyComet(cometId, explosions[explosionId].playerId);
                        }
                    }
                }
            })

            // explosion duration
            // delete explosion if it lasts more than its duration
            explosions[explosionId].startTick++;

            if (explosions[explosionId].currentRadius < explosions[explosionId].radius) {
                let increment = explosions[explosionId].radius / explosions[explosionId].durationLimit;
                explosions[explosionId].currentRadius += increment;
            }

            // explosions last 5 ticks after they reach their max size
            if (explosions[explosionId].startTick > explosions[explosionId].durationLimit + 5) {
                delete explosions[explosionId];
            }
        })
    }
}

function increaseDifficulty() {
    cometLimit += 10;
    if (cometRate >= 750) {
        cometRate -= 250;
    }
    if (round % 3 == 0) {
        cometHealth++;
    }
    if (round % 2 == 0) {
        cometSpeed += 0.5;
    }
    io.emit('cometLimitChange', cometLimit);
    io.emit('cometRateChange', cometRate);
    io.emit('cometHealthChange', cometHealth);
    io.emit('cometSpeedChange', cometSpeed);
}

function clearGame() {
    gameState = 'end';
    Object.keys(missiles).forEach(missileId => {
        delete missiles[missileId];
    })
    Object.keys(comets).forEach(cometId => {
        delete comets[cometId];
    })
    Object.keys(explosions).forEach(explosionId => {
        delete explosions[explosionId];
    })
    numComets = 0;
    baseHealth = 50;
    missileId = 0;
    timer = 60;
    round = 1;
    cometLimit = 10;
    cometRate = 1500;
    cometHealth = 1;
    cometSpeed = 2.5;
    score = 0;
    roundOver = false;
}

//Game loops
(function generateComets() {
    let numPlrs = getNumPlayers();
    numPlrs = Math.max(numPlrs, 1); //don't divide by 0, just in case there are 0 players for a very short time before the server shuts down
    let timer = (cometRate - 250 + Math.ceil(Math.random() * 500)) / numPlrs;
    setTimeout(() => {
        if (!roundOver && gameState == 'game' && numComets < cometLimit) {
            for (let i = 0; i < cometLimit; i++) {
                if (comets[i] == undefined) {
                    numComets++;
                    let startX = 10 + Math.ceil(Math.random() * 1260);
                    let endX = 10 + Math.ceil(Math.random() * 1260);
                    let angle = Math.atan2(720, endX - startX);
                    comets[i] = {
                        x: startX,
                        y: 0,
                        speedX: Math.cos(angle) * cometSpeed,
                        speedY: Math.sin(angle) * cometSpeed,
                        rotation: angle - Math.PI / 2,
                        hp: cometHealth,
                        id: i,
                        credits: 100 * cometHealth,
                        dmg: 1,
                        radius: 40,
                        durationLimit: 40
                    }
                    io.emit('newComet', comets[i]);
                    break;
                    // dmg and radius attributes are for the comet explosion
                }
            }
        }
        generateComets();
    }, timer);
}());

setInterval(() => {
    if (gameState == 'game') {
        timer--;
        io.emit('timerUpdate', timer);
        if (!roundOver && timer <= 0) {
            roundOver = true;
            round++;
            io.emit('updateRound', round);
            timer = 10;
            increaseDifficulty();
        } else if (roundOver && timer <= 0) {
            roundOver = false;
            timer = 60;
        }
    }
}, 1000);
setInterval(updateProjectiles, 16);
