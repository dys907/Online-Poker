// server-side socket.io backend event handling
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const Game = require('./classes/game.js');
const PowerUp = require('./classes/powerup.js');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const PORT = process.env.PORT || 3000;

app.use('/', express.static(__dirname + '/client'));

let rooms = [];

io.on("connection", (socket) => {
  console.log("new connection ", socket.id);
  socket.on("host", (data) => {
    if (data.username == "" || data.username.length > 12) {
      socket.emit("hostRoom", undefined);
    } else {
      let code;
      do {
        code =
          "" +
          Math.floor(Math.random() * 10) +
          Math.floor(Math.random() * 10) +
          Math.floor(Math.random() * 10) +
          Math.floor(Math.random() * 10);
      } while (rooms.length != 0 && rooms.some((r) => r.getCode() === code));
      const game = new Game(code, data.username);
      rooms.push(game);
      game.addPlayer(data.username, socket);
      game.emitPlayers("hostRoom", {
        code: code,
        players: game.getPlayersArray(),
      });
    }
  });

  socket.on("join", (data) => {
    const game = rooms.find((r) => r.getCode() === data.code);
    if (
      game == undefined ||
      game.getPlayersArray().some((p) => p == data.username) ||
      data.username == undefined ||
      data.username.length > 12
    ) {
      socket.emit("joinRoom", undefined);
    } else {
      game.addPlayer(data.username, socket);
      rooms = rooms.map((r) => (r.getCode() === data.code ? game : r));
      game.emitPlayers("joinRoom", {
        host: game.getHostName(),
        players: game.getPlayersArray(),
      });
      game.emitPlayers("hostRoom", {
        code: data.code,
        players: game.getPlayersArray(),
      });
    }
  });

  socket.on("startGame", (data) => {
    const game = rooms.find((r) => r.getCode() == data.code);
    if (game == undefined) {
      socket.emit("gameBegin", undefined);
    } else {
      game.emitPlayers("gameBegin", { code: data.code });
      game.startGame();
    }
  });

  socket.on("evaluatePossibleMoves", () => {
    const game = rooms.find(
      (r) => r.findPlayer(socket.id).socket.id === socket.id
    );
    if (game.roundInProgress) {
      const possibleMoves = game.getPossibleMoves(socket);
      const player = game.findPlayer(socket.id);
      socket.emit("displayPossibleMoves", {moves: possibleMoves, hasTimer: player.hasTimer});
    }
  });

  socket.on("raiseModalData", () => {
    const game = rooms.find(
      (r) => r.findPlayer(socket.id).socket.id === socket.id
    );
    if (game != undefined) {
      socket.emit("updateRaiseModal", {
        topBet: game.getCurrentTopBet(),
        usernameMoney:
          game.getPlayerBetInStage(game.findPlayer(socket.id)) +
          game.findPlayer(socket.id).getMoney(),
      });
    }
  });

  socket.on("startNextRound", () => {
    const game = rooms.find(
      (r) => r.findPlayer(socket.id).socket.id === socket.id
    );
    if (game != undefined) {
      if (game.roundInProgress === false) {
        if((game.roundNum + 1) % 2 == 0) {
          console.log("We are here");
          givePlayerPowerUps(game);
        }
        game.startNewRound();
      }
    }
  });

  // precondition: user must be able to make the move in the first place.
  socket.on("moveMade", (data) => {
    // worst case complexity O(num_rooms * num_players_in_room)
    const game = rooms.find(
      (r) => r.findPlayer(socket.id).socket.id === socket.id
    );

    if (game != undefined) {
      if (data.move == "fold") {
        game.fold(socket);
      } else if (data.move == "check") {
        game.check(socket);
      } else if (data.move == "bet") {
        game.bet(socket, data.bet);
      } else if (data.move == "call") {
        game.call(socket);
      } else if (data.move == "raise") {
        game.raise(socket, data.bet);
      }
    } else {
      console.log("ERROR: can't find game!!!");
    }
  });

  socket.on("disconnect", () => {
    const game = rooms.find(
      (r) => r.findPlayer(socket.id).socket.id === socket.id
    );
    if (game != undefined) {
      const player = game.findPlayer(socket.id);
      game.disconnectPlayer(player);
      if (game.players.length == 0) {
        if (this.rooms != undefined && this.rooms.length !== 0) {
          this.rooms = this.rooms.filter((a) => a != game);
        }
      }
    }
  });

  socket.on('getPowerUp', (data) => {
    const game = rooms.find(
      (r) => r.findPlayer(socket.id).socket.id === socket.id
    );
    const powerUpNum = data.powerUpNum;
    const listener = data.listener;
    if (game.roundInProgress) {
      const player = game.findPlayer(socket.id);
      const powerUpName = player.powerUps[powerUpNum - 1];

      let powerUpObj;
      if (powerUpName != '') powerUpObj = PowerUp[powerUpName];
      // maybe add some warning here saying this powerup doesnt exist or something
      if (powerUpName != '') {
        socket.emit(listener, powerUpObj);
      }
    }
  })

  // power up
  // listening to revealCommunityCard from client
  // send back card data to client showCommunityCard
  socket.on("powerUp", (data) => {
    const game = rooms.find(
      (r) => r.findPlayer(socket.id).socket.id === socket.id
    );
    let powerup = data.powerup;
    let target = data.target;
    if (game.roundInProgress) {
      //let powerup = '';
      const player = game.findPlayer(socket.id);
      let otherplayer;
      //testing
      if (target) otherplayer = game.findPlayerWithName(target);
      // if (num == 1) {
      //   powerup = player.powerUps[0];
      // } else {
      //   powerup = player.powerUps[1];
      // }
      let time = new Date();
      let fulltime = time.getHours() + ":" + time.getMinutes() + ":" + time.getSeconds();
      let powerUpName = PowerUp[powerup].logName;
      // broadcast to everyone
      io.emit("updatePowerUpLog", {
        user: player.username,
        target: target? otherplayer.username : null,
        powerUpName: powerUpName,
        time: fulltime,
      })

      switch (powerup) {
        case "showCommunityCard":
          const lastCard = game.thisRoundsCards[4];
          socket.emit(powerup, lastCard);
          break;

        case 'ghostBet':
          socket.emit(powerup, player.username);
          break;
        case "showPlayerCard":
          const revealCard = otherplayer.cards[0];
          socket.emit(powerup, revealCard);
          break;
        case "swapWithPlayer":
          const thisPlayersCards = player.cards;
          const targetPlayersCards = otherplayer.cards;
          player.cards = targetPlayersCards;
          otherplayer.cards = thisPlayersCards;
          // this is to the player that used powerup
          // reference:
          // https://stackoverflow.com/questions/10058226/send-response-to-all-clients-except-sender
          socket.emit(powerup, targetPlayersCards)
          // this is to the target
          socket.broadcast.to(otherplayer.socket.id).emit(powerup, thisPlayersCards);
          break;
        case "swapChipsWithPlayer":
          //dylan
          const thisPlayersStack = player.money;
          const targetPlayersStack = otherplayer.money;
          player.money = targetPlayersStack;
          otherplayer.money = thisPlayersStack;
          //rerender the game for all players to update chip count
          //socket.emit('message','player 1 swapped with player 2 etc')
          game.rerender();
          break;
        case "redealOwnHand":
          let card1 = game.deck.dealRandomCard();
          let card2 = game.deck.dealRandomCard();
          if (card1 && card2) {
            let redealtCards =[card1,card2];
            player.cards = redealtCards;
            socket.emit('swapWithPlayer', redealtCards);
          }
          break;
        case 'nozdormu':
          otherplayer.hasTimer = true;
          break;
        case 'forceDC':
          game.disconnectPlayer(otherplayer);
          socket.broadcast.to(otherplayer.socket.id).emit(powerup, player.username);
          break;
        default:
          break;
      }
    }
  });

  socket.on("showSelectTarget", (powerup) => {
    const game = rooms.find(
      (r) => r.findPlayer(socket.id).socket.id === socket.id
    );
    if (game.roundInProgress) {
      const player = game.findPlayer(socket.id);
      let nameArr = [];
      game.players.forEach((p) => {
        if (player != p) nameArr.push(p.username);
      });
      // back to client with list of players and power up name
      socket.emit("selectTarget", {
        playerNames: nameArr,
      });
      // switch (powerup) {
      //   // probably doesn't need switch
      //   case "showPlayerCard":
      //     let nameArr = [];
      //     game.players.forEach((p) => {
      //       nameArr.push(p.username);
      //     });
      //     // back to client with list of players and power up name
      //     socket.emit("selectTarget", {
      //       powerup: powerup,
      //       playerNames: nameArr,
      //     });
      //   // const revealCard = otherplayer.cards[0];
      //   // socket.emit(powerup, revealCard);
      //   default:
      //     break;
      // }
    }
  });

  //deal powerup dylan
  var givePlayerPowerUps = (game) => {
    let powerup;
    let powerupImg;
    for (pn = 0; pn < game.players.length; pn++) {
      console.log(game.players[pn].username);
      if(game.players[pn].powerUps[0] == "") {
        //distribute code
        let powerupArr = distributePowerup()
        game.players[pn].powerUps[0] = powerupArr[0];
        powerupImg = powerupArr[1];
        powerup = 1;
      } else if (game.players[pn].powerUps[1] == "") {
        //distribution code
        let powerupArr = distributePowerup()
        game.players[pn].powerUps[1] = powerupArr[0];
        powerupImg = powerupArr[1];
        powerup = 2;
      }

      io.to(game.players[pn].socket.id).emit('renderPowerups',{
        position:powerup,
        src: powerupImg
      });

    }
  }

  var distributePowerup =() => {
    let weightArr = [];
    //gets total weight
    let weightCount = 0;
    for(const powerup in PowerUp) {
          weightArr[weightCount] = PowerUp[powerup].weight + (weightArr[weightCount - 1] || 0);
          weightCount++;
    }
    // for(let i = 0; i < Object.keys(PowerUp).length; i++) {
    //   weight[i] = PowerUp[i].weight + (PowerUp[i-1] || 0);
    // }
    let random = Math.random() * weightArr[weightArr.length - 1];

    let choice = 0;
    for(choice; choice < weightArr.length; choice++) {
      if (weightArr[choice] > random) {
        break;
      }
    }

    let payload = [PowerUp[Object.keys(PowerUp)[choice]].name,PowerUp[Object.keys(PowerUp)[choice]].src];
    return payload;
  }

  // socket.on('givePlayerPowerUp', (data) =>{
  //   const game = rooms.find(
  //     (r) => r.findPlayer(socket.id).socket.id === socket.id
  //   );
  //   game.this
  //   console.log("tet");
  // })


});


server.listen(PORT, () => console.log(`hosting on port ${PORT}`));
