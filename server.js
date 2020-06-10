/* Chat util functions */
const { addUser, removeUser, getUser, getAllUsers } = require('./utils/chatUsers.js');

/* Calculate distance between 2 points */
const { distance } = require('./utils/serverCalculations.js');

/* ----- Server setup ----- */
const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server)
const next = require('next');
const cors = require('cors');
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
        console.log(`> Ready on port ${PORT}`);
    })
})
app.use(cors())

/* ----- Game variables ----- */
/* Initial game state variables, used for initialization & reset */
const initialRound = 1;
const initialNumComets = 0;
const initialBaseHealth = 50;
const initialMissileId = 0;
const initialTimer = 60;
const initialRoundOver = false;
const initialScore = 0;
const initialGameState = 'lobby';
const initialCometLimit = 10;
const initialCometRate = 2100;
const initialCometHealth = 1;
const initialCometSpeed = 1.5;
const initialUltimateComet = false;

/* Game state variables */
let round = initialRound;
let numComets = initialNumComets;
let baseHealth = initialBaseHealth;
let missileId = initialMissileId;
let timer = initialTimer;
let roundOver = initialRoundOver;
let score = initialScore;
let gameState = initialGameState;
let cometLimit = initialCometLimit;
let cometRate = initialCometRate;
let cometHealth = initialCometHealth;
let cometSpeed = initialCometSpeed;
let ultimateComet = initialUltimateComet;

/* Countdown and timer variables */
let countdown = false;
let countdownTimer = undefined;
let gameTimeout = undefined;

/* Consumable damage constants */
const laserDamage = 4;

/* Objects */
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

/* Initializes comets */
for (let i = 0; i < cometLimit; i++) {
    comets[i] = undefined;
}

/* ----- Handles socket connection/events ----- */
io.on('connect', (socket) => {
    /* Handles game socket connections */
    if (socket.handshake.query.purpose === 'game') {
        console.log(`> Game socket <${socket.id}> connected`);

        /* Initializes the user's name & role to default spectate */
        let username = socket.handshake.query.name;
        users[socket.id] = {
            name: username,
            role: 'spectator',
        }

        /* Initializes the client with data depending on the game's current state */
        if (gameState == 'lobby') {
            io.emit('updateUsers', users);
        } else if (gameState == 'game') {
            setTimeout(() => { socket.emit('inProgress') }, 500);
        } else {
            setTimeout(() => { socket.emit('gameFinished') }, 500);
        }

        /* ----- Lobby scene events ----- */
        /* Sends user list to those in lobby */
        socket.on('requestUsers', () => {
            socket.emit('updateUsers', users);
        });

        /* Allows users to switch roles in the lobby */
        socket.on('attemptSwitchRole', () => {
            /* Switches player to spectator role, frees the playerSlot */
            if (users[socket.id].role == 'player') {
                users[socket.id].role = 'spectator';
                delete players[socket.id];
                for (let i = 0; i < 4; i++) {
                    if (playerSlots[i] == socket.id) {
                        playerSlots[i] = undefined;
                    }
                }
                io.emit('updateUsers', users);
            } else {
                /* Gets the next available playerSlot */
                let nextSlot = getNextSlot();
                if (nextSlot != -1) {
                    /* Switches user to player and creates player data if available playerSlot exists */
                    users[socket.id].role = 'player';
                    playerSlots[nextSlot] = socket.id;
                    players[socket.id] = {
                        name: users[socket.id].name,
                        rotation: 0,
                        x: 160 + 320 * nextSlot,
                        y: 670,
                        playerId: socket.id,
                        credits: 0,
                        cometsDestroyed: 0,
                        damage: 1,
                        radius: 40,
                        missiles: 5,
                        maxMissiles: 5,
                        rechargingMissiles: false,
                        regenSpeed: 0.4,

                        specialAttack: 'none',
                        specialAttackAmmo: 0,

                        debugging: false,
                        speed: 10,
                    };
                    io.emit('updateUsers', users);
                }
            }
        });

        /* Handles users joining in progress */
        socket.on('joinInProgress', () => {
            socket.emit('switchStart');
            socket.broadcast.emit('newPlayer', players[socket.id]);
        });

        /* Starts a countdown towards game start */
        socket.on('startGame', () => {
            /* Prevents spectators from starting game and players from starting countdowns when a countdown is in progress */
            if (users[socket.id].role == 'player' && !countdown) {
                countdown = true;
                io.emit('updateCountdownTimer', 5);
                let time = 4;
                countdownTimer = setInterval(() => {
                    io.emit('updateCountdownTimer', time);
                    time--;
                    if (time <= 0) {
                        clearInterval(countdownTimer);
                    }
                }, 1000);
                gameTimeout = setTimeout(() => {
                    countdown = false;
                    gameState = 'game';
                    io.emit('switchStart');
                }, 5000)
            }
        });

        /* ----- Game scene events ----- */
        /* Sends game data to users who join a game */
        socket.on('requestInitialize', () => {
            io.to(socket.id).emit('initComets', comets);
            io.to(socket.id).emit('initHealth', baseHealth);
            io.to(socket.id).emit('initTimer', timer);
            io.to(socket.id).emit('initScore', score);
            io.to(socket.id).emit('initRound', round);
            if (users[socket.id].role != 'spectator') {
                io.to(socket.id).emit('initCredits', 0);
            } else {
                io.to(socket.id).emit('initSpectate');
            }
            io.to(socket.id).emit('currentPlayers', players);
        });

        /* Handles missile firing */
        socket.on('missileShot', (missileData) => {
            let thisPlayer = players[socket.id];
            if (thisPlayer.missiles > 0 || missileData['flakSpecial'] === true || missileData['nukeSpecial'] === true) {
                missileData['id'] = missileId;
                /* Adds new missile to missile object */
                missiles[missileId] = missileData;
                /* Handles flak firing */
                if (missiles[missileId].flakSpecial) {
                    /* Flak damage/radius scaling */
                    if (players[socket.id].damage < 3) {
                        missiles[missileId].dmg = 1;
                    } else if (players[socket.id].damage < 5) {
                        missiles[missileId].dmg = 2;
                    } else {
                        missiles[missileId].dmg = 3;
                    }
                    missiles[missileId].radius = players[socket.id].radius / 2.7;
                    missiles[missileId].speedX = -1 * Math.cos(missileData.rotation + Math.PI / 2) * players[socket.id].speed * 1.3;
                    missiles[missileId].speedY = -1 * Math.sin(missileData.rotation + Math.PI / 2) * players[socket.id].speed * 1.3;
                } else if (missiles[missileId].nukeSpecial) {
                    /* Nuke damage/radius scaling */
                    missiles[missileId].dmg = players[socket.id].damage + 1;
                    missiles[missileId].radius = players[socket.id].radius * 6;
                    missiles[missileId].speedX = -1 * Math.cos(missileData.rotation + Math.PI / 2) * players[socket.id].speed;
                    missiles[missileId].speedY = -1 * Math.sin(missileData.rotation + Math.PI / 2) * players[socket.id].speed;
                } else {
                    /* Normal missiles */
                    missiles[missileId].dmg = players[socket.id].damage;
                    missiles[missileId].radius = players[socket.id].radius;
                    missiles[missileId].speedX = -1 * Math.cos(missileData.rotation + Math.PI / 2) * players[socket.id].speed;
                    missiles[missileId].speedY = -1 * Math.sin(missileData.rotation + Math.PI / 2) * players[socket.id].speed;
                }
                missiles[missileId].startX = missiles[missileId].x
                missiles[missileId].startY = missiles[missileId].y
                missiles[missileId].playerId = socket.id;

                /* Tells client to render a new missile on their end */
                io.emit('newMissile', missiles[missileId]);

                /* If missile is not a flak, then generate a crosshair */
                if (!missiles[missileId].flakSpecial) {
                    io.emit('newCrosshair', missiles[missileId]);
                }
                /* Tells all users that a missile was fired */
                socket.broadcast.emit('missileFired', socket.id);

                /* For normal missiles, update the missile count */
                if (!missiles[missileId].flakSpecial && !missiles[missileId].nukeSpecial) {
                    let displayBar = false;
                    if (thisPlayer.missiles == thisPlayer.maxMissiles) { displayBar = true; }
                    thisPlayer.missiles--;
                    let regenMs = (1.0 / thisPlayer.regenSpeed) * 1000;
                    io.emit('updateMissileCount', socket.id, thisPlayer.missiles, thisPlayer.maxMissiles, regenMs, displayBar);
                    regenAmmo(socket.id, thisPlayer, regenMs);
                }

                /* Change the missile id */
                if (missileId > 1000) {
                    missileId = 0;
                } else {
                    missileId++;
                }
            }
        })

        /* Sends client movement to all clients */
        socket.on('rotationChange', (rotation) => {
            if (players[socket.id] != undefined) {
                players[socket.id].rotation = rotation;
                socket.broadcast.emit('playerMoved', players[socket.id]);
            }
        })

        /* Upgrades an attribute for a player if they have enough money */
        socket.on('attemptUpgrade', upgrade => {
            if (upgrade == 'speed') {
                let cost = 1000 + (players[socket.id].speed - 10) * 500;
                attemptUpgrade(socket.id, upgrade, 1, cost, 500);
            } else if (upgrade == 'damage') {
                let cost = 500 + (players[socket.id].damage * 1500);
                attemptUpgrade(socket.id, upgrade, 1, cost, 1500);
            } else if (upgrade == 'radius') {
                let cost = 400 + ((players[socket.id].radius - 40) / 10.0) * 800;
                attemptUpgrade(socket.id, upgrade, 5, cost, 400);
            } else if (upgrade == 'regenSpeed') {
                let cost = -1500 + Math.round(5000 * players[socket.id].regenSpeed);
                if (attemptUpgrade(socket.id, upgrade, 0.1, cost, 500)) {
                    io.to(socket.id).emit('regenSpeedChange', players[socket.id].regenSpeed);
                }
            } else if (upgrade == 'maxMissiles') {
                let cost = 600 * (players[socket.id].maxMissiles / 5);
                let upgradeDone = attemptUpgrade(socket.id, upgrade, 5, cost, 600); 
                if (upgradeDone) {
                    let regenMs = (1.0 / players[socket.id].regenSpeed) * 1000;
                    io.emit('updateMissileCount', socket.id, players[socket.id].missiles, players[socket.id].maxMissiles, regenMs, true);
                    players[socket.id].rechargingMissiles = false;
                    regenAmmo(socket.id, players[socket.id], regenMs);
                }
            }
        });

        /* Purchases a consumable if the player has enough money */
        socket.on('attemptBuyConsumable', (consumableName) => {
            if (consumableName == 'laser') {
                let bought = attemptBuyConsumable(socket.id, consumableName, 1000);
                if (bought) {
                    players[socket.id].specialAttackAmmo = 3;
                }
            } else if (consumableName == 'flak') {
                let bought = attemptBuyConsumable(socket.id, consumableName, 1500);
                if (bought) {
                    players[socket.id].specialAttackAmmo = 1;
                }
            } else if (consumableName == 'nuke') {
                let bought = attemptBuyConsumable(socket.id, consumableName, 1000);
                if (bought) {
                    players[socket.id].specialAttackAmmo = 1;
                }
            }
        });

        /* ----- End scene events ----- */
        /* Forces users in lobby and end scene to reload */
        socket.on('requestEndToLobby', () => {
            gameState = 'lobby';
            io.emit('reloadEnd');
            io.emit('reloadLobby');
        });

        /* Handles players using special consumables */
        socket.on('specialShot', () => {
            let myPlayer = players[socket.id];
            if (myPlayer.specialAttack == 'none') { return; }
            else if (myPlayer.specialAttack == 'laser') {
                io.emit('updateSpecialAttack', socket.id, 'laser', 0x555555 * (myPlayer.specialAttackAmmo - 1));
                fireLaser(socket.id);
            } else if (myPlayer.specialAttack == 'flak') {
                io.emit('updateSpecialAttack', socket.id, 'flak', 0x555555 * (myPlayer.specialAttackAmmo - 1));
                fireFlak(socket.id);
            } else if (myPlayer.specialAttack == 'nuke') {
                io.emit('updateSpecialAttack', socket.id, 'nuke', 0x555555 * (myPlayer.specialAttackAmmo - 1));
                fireNuke(socket.id);
            }
            myPlayer.specialAttackAmmo -= 1;
            if (myPlayer.specialAttackAmmo <= 0) {
                myPlayer.specialAttack = 'none';
                io.emit('updateSpecialAttack', socket.id, 'none', 0x000000);
            }
        });

        /* ----- Debug mode events ----- */
        /* Allows debuggers to enter debug mode, sends info about the game state */
        socket.on('enterDebug', () => {
            if (!players[socket.id].debugging) {
                console.log(`> ${socket.id} entered debug mode`);
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
        });

        /* Allows debuggers to change comet speed */
        socket.on('changeCometSpeed', (increment) => {
            cometSpeed += increment;
            io.to(socket.id).emit('cometSpeedChange', cometSpeed);
        }); 

        /* Allows debuggers to change the round */
        socket.on('changeRound', () => {
            round++;
            io.emit('updateRound', round);
            increaseDifficulty();
        });

        /* Allows debuggers to change base health */
        socket.on('changeBaseHealth', (increment) => {
            baseHealth += increment;
            io.emit('baseHealthChange', baseHealth);
        });

        /* Allows debuggers to change the timer */
        socket.on('changeTimer', (increment) => {
            timer += increment;
            io.emit('updateTimer', timer);
        })

        /* Allows debuggers to change their credits */
        socket.on('changeCredits', (increment) => {
            players[socket.id].credits += increment;
            io.to(socket.id).emit('updateCredits', players[socket.id].credits);
        });

        /* Allows debuggers to change their ammo capacity */
        socket.on('changeMaxMissiles', (increment) => {
            players[socket.id].maxMissiles += increment;
            let regenMs = (1.0 / players[socket.id].regenSpeed) * 1000;
            io.emit('updateMissileCount', socket.id, players[socket.id].missiles, players[socket.id].maxMissiles, regenMs, true);
            players[socket.id].rechargingMissiles = false;
            regenAmmo(socket.id, players[socket.id], regenMs);
        });

        /* Allows debuggers to change how fast their ammo regenerates */
        socket.on('changeRegenSpeed', (increment) => {
            players[socket.id].regenSpeed += increment;
            io.to(socket.id).emit('regenSpeedChange', players[socket.id].regenSpeed);
        });

        /* Allows debuggers to change how many comets can be on screen at once */
        socket.on('changeCometLimit', (increment) => {
            cometLimit += increment;
            io.to(socket.id).emit('cometLimitChange', cometLimit);
        });

        /* Allows debuggers to change how fast comets spawn */
        socket.on('changeCometRate', (increment) => {
            cometRate += increment;
            io.to(socket.id).emit('cometRateChange', cometRate);
        });

        /* Allows debuggers to change how much health comets have */
        socket.on('changeCometHealth', (increment) => {
            cometHealth += increment;
            io.to(socket.id).emit('cometHealthChange', cometHealth);
        })

        /* ----- Disconnects ----- */
        /* Handles disconnects */
        socket.on('disconnect', () => {
            console.log(`> Game socket <${socket.id}> disconnected`)
            /* Deletes the user from the list of players & playerSlots if they are a player*/
            if (users[socket.id].role == 'player') {
                delete players[socket.id];
                removeFromSlot(socket.id);
            }
            /* Removes the user from the user list */
            delete users[socket.id];

            /* Updates the user list for users in the lobby */
            if(gameState == 'lobby') {
                io.emit('updateUsers', users);
            }

            /* Updates users in game about which player to remove */
            io.emit('disconnect', socket.id);

            /* Handles event that all players leave */
            if (Object.keys(players).length == 0) {
                /* If game is counting down towards start, stop & clear the timer */
                if (countdown) {
                    clearInterval(countdownTimer);
                    clearTimeout(gameTimeout);
                    countdown = false;
                }
                /* Clear & reset all objects in the game stored on the server */
                clearGame();
                /* Force spectators in the game/lobby to reload */
                io.emit('reloadGame');
                io.emit('clearLobby');
                /* Return to lobby */
                gameState = 'lobby';
            }
            /* Disconnect the socket */
            socket.disconnect();
        });
    } else {
        /* Handles chat socket */
        console.log(`> Chat socket <${socket.id}> connected`);

        /* Handles users joining the chat room */
        socket.on('join', (obj, callback) => {
            const { error, user } = addUser({ id: socket.id, name: obj.name, room: 'Room' });

            if (error) {
                return (callback(error));
            }

            socket.emit('message', { user: 'admin', text: `${user.name}, welcome to the room!` });
            socket.broadcast.to(user.room).emit('message', { 
                user: 'admin', 
                text: `${user.name} has joined the room.` 
            });
            socket.join(user.room);

            io.to(user.room).emit('roomData', { room: user.room, users: getAllUsers() });
            callback();
        });

        /* Handles users leaving the chat room */
        socket.on('disconnect', () => {
            console.log(`> Chat socket <${socket.id}> disconnected`);
            const user = removeUser(socket.id);
            if (user) {
                io.to(user.room).emit('message', { user: 'admin', text: `${user.name} has left.` });
                io.to(user.room).emit('roomData', { room: user.room, users: getAllUsers() });
            }
            socket.disconnect();
        });

        /* Allows users to send messages */
        socket.on('sendMessage', (message, callback) => {
            const user = getUser(socket.id);

            io.to(user.room).emit('message', { user: user.name, text: message });
            callback();
        });

    }
});

/* ----- Game loops ----- */
/* Generates comets */
(function generateComets() {
    let numPlrs = Object.keys(players).length;
    numPlrs = Math.max(numPlrs, 1); //To avoid divide by 0 error 
    /* Calculates how fast to generate comets by number of players */
    let timer = (cometRate - 250 + Math.ceil(Math.random() * 500)) / (numPlrs / 1.3);
    setTimeout(() => {
        /* Checks if it's an appropriate time to spawn comets */
        if (!roundOver && gameState == 'game' && numComets < cometLimit) {
            /* Spawn a comet at a random x at the top of the screen and calculate its trajectory towards a random y towards the bottom of the screen */
            for (let i = 0; i < cometLimit; i++) {
                if (comets[i] == undefined) {
                    numComets++;
                    let startX = 10 + Math.ceil(Math.random() * 1260);
                    let endX = 10 + Math.ceil(Math.random() * 1260);
                    let angle = Math.atan2(720, endX - startX);
                    let minHealth = 1;
                    if (cometHealth >= 3) {
                        minHealth = cometHealth - 2;
                    }
                    let maxHealth = cometHealth + 1;
                    let speed = (Math.random() * (cometSpeed - (cometSpeed / 2)) + (cometSpeed / 2));
                    let health = Math.floor(Math.random() * (maxHealth - minHealth)) + minHealth;
                    if (ultimateComet == true && Math.random() * 200 < 2) {
                        comets[i] = {
                            x: startX,
                            y: 0,
                            speedX: Math.cos(angle) * 0.1,
                            speedY: Math.sin(angle) * 0.1,
                            rotation: angle - Math.PI / 2,
                            hp: 50 + (round * 2),
                            id: i,
                            credits: 1000,
                            dmg: 20,
                            radius: 200,
                            durationLimit: 40
                        }
                    } else {
                        comets[i] = {
                            x: startX,
                            y: 0,
                            speedX: Math.cos(angle) * speed,
                            speedY: Math.sin(angle) * speed,
                            rotation: angle - Math.PI / 2,
                            hp: health,
                            dmg: health,
                            id: i,
                            credits: 100 * health,
                            radius: 50 + (health * 5),
                            durationLimit: 40
                        }
                    }
                    
                    /* Tell clients about the new comet */
                    io.emit('newComet', comets[i]);
                    break;
                }
            }
        }
        generateComets();
    }, timer);
}());

/* Round/break timer */
setInterval(() => {
    if (gameState == 'game') {
        /* Updates timer */
        timer--;
        io.emit('updateTimer', timer);
        /* Start displaying incoming round/break text */
        if (!roundOver && timer <= 5) {
            io.emit('updateIncomingStatus', {
                timer: timer,
                status: 'Break'
            });
        } else if (roundOver && timer <= 5) {
            io.emit('updateIncomingStatus', {
                timer: timer,
                status: `Round ${round + 1}`
            })
        }
        /* Change timer to appropriate values after round/break */
        if (!roundOver && timer <= 0) {
            roundOver = true;
            timer = 10;
        } else if (roundOver && timer <= 0) {
            io.emit('updateRound', ++round);
            increaseDifficulty();
            roundOver = false;
            timer = 60;
        }
    }
}, 1000);

/* Calls update projectiles */
setInterval(updateProjectiles, 16);

/* ----- Helper functions ----- */
/* Gets the next valid player slot*/
function getNextSlot() {
    for (i = 0; i < 4; i += 1) {
        if (playerSlots[i] == undefined) { return i; }
    }
    return -1;
}

/* Removes the id from playerSlots */
function removeFromSlot(id) {
    Object.keys(playerSlots).forEach(player => {
        if (playerSlots[player] == id) {
            playerSlots[player] = undefined;
            return;
        }
    })
    return;
}

/* Helper function for making upgrades */
function attemptUpgrade(socketID, upgradeName, upgradeIncrement, cost, costIncrement) {
    /* Checks if the user has enough credits, makes the upgrade, decreases the player's credits, and increase the cost if so */
    if (players[socketID].credits >= cost) {
        players[socketID][upgradeName] += upgradeIncrement;
        players[socketID].credits -= cost;
        io.to(socketID).emit('updateCredits', players[socketID].credits);
        io.to(socketID).emit('updateCost', [upgradeName, cost + costIncrement]);
        return true;
    }

    return false;
}

/* Helper function for buying consumables */
function attemptBuyConsumable(socketID, consumableName, cost) {
    /* Checks if the player has enough credits & that the player doesn't already have a special attack, if so, gives the player the special attack and decreases the player's credits. */
    if (players[socketID].credits >= cost && players[socketID].specialAttack === 'none') {
        players[socketID].credits -= cost;
        players[socketID].specialAttack = consumableName;
        io.to(socketID).emit('updateCredits', players[socketID].credits);
        io.emit('updateSpecialAttack', socketID, consumableName, 0xffffff);
        return true;
    }

    return false;
}

/* Provides ammo regeneration functionality */
function regenAmmo(socketId, player, regenMs) {
    let oldMissilesMax = player.maxMissiles;
    if (!player.rechargingMissiles) {
        player.rechargingMissiles = true;
        /* Increases ammo count after regen time has passed */
        setTimeout(() => {
            if (oldMissilesMax != player.maxMissiles) { return; }

            player.missiles++;
            let displayBar = false;
            if (player.missiles < player.maxMissiles) { displayBar = true; }
            io.emit('updateMissileCount', socketId, player.missiles, player.maxMissiles, regenMs, displayBar);
            if (player.missiles >= player.maxMissiles) {
                player.missiles = player.maxMissiles;
                player.rechargingMissiles = false;
            }
            else {
                player.rechargingMissiles = false;
                regenAmmo(socketId, player, (1.0 / player.regenSpeed) * 1000);
            }
        }, regenMs);
    }
}

/* Allows users to fire lasers */
function fireLaser(socketID) {
    let myPlayer = players[socketID];

    /* Calculates the direction of the laser */
    let laserDir = {
        'x': Math.sin(myPlayer.rotation),
        'y': -Math.cos(myPlayer.rotation)
    };

    /* Tells all clients that a player fired a laser */
    io.emit('laserFired', {
        'x': myPlayer.x,
        'y': myPlayer.y
    }, laserDir, myPlayer.rotation);

    Object.keys(comets).forEach(cometId => {
        if (comets[cometId] == undefined) { return; }
        /* Calculates comet position with respect to laser position */
        let thisComet = comets[cometId];
        let localPos = {
            'x': thisComet.x - myPlayer.x,
            'y': thisComet.y - myPlayer.y
        };

        let projectionLength = (localPos.x * laserDir.x) + (localPos.y * laserDir.y);
        let projection = {
            'x': projectionLength * laserDir.x,
            'y': projectionLength * laserDir.y
        };
        let orthogonalPart = {
            'x': localPos.x - projection.x,
            'y': localPos.y - projection.y
        };
        /* Calculates laser damage to comet and destroys if appropriate */
        let squareDistFromLaser = (orthogonalPart.x * orthogonalPart.x) + (orthogonalPart.y * orthogonalPart.y); 
        if (squareDistFromLaser < 10000) { 
            thisComet.hp -= laserDamage;
            if (thisComet.hp <= 0) {
                destroyComet(cometId, socketID);
            }
        }
    })
}

/* Allows users to fire flak missiles */
function fireFlak(socketID) {
    let tick = 0;

    /* Fires flacks for 1500 ticks */
    const flakDuration = setInterval(() => {
        if (tick < 1500) {
            io.to(socketID).emit('flakFired');
            tick++;
        } else {
            clearInterval(flakDuration);
        }
    }, 10);
}

/* Tells the client that a nuke fired */
function fireNuke(socketID) {
    io.to(socketID).emit('nukeFired');
}



/* ----- Object updating functions ----- */
/* Main update projectiles function */
function updateProjectiles() {
    if (gameState == 'game') {
        updateMissiles();
        updateComets();
        detectBaseCollisions();
        explosionDamage();
    }
}

/* Updates missile positions */
function updateMissiles() {
    if (gameState == 'game') {
        Object.keys(missiles).forEach(id => {
            /* Updates missile position */
            missiles[id].x = missiles[id].x + missiles[id].speedX;
            missiles[id].y = missiles[id].y + missiles[id].speedY;

            /* Calculates distance between crosshair and starting point, and missile location and starting point.*/
            let travelDist = distance(missiles[id].x, missiles[id].y, missiles[id].startX, missiles[id].startY);
            let targetDist = distance(missiles[id].mouseX, missiles[id].mouseY, missiles[id].startX, 
                missiles[id].startY);
            let isAtTarget = (missiles[id].x >= missiles[id].mouseX - 10) 
                && (missiles[id].x <= missiles[id].mouseX + 10) && (missiles[id].y >= missiles[id].mouseY - 10)
                && (missiles[id].y <= missiles[id].mouseY + 10);
            /* If the missile has traveled the appropriate distance or longer, then create an explosion at where the crosshair is */
            if (isAtTarget || travelDist >= targetDist) {
                explosionLocation = [missiles[id].x, missiles[id].y]
                if (travelDist > targetDist && !isAtTarget) {
                    explosionLocation[0] = missiles[id].mouseX
                    if (missiles[id].mouseY <= missiles[id].startY) {
                        explosionLocation[1] = missiles[id].mouseY
                    }
                }

                /* Creates different explosions based on missile type */
                if (missiles[id].nukeSpecial) {
                    explosions[id] = {
                        x: explosionLocation[0],
                        y: explosionLocation[1],
                        id: id,
                        dmg: missiles[id].dmg,
                        radius: missiles[id].radius,
                        currentRadius: 0,
                        playerId: missiles[id].playerId,
                        durationLimit: 80,
                        startTick: 0
                    }
                } else {
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
                }

                let time = explosions[id].durationLimit + 5;
                let size = missiles[id].radius;

                /* Deletes the missile */
                delete missiles[id];
                /* Updates client missiles & crosshairs */
                io.emit('missileDestroyed', id, size, time);
                io.emit('crosshairDestroyed', id);
            } else if (missiles[id].x < -10 || missiles[id].x > 1290 || missiles[id].y < -10 || missiles[id].y > 730) {
                /* Removes missiles that fly off screen */
                delete missiles[id];
                io.emit('missileDestroyed', id);
                io.emit('crosshairDestroyed', id);
            }
        })
        /* Updates clients with new missile positions */
        io.emit('updateMissiles', missiles);
    }
}

/* Updates comet position */
function updateComets() {
    if (gameState == 'game') {
        /* Calculate comet new position */
        Object.keys(comets).forEach(id => {
            if (comets[id] != undefined) {
                comets[id].x = comets[id].x + comets[id].speedX;
                comets[id].y = comets[id].y + comets[id].speedY;
            }
        })
        /* Send new comet positions to clients */
        io.emit('updateComets', comets);
    }
}

/* Detects comet collisions with base */
function detectBaseCollisions() {
    if (gameState == 'game') {
        Object.keys(comets).forEach(cometId => {
            if (comets[cometId] != undefined) {
                /* Checks if comets hit base */
                if (comets[cometId].y >= 600) {
                    /* Removes the comet and decreases the base's health by the comet's health */
                    numComets--;
                    let dmg = comets[cometId].dmg < comets[cometId].hp ? comets[cometId].dmg : comets[cometId].hp;
                    baseHealth -= dmg;
                    comets[cometId] = undefined;
                    if (baseHealth > 0) {
                        /* The base is still alive, update clients with new base health */
                        io.emit('updateBase', [cometId, baseHealth]);
                    } else {
                        /* The base is destroyed, send game info to the clients for the end scene */
                        cometsDestroyedStats = [];
                        Object.keys(players).forEach(playerId => {
                            cometsDestroyedStats.push({
                                name: players[playerId].name,
                                cometsDestroyed: players[playerId].cometsDestroyed    
                            })
                        })
                        io.emit('gameOver', { 
                            round: round, 
                            score: score, 
                            cometsDestroyedStats: cometsDestroyedStats
                        });
                        io.emit('gameFinished');
                        /* Reset game state values */
                        clearGame();
                    }
                }
            }
        })
    }
}

/* Helper function to destroy comets and award credits */
function destroyComet(cometId, awardPlayerSocketID) {

    /* Awards credits/increments score */
    if (players[awardPlayerSocketID] != undefined) {
        players[awardPlayerSocketID].credits += comets[cometId].credits;
        players[awardPlayerSocketID].cometsDestroyed++;
        io.to(awardPlayerSocketID).emit('updateCredits', players[awardPlayerSocketID].credits);
    }
    score += comets[cometId].credits;
    io.emit('updateScore', score);
    numComets--;

    /* Create an exposion where the comet was */
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

    /* Remove the comet from client screens */
    comets[cometId] = undefined;
    io.emit('cometDestroyed', cometId, size, time);
}

/* Checks for explosion collisions with comets */
function explosionDamage() {
    if (gameState == 'game') {
        Object.keys(explosions).forEach(explosionId => {
            Object.keys(comets).forEach(cometId => {
                if (comets[cometId] != undefined && explosions[explosionId] != undefined) {
                    /* Calculates distance between a valid comet and a valid explosion */
                    let dist = distance(comets[cometId].x, comets[cometId].y, explosions[explosionId].x, 
                        explosions[explosionId].y); 
                    /* If comet is within explosion distance, decrease the comet health and destroy it if appropriate */
                    if (dist < explosions[explosionId].currentRadius && !(explosionId in comets[cometId])) {
                        comets[cometId].hp -= explosions[explosionId].dmg;
                        comets[cometId][explosionId] = true;
                        if (comets[cometId].hp <= 0 || comets[cometId].x < -10 || comets[cometId].x > 1290 || comets[cometId].y < -10 || comets[cometId].y > 730) {
                            destroyComet(cometId, explosions[explosionId].playerId);
                        }
                    }
                }
            })

            /* Calculates explosion radius/duration */
            explosions[explosionId].startTick++;

            if (explosions[explosionId].currentRadius < explosions[explosionId].radius) {
                let increment = explosions[explosionId].radius / explosions[explosionId].durationLimit;
                explosions[explosionId].currentRadius += increment;
            }
            if (explosions[explosionId].startTick > explosions[explosionId].durationLimit + 5) {
                delete explosions[explosionId];
            }
        })
    }
}

/* Function to increase difficulty */
function increaseDifficulty() {
    cometLimit += 10;
    if (cometRate >= 600) {
        cometRate -= 100;
    }
    if (round % 3 == 0 && cometHealth < 5) {
        cometHealth++;
    }else if (cometHealth == 5) {
        ultimateComet = true;
    }
    if (round % 2 == 0 && cometSpeed < 5) {
        cometSpeed += 0.25;
    }
    /* Updates users in debug mode */
    io.emit('cometLimitChange', cometLimit);
    io.emit('cometRateChange', cometRate);
    io.emit('cometHealthChange', cometHealth);
    io.emit('cometSpeedChange', cometSpeed);
}

/* Clears/resets all game values */
function clearGame() {
    /* Clears all game objects except for the players */
    gameState = 'end';
    Object.keys(missiles).forEach(missileId => {
        delete missiles[missileId];
    });
    Object.keys(comets).forEach(cometId => {
        delete comets[cometId];
    });
    Object.keys(explosions).forEach(explosionId => {
        delete explosions[explosionId];
    });
    /* Resets game values to initial values */
    round = initialRound;
    numComets = initialNumComets;
    baseHealth = initialBaseHealth;
    missileId = initialMissileId;
    timer = initialTimer;
    roundOver = initialRoundOver;
    score = initialScore;
    gameState = initialGameState;

    cometLimit = initialCometLimit;
    cometRate = initialCometRate;
    cometHealth = initialCometHealth;
    cometSpeed = initialCometSpeed;
    ultimateComet = initialUltimateComet;

}

