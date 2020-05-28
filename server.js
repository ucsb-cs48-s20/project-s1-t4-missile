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
let gameRunning = true;
let roundOver = false;
let score = 0;
let reloadSpeed = 0.5;
let numMissiles = 2;

//Variables that change with rounds
let cometLimit = 10;
let cometRate = 1500;
let cometHealth = 1;
let cometSpeed = 2.5;

//Object storage
let players = {};
let missiles = {};
let comets = {};
let explosions = {};
let playerSlots = {
    0: undefined,
    1: undefined,
    2: undefined,
    3: undefined
}

for (let i = 0; i < cometLimit; i++) {
    comets[i] = undefined;
}

let socketCount = 0;
io.on('connect', socket => {
    console.log(socket.handshake.query.purpose);
    if (socket.handshake.query.purpose === "game") {
        gameRunning = true;
        let spectate = false;
        console.log(`${socket.id} connected`);

        //Room capacity check
        let nextSlot = getNextSlot();
        if (nextSlot == -1) {
            console.log('Game full')
            spectate = true;
            io.to(socket.id).emit('spectate')
        }
        if (!spectate) {
            playerSlots[nextSlot] = socket.id;
        }
        //Initializes clients w/ server objects
        if (Object.keys(players).length < 4) {
            players[socket.id] = {
                rotation: 0,
                x: 160 + 320 * nextSlot,
                y: 670,
                playerId: socket.id,
                credits: 0,
                kills: 0,

                speed: 10,

                reloadTimeInSeconds: reloadSpeed,

                reloading: false,
                damage: 1,
                radius: 60,

                missiles: numMissiles,
                maxMissiles: numMissiles,
                rechargingMissiles: false,
                regenSpeed: 0.4,

                debugging: false,
            };
        }
        socket.emit('initComets', comets);
        socket.emit('initHealth', baseHealth);
        socket.emit('initTimer', timer);
        socket.emit('initScore', score);
        socket.emit('initRound', round);
        if (!spectate) {
            io.to(socket.id).emit('initCredits', 0);
        }
        socket.emit('currentPlayers', players);
        socket.broadcast.emit('newPlayer', players[socket.id]);

        //Handles client inputs
        socket.on('missileShot', missileData => {
            let thisPlayer = players[socket.id];
            if (!thisPlayer.reloading && thisPlayer.missiles > 0) {
                thisPlayer.reloading = true;
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

                //unconditional reload between shots
                io.emit('missileReload', socket.id, thisPlayer.reloadTimeInSeconds * 1000);
                setTimeout(() => { thisPlayer.reloading = false; }, thisPlayer.reloadTimeInSeconds * 1000);

                //change number of missiles
                let displayBar = false;
                if (thisPlayer.missiles == thisPlayer.maxMissiles){ displayBar = true; }
                thisPlayer.missiles--;
                let regenMs = (1.0/thisPlayer.regenSpeed) * 1000;
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
                if(attemptUpgrade(socket.id, upgrade, 0.1, cost, 100)) {
                    io.to(socket.id).emit('regenSpeedChange', players[socket.id].regenSpeed);
                }
            } else if (upgrade == 'maxMissiles') {
                let cost = 400 * players[socket.id].maxMissiles;
                let upgradeDone = attemptUpgrade(socket.id, upgrade, 1, cost, 400); // doing extra display/reload stuff when succeed
                if (upgradeDone) {
                    let regenMs = (1.0/players[socket.id].regenSpeed) * 1000;
                    io.emit('missileCountChange', socket.id, players[socket.id].missiles, players[socket.id].maxMissiles, regenMs, true);
                    players[socket.id].rechargingMissiles = false;
                    giveBulletsUntilMax(socket.id, players[socket.id], regenMs);
                }
            }
        });

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
        
        //Destroys objects on server & clients
        socket.on('disconnect', () => {
            console.log(`${socket.id} disconnected`)
            if (!spectate) {
                delete players[socket.id];
            }
            removeFromSlot(socket.id);
            io.emit('disconnect', socket.id);
        })
    } else {
        let nextSlot = getNextSlot()
        console.log(nextSlot)
        if (nextSlot == -1) {
            console.log('Game full')
            return
        }

        console.log(`Chat socket ${socket.id} connected`)

        let defaultName = `Player ${nextSlot + 1}`

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
    socketCount++
})

//Helper functions
function getNextSlot() {
    for (i = 0; i < 4; i += 1) {
        if (playerSlots[i] == undefined) { return i; }
    }
    return -1;
}

function removeFromSlot(id) {
    for (i = 0; i < 4; i += 1) {
        if (playerSlots[i] == id) { playerSlots[i] = undefined; return; }
    }
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
            if (player.missiles >= player.maxMissiles){
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
    if (gameRunning) {
        updateMissiles();
        updateComets();
        detectCollisions();
        explosionDamage();
    }
}

// TODO: match explosion duration with animation
// TODO: explosion size changes with animation
// TODO: find explosion animation
function updateMissiles() {
    if (gameRunning) {
        Object.keys(missiles).forEach(id => {
            missiles[id].x = missiles[id].x + missiles[id].speedX;
            missiles[id].y = missiles[id].y + missiles[id].speedY;

            let travelDist = Math.sqrt(Math.pow(missiles[id].x - missiles[id].startX, 2) + Math.pow(missiles[id].y - missiles[id].startY, 2))
            let targetDist = Math.sqrt(Math.pow(missiles[id].mouseX - missiles[id].startX, 2) + Math.pow(missiles[id].mouseY - missiles[id].startY, 2))
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
    if (gameRunning) {
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
    if (gameRunning) {
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
                        clearGame();
                    }
                }
            }
        })
    }
}


function explosionDamage() {
    if (gameRunning) {
        Object.keys(explosions).forEach(explosionId => {
            Object.keys(comets).forEach(cometId => {
                if (comets[cometId] != undefined && explosions[explosionId] != undefined) {
                    let dist = Math.sqrt(Math.pow(comets[cometId].x - explosions[explosionId].x, 2) + Math.pow(comets[cometId].y - explosions[explosionId].y, 2));
                    // TODO: make explosion animation sprite reflect its radius
                    if (dist < explosions[explosionId].currentRadius && !(explosionId in comets[cometId])) {
                        comets[cometId].hp -= explosions[explosionId].dmg;
                        comets[cometId][explosionId] = true;
                        if (comets[cometId].hp <= 0 || comets[cometId].x < -10 || comets[cometId].x > 1290 || comets[cometId].y < -10 || comets[cometId].y > 730) {
                            if (players[explosions[explosionId].playerId] != undefined) {
                                players[explosions[explosionId].playerId].credits += comets[cometId].credits;
                                players[explosions[explosionId].playerId].kills += 1;
                                io.to(explosions[explosionId].playerId).emit('updateCredits', players[explosions[explosionId].playerId].credits);
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
                                playerId: explosions[explosionId].playerId,
                                durationLimit: comets[cometId].durationLimit,
                                startTick: 0
                            }
                            
                            let size = comets[cometId].radius;
                            let time = comets[cometId].durationLimit + 5;

                            comets[cometId] = undefined;
                            io.emit('cometDestroyed', cometId, size, time);
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
    gameRunning = false;
    Object.keys(players).forEach(playerId => {
        delete players[playerId];
    })
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
}

//Game loops
(function generateComets() {
    let numPlrs = getNumPlayers();
    numPlrs = Math.max(numPlrs, 1); //don't divide by 0, just in case there are 0 players for a very short time before the server shuts down
    let timer = (cometRate - 250 + Math.ceil(Math.random() * 500)) / numPlrs;
    setTimeout(() => {
        if (!roundOver && gameRunning && numComets < cometLimit) {
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
    if (gameRunning) {
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
