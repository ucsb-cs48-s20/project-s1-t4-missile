//Server setup
const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server)
const next = require('next');
const dev = process.env.NODE_ENV
const nextApp = next({ dev });
const nextHandler = nextApp.getRequestHandler();
const PORT = process.env.PORT || 3000;
nextApp.prepare().then(() => {
    app.get('*', (req, res) => {
        return nextHandler(req, res)
    })

    server.listen(PORT, (err) => {
        if (err) throw err
        console.log(`> Ready on port ${PORT}`)
    })
})

//Game variables
let round = 1;
let numComets = 0;
let baseHealth = 100;
let missileId = 0;
let timer = 60;
let gameRunning = true;
let roundOver = false;

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

io.on('connect', socket => {
    gameRunning = true;
    console.log(`${socket.id} connected`);

    //Room capacity check
    let nextSlot = getNextSlot();
    if (nextSlot == -1) {
        console.log('Game full')
        return;
    }
    playerSlots[nextSlot] = socket.id;

    //Initializes clients w/ server objects
    players[socket.id] = {
        rotation: 0,
        x: 160 + 320 * nextSlot,
        y: 670,
        playerId: socket.id,
        credits: 0,
    };
    socket.emit('initComets', comets);
    socket.emit('initHealth', baseHealth);
    socket.emit('initTimer', timer);
    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', players[socket.id]);

    //Handles client inputs
    socket.on('missileShot', missileData => {
        missileData["id"] = missileId;
        missiles[missileId] = missileData;
        missiles[missileId].speedX = -1 * Math.cos(missileData.rotation + Math.PI / 2) * 20;
        missiles[missileId].speedY = -1 * Math.sin(missileData.rotation + Math.PI / 2) * 20;
        missiles[missileId].dmg = 1;
        missiles[missileId].radius = 75;
        missiles[missileId].playerId = socket.id;
        if (missileId > 1000) {
            missileId = 0;
        } else {
            missileId++;
        }
        io.emit('newMissile', missiles[missileId - 1]);
        socket.broadcast.emit('missileFired', socket.id);
    })
    socket.on('rotationChange', rotation => {
        if (players[socket.id] != undefined) {
            players[socket.id].rotation = rotation;
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    })

    //Destroys objects on server & clients
    socket.on('disconnect', () => {
        console.log(`${socket.id} disconnected`)
        delete players[socket.id];
        removeFromSlot(socket.id);
        io.emit('disconnect', socket.id);
    })
})

//Helper functions
function getNextSlot() {
    for (i = 0; i < 4; i += 1) {
        if (!playerSlots[i]) { return i; }
    }
    return -1;
}

function removeFromSlot(id) {
    for (i = 0; i < 4; i += 1) {
        if (playerSlots[i] == id) { playerSlots[i] = undefined; return; }
    }
    return;
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

function updateMissiles() {
    if (gameRunning) {
        Object.keys(missiles).forEach(id => {
            missiles[id].x = missiles[id].x + missiles[id].speedX;
            missiles[id].y = missiles[id].y + missiles[id].speedY;
            if (missiles[id].x < -10 || missiles[id].x > 1290 || missiles[id].y < -10 || missiles[id].y > 730) {
                delete missiles[id];
                io.emit('missileDestroyed', id);
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
        Object.keys(missiles).forEach(missileId => {
            Object.keys(comets).forEach(cometId => {
                if (comets[cometId] != undefined && missiles[missileId] != undefined) {
                    let dist = Math.sqrt(Math.pow(comets[cometId].x - missiles[missileId].x, 2) + Math.pow(comets[cometId].y - missiles[missileId].y, 2));
                    if (dist < 25) {
                        comets[cometId].hp -= missiles[missileId].dmg;
                        if (comets[cometId].hp <= 0 || comets[cometId].x < -10 || comets[cometId].x > 1290 || comets[cometId].y < -10 || comets[cometId].y > 730) {
                            players[missiles[missileId].playerId].credits += comets[cometId].credits;
                            numComets--;
                            comets[cometId] = undefined;
                            io.emit('cometDestroyed', cometId);
                        }
                        explosions[missileId] = {
                            x: missiles[missileId].x,
                            y: missiles[missileId].y,
                            id: missileId,
                            dmg: missiles[missileId].dmg,
                            radius: missiles[missileId].radius,
                            playerId: missiles[missileId].playerId,
                        }
                        delete missiles[missileId];
                        io.emit('missileDestroyed', missileId);
                    }
                }
            })
        })
        Object.keys(comets).forEach(cometId => {
            if (comets[cometId] != undefined) {
                if (comets[cometId].y >= 600) {
                    numComets--;
                    baseHealth -= comets[cometId].hp;
                    comets[cometId] = undefined;
                    if (baseHealth > 0) {
                        io.emit('baseDamaged', [cometId, baseHealth]);
                    } else {
                        clearGame();
                        io.emit('gameOver');
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
                    if (dist < explosions[explosionId].radius) {
                        comets[cometId].hp -= explosions[explosionId].dmg;
                    }
                }
            })
            delete explosions[explosionId];
        })
    }
}

function increaseDifficulty() {
    cometLimit += 10;
    if(cometRate >= 750) {
        cometRate -= 250;
    }
    if(round % 3 == 0) {
        cometHealth++;
    }
    if(round % 2 == 0) {
        cometSpeed += 0.5;
    }
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
    round = 0;
}

//Game loops
(function generateComets() {
    let timer = cometRate - 250 + Math.ceil(Math.random() * 500);
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
                    }
                    io.emit('newComet', comets[i]);
                    break;
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
            timer = 10;
            increaseDifficulty();
        } else if (roundOver && timer <= 0) {
            roundOver = false;
            timer = 60;
        }
    }
}, 1000);
setInterval(updateProjectiles, 16);
