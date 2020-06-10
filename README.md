# Missile Defense

![Game picture](https://github.com/ucsb-cs48-s20/project-s1-t4-missile/blob/master/missiledefense.png)

Realtime multiplayer missile defense game, inspired by Atari's 1980 title Missile Command!

Work with up to 3 other players to defend your base from the falling comets for as long as you can.

Upgrade your turrets and use special consumables to keep the onslaught of comets at bay as they increase in number and strength.

## Creators

- Xinyi Zhang (XhenryZhang)

- Brian Qiu (brianlqiu)

- Jeffrey Sun (jsun454)

- Parth Atre (parthatre)

- Alexander Lancaster (zonkman)

## Tech Stack

- Next.js 
- Socket.io
- Phaser3

## User Roles

- Players - Users who assume control of a turret and can play the game
- Spectators - Users who can watch players play the game

## Roles and Permissions

There are no restrictions on who can play the game.

## Development Instructions

- Run `npm install` to install all dependencies (including next.js, Phaser, and socket.io).
- Use `npm run devsite` to make Next rebuild the pages and boot up the server on `localhost:3000`, which is necessary if you've made changes to any React components  
- Use `npm run devgame` to restart the server, which is necessary if changes were made to `server.js` or you want to reset the gamestate
- Refresh if all you need to do is see changes made in any of the static Javascript files rendered on the client side (any game related code besides `server.js`)

## Storybook Setup

1. Use `npm run storybook` to open React Storybook locally on localhost:6006.

2. Use `npm run build-storybook` to create a static storybook for Github Pages.

## Deployment Instructions

Deployment instructions can be found [here](./docs/DEPLOY.md)


