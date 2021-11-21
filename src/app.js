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
      socket.emit("displayPossibleMoves", possibleMoves);
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
      const powerUpObj = PowerUp[powerUpName];
      // maybe add some warning here saying this powerup doesnt exist or something
      if (powerUpName != '') socket.emit(listener, powerUpObj);
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
      //testing
      const otherplayer = game.findPlayerWithName(target);
      // if (num == 1) {
      //   powerup = player.powerUps[0];
      // } else {
      //   powerup = player.powerUps[1];
      // }
      switch (powerup) {
        case "showCommunityCard":
          const lastCard = game.thisRoundsCards[4];
          socket.emit(powerup, lastCard);
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
  socket.on('startCall', (roomId, peerUuid) => {
    console.log(`Broadcasting start_call event to peers in room ${roomId}`);
    socket.broadcast.to(roomId).emit('startCall', peerUuid);
  });
  socket.on('webrtc_offer', (event) => {
    console.log(`Broadcasting webrtc_offer event to peers in room ${event.roomId}`);
    socket.broadcast.to(event.roomId).emit('webrtc_offer', event.sdp);
  });
  socket.on('webrtc_answer', (event) => {
    console.log(`Broadcasting webrtc_answer event to peers in room ${event.roomId}`);
    socket.broadcast.to(event.roomId).emit('webrtc_answer', event.sdp);
  });
  socket.on('webrtc_ice_candidate', (event) => {
    console.log(`Broadcasting webrtc_ice_candidate event to peers in room ${event.roomId}`);
    socket.broadcast.to(event.roomId).emit('webrtc_ice_candidate', event);
  });
});


server.listen(PORT, () => console.log(`hosting on port ${PORT}`));
