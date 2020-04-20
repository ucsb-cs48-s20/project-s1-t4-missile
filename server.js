const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server)
const next = require('next');

const dev = process.env.NODE_ENV
const nextApp = next({dev});
const nextHandler = nextApp.getRequestHandler();

const PORT = process.env.PORT || 3000;

nextApp.prepare().then(() => {
    app.get('*', (req, res) => {
        return nextHandler(req, res)
    })
    
    server.listen(PORT, (err) => {
        if (err) throw err
        console.log(`> Ready on ${PORT}`)
    })
})


let players = {}; //stores all players in an object
let missiles = {};

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
    if (nextSlot == -1){
        console.log('Game\'s full sorry')
        return;
    }
    playerSlots[nextSlot] = socket.id;

    players[socket.id] = { //on player connect, new player object is created w/ rotation, x-y coords, id, and a random team
        rotation: 0,
        x: 100 + 200*nextSlot, //Math.floor(Math.random() * 700) + 50,
        y: 500,//Math.floor(Math.random() * 500) + 50,
        playerId: socket.id,
    };

    //Event called currentPlayers passes players object to the new players so their client can render them
    socket.emit('currentPlayers', players); 
    socket.broadcast.emit('newPlayer', players[socket.id]); //passing new player's object to all other players so they can render
    socket.on('disconnect', function() {
        console.log('Disconnect')
        delete players[socket.id]; //removes the player
        removeFromSlot(socket.id);
        io.emit('disconnect', socket.id); //tells all other clients to remove the player
    })

    socket.on('missileShot', function(missileData) {
        missileData["id"] = missileId;
        console.log(missileData);
        missiles[missileId] = missileData;
        console.log("Missile " + missiles[missileId].id + " created");
        missileId++;
        io.emit('newMissile', missiles[missileId-1]);
    })
})

function getNextSlot(){
    for (i = 0; i < 4; i += 1)
    {
        if (!playerSlots[i]){ return i; }
    }
    return -1;
}

function removeFromSlot(id){
    for (i = 0; i < 4; i += 1)
    {
        if (playerSlots[i] == id){ playerSlots[i] = undefined; return; }
    }
    return;
}

function updateMissiles() {
    Object.keys(missiles).forEach(id => {
        missiles[id].x = missiles[id].x + missiles[id].speedX;
        missiles[id].y = missiles[id].y + missiles[id].speedY;
        if(missiles[id].x < -10 || missiles[id].x > 4000 || missiles[id].y < -10 || missiles[id].y > 4000) {
            delete missiles[id];
            io.emit('missileDestroyed', id);
        }
    })
    io.emit('missileUpdate', missiles);
}

setInterval(updateMissiles, 16);