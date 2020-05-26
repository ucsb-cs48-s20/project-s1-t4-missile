# Missile Defense

Missile defense game with multiplayer support.

Xinyi Zhang (XhenryZhang)

Brian Qiu (brianlqiu)

Jeffrey Sun (jsun454)

Parth Atre (parthatre)

Alexander Lancaster (zonkman)

# Tech Stack

next.js + socket.io + Phaser3

# Description

A website where players can join rooms and play games of missile defense up to 4 players. Players can join using a lobby code. The game includes a scaling difficulty system and an upgrade system.

# User Roles

Player - the people playing the game

# Roles and Permissions

There are no restrictions on who can play the game.

# How to run/develop 

1. Run `npm install` to install all dependencies (including next.js, Phaser, and socket.io).

2. a) If this is your first time running/you've made changes to the html (stuff unrelated to the game), run `npm run devsite`. This automatically rebuilds the code with next and then starts up the server on localhost:3000.<br/><br/> b) If you've made changes to server.js but not the html, run `npm run devgame` to just restart the server.<br/><br/> c) If you've only made changes to game.js, a simple refresh should let you see the changes you've made without restarting the server.

* [Deployment Instructions](./docs/DEPLOY.md)


