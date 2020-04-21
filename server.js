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


let players = {}; //stores all players in an object
let missiles = {};
let comets = {};
let explosions = {};
let numComets = 0;

const COMET_LIMIT = 20;

let missileId = 0;

let playerSlots = {
    0: undefined,
    1: undefined,
    2: undefined,
    3: undefined
}

io.on('connect', socket => {
    console.log('Connected');

    let nextSlot = getNextSlot();
    if (nextSlot == -1) {
        console.log('Game full')
        return;
    }
    playerSlots[nextSlot] = socket.id;

    for (let i = 0; i < COMET_LIMIT; i++) {
        comets[i] = undefined;
    }

    players[socket.id] = { //on player connect, new player object is created w/ rotation, x-y coords, id, and a random team
        rotation: 0,
        x: 100 + 200 * nextSlot, //Math.floor(Math.random() * 700) + 50,
        y: 500,//Math.floor(Math.random() * 500) + 50,
        playerId: socket.id,
    };

    //Event called currentPlayers passes players object to the new players so their client can render them
    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', players[socket.id]); //passing new player's object to all other players so they can render
    socket.on('disconnect', function () {
        console.log('Disconnect')
        delete players[socket.id]; //removes the player
        removeFromSlot(socket.id);
        io.emit('disconnect', socket.id); //tells all other clients to remove the player
    })

    socket.on('missileShot', function (missileData) {
        missileData["id"] = missileId;
        missiles[missileId] = missileData;
        if (missileId > 1000) {
            missileId = 0;
        } else {
            missileId++;
        }
        io.emit('newMissile', missiles[missileId - 1]);
    })
    socket.on('rotationChange', rotation => {
        players[socket.id].rotation = rotation;
        socket.broadcast.emit('playerMoved', players[socket.id]);
    })
})

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

function updateProjectiles() {
    updateMissiles();
    updateComets();
    detectCollisions();
    explosionDamage();
}

function updateMissiles() {
    Object.keys(missiles).forEach(id => {
        missiles[id].x = missiles[id].x + missiles[id].speedX;
        missiles[id].y = missiles[id].y + missiles[id].speedY;
        if (missiles[id].x < -10 || missiles[id].x > 810 || missiles[id].y < -10 || missiles[id].y > 610) {
            delete missiles[id];
            io.emit('missileDestroyed', id);
        }
    })
    io.emit('missileUpdate', missiles);
}

function generateComets() {
    if (numComets < COMET_LIMIT) {
        for (let i = 0; i < COMET_LIMIT; i++) {
            if (comets[i] == undefined) {
                numComets++;
                let startX = 10 + Math.ceil(Math.random() * 780);
                let endX = 10 + Math.ceil(Math.random() * 780);
                let angle = Math.atan2(600, endX - startX);
                comets[i] = {
                    x: startX,
                    y: 0,
                    speedX: Math.cos(angle) * 2.5,
                    speedY: Math.sin(angle) * 2.5,
                    rotation: angle - Math.PI / 2,
                    hp: 1,
                    id: i
                }
                io.emit('newComet', comets[i]);
                break;
            }
        }
    }
}

function updateComets() {
    Object.keys(comets).forEach(id => {
        if (comets[id] != undefined) {
            comets[id].x = comets[id].x + comets[id].speedX;
            comets[id].y = comets[id].y + comets[id].speedY;
            if (comets[id].hp <= 0 || comets[id].x < -10 || comets[id].x > 810 || comets[id].y < -10 || comets[id].y > 610) {
                numComets--;
                comets[id] = undefined;
                io.emit('cometDestroyed', id);
            }
        }
    })
    io.emit('cometUpdate', comets);
}

function detectCollisions() {
    Object.keys(missiles).forEach(missileId => {
        Object.keys(comets).forEach(cometId => {
            if (comets[cometId] != undefined && missiles[missileId] != undefined) {
                let dist = Math.sqrt(Math.pow(comets[cometId].x - missiles[missileId].x, 2) + Math.pow(comets[cometId].y - missiles[missileId].y, 2));
                if (dist < 25) {
                    comets[cometId].hp -= missiles[missileId].dmg;
                    console.log(comets[cometId].hp)
                    explosions[missileId] = {
                        x: missiles[missileId].x,
                        y: missiles[missileId].y,
                        id: missileId,
                        dmg: missiles[missileId].dmg,
                        radius: missiles[missileId].radius
                    }
                    delete missiles[missileId];
                    io.emit('missileDestroyed', missileId);
                }
            }
        })
    })
}

function explosionDamage() {
    Object.keys(explosions).forEach(explosionId => {
        Object.keys(comets).forEach(cometId => {
            if(comets[cometId] != undefined && explosions[explosionId] != undefined) {
                let dist = Math.sqrt(Math.pow(comets[cometId].x - explosions[explosionId].x, 2) + Math.pow(comets[cometId].y - explosions[explosionId].y, 2));
                if(dist < explosions[explosionId].radius) {
                    comets[cometId].hp -= explosions[explosionId].dmg;
                }
            }
        })
        delete explosions[explosionId];
    })
}

setInterval(generateComets, 300 + Math.ceil(Math.random() * 200));
setInterval(updateProjectiles, 16);