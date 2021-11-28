$(document).ready(function () {
  $('#gameDiv').hide();
  $('.modal-trigger').leanModal();
  $('.tooltipped').tooltip({ delay: 50 });
});



// WebRTC Specifics
const localVideoComponent = document.getElementById('local-video')
const remoteVideoComponent = document.getElementById('remote-video')

const mediaConstraints = {
  audio: true,
  video: {
    width: {max: 320},
    height: {max: 240},
    frameRate: {max: 30},
  },
}
let localName;
let localUuid;
let localStream;
setLocalStream(mediaConstraints);
let host = false;

var roomId;
var serverConnection;
var peerConnections = {};

// Free STUN servers
// const iceServers = {
//   iceServers: [
//     { urls: 'stun:stun.l.google.com:19302' },
//     { urls: 'stun:stun1.l.google.com:19302' },
//   ],
// }

var iceServers = {
  'iceServers': [
    { 'urls': 'stun:stun.stunprotocol.org:3478' },
    { 'urls': 'stun:stun.l.google.com:19302' },
  ],
  
};

var socket = io.connect();
var gameInfo = null;

socket.on('playerDisconnected', function (data) {
  Materialize.toast(data.player + ' disconnected.', 4000);
});

socket.on('hostRoom', async function (data) {
  if (data != undefined) {
    if (data.players.length >= 11) {
      $('#hostModalContent').html(
        '<h5>Code:</h5><code>' +
          data.code +
          '</code><br /><h5>Warning: you have too many players in your room. Max is 11.</h5><h5>Players Currently in My Room</h5>'
      );
      $('#playersNames').html(
        data.players.map(function (p) {
          return '<span>' + p + '</span><br />';
        })
      );
    } else if (data.players.length > 1) {
      $('#hostModalContent').html(
        '<h5>Code:</h5><code>' +
          data.code +
          '</code><br /><h5>Players Currently in My Room</h5>'
      );
      $('#playersNames').html(
        data.players.map(function (p) {
          return '<span>' + p + '</span><br />';
        })
      );
      $('#startGameArea').html(
        '<br /><button onclick=startGame(' +
          data.code +
          ') type="submit" class= "waves-effect waves-light green darken-3 white-text btn-flat">Start Game</button >'
      );
    } else {
      $('#hostModalContent').html(
        '<h5>Code:</h5><code>' +
          data.code +
          '</code><br /><h5>Players Currently in My Room</h5>'
      );
      $('#playersNames').html(
        data.players.map(function (p) {
          return '<span>' + p + '</span><br />';
        })
      );

      // await createOffer();
      // setUpPeer(socket.id, localName, true);
      // peerConnections[socket.id].pc.createOffer().then(description => createdDescription(description, socket.id)).catch(errorHandler);

    }
  } else {
    Materialize.toast(
      'Enter a valid name! (max length of name is 12 characters)',
      4000
    );
    $('#joinButton').removeClass('disabled');
  }
});

socket.on('hostRoomUpdate', function (data) {
  $('#playersNames').html(
    data.players.map(function (p) {
      return '<span>' + p + '</span><br />';
    })
  );
  if (data.players.length == 1) {
    $('#startGameArea').empty();
  }
});

socket.on('joinRoomUpdate', function (data) {
  $('#startGameAreaDisconnectSituation').html(
    '<br /><button onclick=startGame(' +
      data.code +
      ') type="submit" class= "waves-effect waves-light green darken-3 white-text btn-flat">Start Game</button >'
  );
  $('#joinModalContent').html(
    '<h5>' +
      data.host +
      "'s room</h5><hr /><h5>Players Currently in Room</h5><p>You are now a host of this game.</p>"
  );

  $('#playersNamesJoined').html(
    data.players.map(function (p) {
      return '<span>' + p + '</span><br />';
    })
  );
});

socket.on('joinRoom', async function (data) {
  if (data == undefined) {
    $('#joinModal').closeModal();
    Materialize.toast(
      "Enter a valid name/code! (max length of name is 12 characters & cannot be the same as someone else's)",
      4000
    );
    $('#hostButton').removeClass('disabled');
  } else {

    $('#joinModalContent').html(
      '<h5>' +
        data.host +
        "'s room</h5><hr /><h5>Players Currently in Room</h5><p>Please wait until your host starts the game. Leaving the page, refreshing, or going back will disconnect you from the game. </p>"
    );
    $('#playersNamesJoined').html(
      data.players.map(function (p) {
        return '<span>' + p + '</span><br />';
      })
    );
  }
});

socket.on('dealt', function (data) {
  $('#mycards').html(
    data.cards.map(function (c) {
      return renderCard(c);
    })
  );
  $('#usernamesCards').text(data.username + ' - My Cards');
  $('#mainContent').remove();
});

socket.on('rerender', function (data) {
  if (data.myBet == 0) {
    $("#usernamesCards").text(data.username + " - My Cards");
  } else {
    $("#usernamesCards").text(data.username + " - My Bet: $" + data.myBet);
  }
  if (data.community != undefined) {
    $("#revealedCardsLogText").empty();
    $("#communityCards").html(
      data.community.map(function (c) {
        return renderCard(c);
      })
    );
  } else {
    $("#communityCards").html("<p></p>");
  }
  if (data.currBet == undefined) data.currBet = 0;
  $('#table-title').text(
    'Game ' +
      data.round +
      '    |    ' +
      data.stage +
      '    |    Current Top Bet: $' +
      data.topBet +
      '    |    Pot: $' +
      data.pot
  );
  $('#opponentCards').html(
    data.players.map(function (p) {
      return renderOpponent(p.username, {
        text: p.status,
        money: p.money,
        blind: p.blind,
        bets: data.bets,
        buyIns: p.buyIns,
        isChecked: p.isChecked,
      });
    })
  );
  renderSelf({
    money: data.myMoney,
    text: data.myStatus,
    blind: data.myBlind,
    bets: data.bets,
    buyIns: data.buyIns,
  });
  if (!data.roundInProgress) {
    $('#usernameFold').hide();
    $('#usernameCheck').hide();
    $('#usernameBet').hide();
    $('#usernameCall').hide();
    $('#usernameRaise').hide();
  }
});

socket.on('gameBegin', function (data) {
  $('#navbar-ptwu').hide();
  $('#joinModal').closeModal();
  $('#hostModal').closeModal();
  if (data == undefined) {
    alert('Error - invalid game.');
  } else {
    $('#gameDiv').show();
    // $('#cameraBox').show();
    $('#cameraBox').css('display', 'flex');
    $('#cameraBox').css('flex-direction', 'row');
    $("#powerUpLogContainer").show();
    $("#revealedCardsLogContainer").show();
    $("#faqBtn").show();
  }
});

// socket.on('startCall',  async (peerUuid) => {
//   // Possibly should be when the user joins the room, as 
//   // no networking is needed to establish this part.
//   console.log('Setting local stream');
//   await setLocalStream(mediaConstraints);

//   console.log('Socket event callback: startCall');
//   rtcPeerConnection = new RTCPeerConnection();
//   addLocalTracks(rtcPeerConnection);
//   rtcPeerConnection.ontrack = setRemoteStream;
//   rtcPeerConnection.onicecandidate = sendIceCandidate;
//   await createOffer(rtcPeerConnection);
// })

// -----------------------------------------------------
// ------------------- Start of webRTC -----------------
// -----------------------------------------------------

/**
 * 
 * Caller sends socket ID to server
 * Server relays that to everyone else
 * Everyone else creates a local desc of their socket in peer connections
 * Caller creates local description?
 * And then creates answer?
 * 
 * Caller creates the offer
 * Server relays that offer to everyone else
 * Everyone else generates answer
 * Sends back to caller
 * 
 * 
 * 
 */

socket.on('prep_call', (data) => {
  if (data.socketId === socket.id) return;

  console.log("Who am i PREP CALL");
    console.log("target: "+ data.socketId);
    console.log("me: "+ socket.id);

  //Set up peer?
  setUpPeer(data.socketId, data.name, true);
  // createOffer(socketId);
  
  socket.emit('start_call', {
    socketId: socket.id,
    name: localName,
    target: data.socketId,
  });

});

socket.on('start_call', (data) => {
  if (data.target === socket.id) {
    setUpPeer(data.socketId, localName, true);

    console.log("Who am i START CALL:");
    console.log("target: "+data.target);
    console.log("me: "+ data.socketId);
    createOffer(data.socketId);

  }
});

//Creates the WebRTC handshake offer.
//Is called when client clicks JOIN ROOM
async function createOffer(targetSocket) {
  try {
   

    await peerConnections[targetSocket].pc.createOffer()
    .then(async (offer) => {
      
      console.log("Creating offer function called, making offer");
      console.log(peerConnections[targetSocket].pc);
      console.log(peerConnections[targetSocket].pc.signalingState);

      // console.log(offer);
      console.log(`TARGET SOCKET IN CREATEOFFER: ${targetSocket}`);
      await peerConnections[targetSocket].pc.setLocalDescription(offer);

      console.log(peerConnections[targetSocket].pc.signalingState);

      // console.log("client socket id in createOffer: "+socket.id);
      socket.emit('webrtc_offer', {
        type: 'offer',
        sdp: offer,
        requesterSocketId: socket.id,
        target: targetSocket,
      });
    });
  } catch (error) {
    console.error(`Error creating offer: ${error}`);
  }
}

function setUpPeer(socketId, displayName, initCall = false) {
  peerConnections[socketId] = { 'displayName': displayName, 'pc': new RTCPeerConnection(iceServers) };
  peerConnections[socketId].pc.onicecandidate = event => gotIceCandidate(event, socketId);
  peerConnections[socketId].pc.ontrack = event => setCameraPortrait(event, socketId);
  peerConnections[socketId].pc.oniceconnectionstatechange = event => checkPeerDisconnect(event, socketId);
  // localStream.getTracks().forEach(track => peerConnections[socketId].pc.addTrack(track, localStream));
  peerConnections[socketId].pc.addStream(localStream);

}

function checkPeerDisconnect(event, socketId) {
  var state = peerConnections[socketId].pc.iceConnectionState;
  console.log(`connection disconnect with peer ${socketId}`);
  if (state === "failed" || state === "closed" || state === "disconnected") {
    delete peerConnections[socketId];
    document.getElementById('videos').removeChild(document.getElementById('remoteVideo_' + socketId));
  }
}

function setCameraPortrait(event, socketId) {
  console.log(`SET CAMERA: got remote stream, peer ${socketId}`);
  // console.log(event);



  if (event.track.kind == "audio") return;

  const cameraContainer = document.getElementById("cameraBox");

  let vidElement = document.createElement('video');
  vidElement.setAttribute('autoplay', '');
  vidElement.setAttribute('muted', 'false');
  vidElement.srcObject = event.streams[0];
  vidElement.width = 160;
  vidElement.height = 120;

  let vidContainer = document.createElement('div');
  vidContainer.setAttribute('id', 'remoteVideo_' + socketId);
  vidContainer.setAttribute('class', 'videoContainer');
  vidContainer.appendChild(vidElement);
  // vidContainer.appendChild(makeLabel(peerConnections[socketId].displayName));

  document.getElementById('cameraBox').appendChild(vidContainer);
}


function gotIceCandidate(event, targetSocketId) {
  // console.log("got ice candidate check1");
  // if (targetSocketId !== socket.id) return;
  // console.log("got ice candidate check2");

  if (event.candidate != null) {
    console.log("EVENT.CANDIDATE FOR ICE CANDIDATE IS VALID");
    // console.log(event);

    //event => { isTrusted : true}
    // event.candidate => { candidate stuff (?)}

    socket.emit('webrtc_ice_candidate', {
      ice: event.candidate,
      fromSocketId: socket.id,
      dest: targetSocketId
    });
  }
}
let count = 0;
// Handles untargeted calls
socket.on('webrtc_ice_candidate', async (event) => {
  console.log("is webrtc-ice_candidate called at all?");
  if (event.dest == socket.id) {
    try {
      console.log("adding ice candidate");
      
      // await peerConnections[event.fromSocketId].pc.addIceCandidate(new RTCIceCandidate(event.ice));
      await peerConnections[event.fromSocketId].pc.addIceCandidate(event.ice);
      console.log(peerConnections[event.fromSocketId].pc);

    } catch (e) {
      console.log(`Error adding received ice candidate: ${e}`);
    }
  }
});

socket.on('webrtc_offer', async (event) => {
  if (event.target !== socket.id) return;
  console.log('Socket event callback: webrtc_offer');
  
  // Set up remote
  setUpPeer(event.requesterSocketId, event.requesterDisplayName);
  console.log('STATE before setRemote: ' + peerConnections[event.requesterSocketId].pc.signalingState);


  //Create answer
  // console.log('STATE: ' + peerConnections[socket.id].pc.signalingState);
  await peerConnections[event.requesterSocketId].pc.setRemoteDescription(event.sdp)
    .then(async () => {
      console.log("1st then");
      console.log('STATE IN 1st THEN: ' + peerConnections[event.requesterSocketId].pc.signalingState);

      await peerConnections[event.requesterSocketId].pc.createAnswer()
    .then(async (sessionDescription) => {
      console.log("2nd then");
      console.log('STATE IN 2nd THEN: ' + peerConnections[event.requesterSocketId].pc.signalingState);


      await peerConnections[event.requesterSocketId].pc.setLocalDescription(sessionDescription);

      console.log('STATE IN THEN: ' + peerConnections[event.requesterSocketId].pc.signalingState);
      //targetId isnt' being set, where is this from???
      socket.emit('webrtc_answer', {
        type: 'answer',
        sdp: sessionDescription,
        answererId: socket.id,
        targetId: event.requesterSocketId,
      });
    })
    .catch(e => {
      console.log(`Error creating webrtc offer in listener: ${e}`);
    });

  });
  // console.log('STATE: ' + peerConnections[socket.id].pc.signalingState);

    
  
});

// Better to broadcast only to the desired person.
// Could use player.emit to target emit only to 1 person.
socket.on('webrtc_answer', async (event) => {
  console.log('Socket event callback: webrtc_answer');
  // console.log(peerConnections[event.answererId].pc);

  if (event.targetId == socket.id) {
    console.log("test1");
    // console.log(peerConnections[event.answererId].pc);
    console.log(`AnswererID in WEBRTC_ANSWER: ${event.answererId}`);

    // setUpPeer(event.answererId, event.answererName);
    // console.log(peerConnections[event.answererId].pc.signalingState);
    
    console.log("test2");
    await peerConnections[event.answererId].pc.setRemoteDescription(event.sdp);
    console.log("test3");
  }
  // peerConnections[socketId].pc.setRemoteDescription(new RTCSessionDescription(event.sdp));
});

async function setLocalStream(mediaConstraints) {
  let stream;
  console.log('SET LOCAL STREAM');
  try {
    stream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
      .then(stream => {
        // stream.getAudioTracks()[0].enabled = false;
        localStream = stream;

        let vidElement = document.createElement('video');
        
        vidElement.autoplay = true;
        vidElement.muted = true;
        vidElement.srcObject = localStream;
        vidElement.width = 160;
        vidElement.height = 120;
      
        let vidContainer = document.createElement('div');
        vidContainer.setAttribute('id', 'remoteVideo_' + "host");
        vidContainer.setAttribute('class', 'videoContainer');
      
        vidContainer.appendChild(vidElement);
        // vidContainer.appendChild(makeLabel(peerConnections[socketId].displayName));
  
        document.getElementById('cameraBox').appendChild(vidContainer); 
        console.log('Stream has been set');
      });
  } catch (error) {
    console.error('Could not get user media', error)
  }
  

  // localVideoComponent.srcObject = stream;
}

function addLocalTracks(rtcPeerConnection) {
  localStream.getTracks().forEach((track) => {
    console.log("rctcon " + rtcPeerConnection);
    rtcPeerConnection.addTrack(track, localStream)
  })
}
function setRemoteStream(event) {
  remoteStream = event.stream;
  this.setState({ remStream : event.streams[0]});
}

// function sendIceCandidate(event) {
//   if (event.candidate) {
//     socket.emit('webrtc_ice_candidate', {
//       label: event.candidate.sdpMLineIndex,
//       candidate: event.candidate.candidate,
//     })
//   }
// }

function errorHandler(error) {
  console.log(error);
}
// -----------------------------------------------------
// ------------------ Cutoff for webRTC ----------------
// -----------------------------------------------------

function playNext() {
  socket.emit('startNextRound', {});
}

socket.on('reveal', function (data) {
  $('#usernameFold').hide();
  $('#usernameCheck').hide();
  $('#usernameBet').hide();
  $('#usernameCall').hide();
  $('#usernameRaise').hide();

  for (var i = 0; i < data.winners.length; i++) {
    if (data.winners[i] == data.username) {
      Materialize.toast('You won the hand!', 4000);
      break;
    }
  }
  $('#table-title').text('Hand Winner(s): ' + data.winners);
  $('#playNext').html(
    '<button onClick=playNext() id="playNextButton" class="btn white black-text menuButtons">NEXT GAME</button>'
  );
  $('#blindStatus').text(data.hand);
  $('#usernamesMoney').text('$' + data.money);
  $('#opponentCards').html(
    data.cards.map(function (p) {
      return renderOpponentCards(p.username, {
        cards: p.cards,
        folded: p.folded,
        money: p.money,
        endHand: p.hand,
        buyIns: p.buyIns,
      });
    })
  );
});

socket.on('endHand', function (data) {
  $('#usernameFold').hide();
  $('#usernameCheck').hide();
  $('#usernameBet').hide();
  $('#usernameCall').hide();
  $('#usernameRaise').hide();
  $('#table-title').text(data.winner + ' takes the pot of $' + data.pot);
  $('#playNext').html(
    '<button onClick=playNext() id="playNextButton" class="btn white black-text menuButtons">NEXT GAME</button>'
  );
  $('#blindStatus').text('');
  if (data.folded == 'Fold') {
    $('#status').text('You Folded');
    $('#playerInformationCard').removeClass('theirTurn');
    $('#playerInformationCard').removeClass('green');
    $('#playerInformationCard').addClass('grey');
    $('#usernameFold').hide();
    $('#usernameCheck').hide();
    $('#usernameBet').hide();
    $('#usernameCall').hide();
    $('#usernameRaise').hide();
  }
  $('#usernamesMoney').text('$' + data.money);
  $('#opponentCards').html(
    data.cards.map(function (p) {
      return renderOpponent(p.username, {
        text: p.text,
        money: p.money,
        blind: '',
        bets: data.bets,
      });
    })
  );
});

var beginHost = function () {
  if ($('#hostName-field').val() == '') {
    $('.toast').hide();
    $('#hostModal').closeModal();
    Materialize.toast(
      'Enter a valid name! (max length of name is 12 characters)',
      4000
    );
    $('#joinButton').removeClass('disabled');
  } else {
    localName = $('#hostName-field').val();
    socket.emit('host', { username: $('#hostName-field').val() });
    $('#joinButton').addClass('disabled');
    $('#joinButton').off('click');
    host = true;
  }
};

var joinRoom = async function () {
  // yes, i know this is client-side.
  if (
    $('#joinName-field').val() == '' ||
    $('#code-field').val() == '' ||
    $('#joinName-field').val().length > 12
  ) {
    $('.toast').hide();
    Materialize.toast(
      'Enter a valid name/code! (max length of name is 12 characters.)',
      4000
    );
    $('#joinModal').closeModal();
    $('#hostButton').removeClass('disabled');
    $('#hostButton').on('click');
  } else {
    // ---------------------------------
    // Probably don't put these here.
    // ---------------------------------
    // Save the room ID globally.
    roomId = $('#code-field').val();
    // Save display name globally.
    localName = $('#joinName-field').val();

    //Set the local stream
    if (navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia(mediaConstraints)
        .then(stream => {
          localStream = stream;
        }).catch(errorHandler);
        //Instantiate local rtcPeerConnection
    } else {
      alert('Your browser does not support getUserMedia API');
    }
    
    socket.emit('join', {
      code: $('#code-field').val(),
      username: $('#joinName-field').val(),
    });
    $('#hostButton').addClass('disabled');
    $('#hostButton').off('click');

    //Start everything webRTC
    //This should initiate a call with EVERYONE else in the lobby
    socket.emit('prep_call', {
      socketId: socket.id,
      name: localName,
    });
    // await createOffer();
  }
};

var startGame = function (gameCode) {
  socket.emit('startGame', { code: gameCode });
};

var fold = function () {
  socket.emit('moveMade', { move: 'fold', bet: 'Fold' });
};

var bet = function () {
  if (parseInt($('#betRangeSlider').val()) == 0) {
    Materialize.toast('You must bet more than $0! Try again.', 4000);
  } else if (parseInt($('#betRangeSlider').val()) < 2) {
    Materialize.toast('The minimum bet is $2.', 4000);
  } else {
    socket.emit('moveMade', {
      move: 'bet',
      bet: parseInt($('#betRangeSlider').val()),
    });
  }
};

function call() {
  socket.emit('moveMade', { move: 'call', bet: 'Call' });
}

var check = function () {
  socket.emit('moveMade', { move: 'check', bet: 'Check' });
};

var raise = function () {
  if (
    parseInt($('#raiseRangeSlider').val()) == $('#raiseRangeSlider').prop('min')
  ) {
    Materialize.toast(
      'You must raise higher than the current top bet! Try again.',
      4000
    );
  } else {
    socket.emit('moveMade', {
      move: 'raise',
      bet: parseInt($('#raiseRangeSlider').val()),
    });
  }
};

var hideTarget = function() {
  $("#confirmTarget").removeAttr('powerUpNum');
  $("#targetModal").hide();
}

var target = function(){
  let powerUpNum = $("#confirmTarget").attr("powerUpNum");
  $("#confirmTarget").removeAttr('powerUpNum');
  socket.emit('getPowerUp', {
    powerUpNum: powerUpNum,
    listener: "submitPowerUp"
  })
}

var showToolTip = (btnNum) => {
  socket.emit('getPowerUp', {
    powerUpNum: btnNum,
    listener: "displayToolTip"
  });
}

var hideToolTip = () => {
  $("#powerUpToolTip").empty();
  $("#powerUpToolTip").hide();
}

function renderCard(card) {
  if (card.suit == '♠' || card.suit == '♣')
    return (
      '<div class="playingCard_black" id="card"' +
      card.value +
      card.suit +
      '" data-value="' +
      card.value +
      ' ' +
      card.suit +
      '">' +
      card.value +
      ' ' +
      card.suit +
      '</div>'
    );
  else
    return (
      '<div class="playingCard_red" id="card"' +
      card.value +
      card.suit +
      '" data-value="' +
      card.value +
      ' ' +
      card.suit +
      '">' +
      card.value +
      ' ' +
      card.suit +
      '</div>'
    );
}

function renderOpponent(name, data) {
  var bet = 0;
  if (data.bets != undefined) {
    var arr = data.bets[data.bets.length - 1];
    for (var pn = 0; pn < arr.length; pn++) {
      if (arr[pn].player == name) bet = arr[pn].bet;
    }
  }
  var buyInsText =
    data.buyIns > 0 ? (data.buyIns > 1 ? 'buy-ins' : 'buy-in') : '';
  if (data.buyIns > 0) {
    if (data.text == 'Fold') {
      return (
        '<div class="opponentCard"><div class="custom-card-opponent grey"><div class=" white-text"><span class="card-title">' +
        name +
        ' (Fold)</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br />' +
        data.blind +
        '<br />' +
        '</p></div><div class="card-action white-text center-align" style="font-size: 20px;">$' +
        data.money +
        ' (' +
        data.buyIns +
        ' ' +
        buyInsText +
        ')' +
        '</div></div></div>'
      );
    } else {
      if (data.text == 'Their Turn') {
        if (data.isChecked)
          return (
            '<div class="col s12 m2 opponentCard"><div class="custom-card-opponent yellow darken-3"><div class=" black-text"><span class="card-title">' +
            name +
            '<br />Check</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br /><br /><br />' +
            '</p></div><div class="card-action black-text center-align" style="font-size: 20px;">$' +
            data.money +
            ' (' +
            data.buyIns +
            ' ' +
            buyInsText +
            ')' +
            '</div></div></div>'
          );
        else if (bet == 0) {
          return (
            '<div class="col s12 m2 opponentCard"><div class="custom-card-opponent yellow darken-3"><div class=" black-text"><span class="card-title">' +
            name +
            '</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br /><br /><br />' +
            '</p></div><div class="card-action black-text center-align" style="font-size: 20px;">$' +
            data.money +
            ' (' +
            data.buyIns +
            ' ' +
            buyInsText +
            ')' +
            '</div></div></div>'
          );
        } else {
          return (
            '<div class="col s12 m2 opponentCard"><div class="custom-card-opponent yellow darken-3"><div class=" black-text"><span class="card-title">' +
            name +
            '<br />Bet: $' +
            bet +
            '</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br />' +
            '' +
            '</p></div><div class="card-action black-text center-align" style="font-size: 20px;">$' +
            data.money +
            ' (' +
            data.buyIns +
            ' ' +
            buyInsText +
            ')' +
            '</div></div></div>'
          );
        }
      } else {
        if (data.isChecked)
          return (
            '<div class="col s12 m2 opponentCard"><div class="custom-card-opponent green darken-2" ><div class=" white-text"><span class="card-title">' +
            name +
            '<br />Check</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br />' +
            '</p></div><div class="card-action white-text center-align" style="font-size: 20px;">$' +
            data.money +
            ' (' +
            data.buyIns +
            ' ' +
            buyInsText +
            ')' +
            '</div></div></div>'
          );
        else if (bet == 0) {
          return (
            '<div class="col s12 m2 opponentCard"><div class="custom-card-opponent green darken-2" ><div class=" white-text"><span class="card-title">' +
            name +
            '</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br /><br /><br />' +
            '</p></div><div class="card-action white-text center-align" style="font-size: 20px;">$' +
            data.money +
            ' (' +
            data.buyIns +
            ' ' +
            buyInsText +
            ')' +
            '</div></div></div>'
          );
        } else {
          return (
            '<div class="col s12 m2 opponentCard"><div class="custom-card-opponent green darken-2" ><div class=" white-text"><span class="card-title">' +
            name +
            '<br />Bet: $' +
            bet +
            '</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br /><br /><br />' +
            '</p></div><div class="card-action white-text center-align" style="font-size: 20px;">$' +
            data.money +
            ' (' +
            data.buyIns +
            ' ' +
            buyInsText +
            ')' +
            '</div></div></div>'
          );
        }
      }
    }
  }
  // buy-ins rendering
  else {
    if (data.text == 'Fold') {
      return (
        '<div class="col s12 m2 opponentCard"><div class="custom-card-opponent grey"><div class=" white-text"><span class="card-title">' +
        name +
        ' (Fold)</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br /><br /><br />' +
        data.blind +
        '<br />' +
        '</p></div><div class="card-action white-text center-align" style="font-size: 20px;">$' +
        data.money +
        '</div></div></div>'
      );
    } else {
      if (data.text == 'Their Turn') {
        if (data.isChecked)
          return (
            '<div class="col s12 m2 opponentCard"><div class="custom-card-opponent yellow darken-3"><div class=" black-text"><span class="card-title black-text">' +
            name +
            '<br />Check</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br />' +
            '</p></div><div class="card-action black-text center-align" style="font-size: 20px;">$' +
            data.money +
            '</div></div></div>'
          );
        else if (bet == 0) {
          return (
            '<div class="col s12 m2 opponentCard"><div class="custom-card-opponent yellow darken-3"><div class=" black-text"><span class="card-title black-text">' +
            name +
            '</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br /><br /><br />' +
            '</p></div><div class="card-action black-text center-align" style="font-size: 20px;">$' +
            data.money +
            '</div></div></div>'
          );
        } else {
          return (
            '<div class="col s12 m2 opponentCard"><div class="custom-card-opponent yellow darken-3"><div class=" black-text"><span class="card-title black-text">' +
            name +
            '<br />Bet: $' +
            bet +
            '</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br />' +
            '' +
            '</p></div><div class="card-action black-text center-align" style="font-size: 20px;">$' +
            data.money +
            '</div></div></div>'
          );
        }
      } else {
        if (data.isChecked)
          return (
            '<div class="col s12 m2 opponentCard"><div class="custom-card-opponent green darken-2" ><div class=" white-text"><span class="card-title">' +
            name +
            '<br />Check</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br /><br /><br />' +
            '</p></div><div class="card-action white-text center-align" style="font-size: 20px;">$' +
            data.money +
            '</div></div></div>'
          );
        else if (bet == 0) {
          return (
            '<div class="col s12 m2 opponentCard"><div class="custom-card-opponent green darken-2" ><div class=" white-text"><span class="card-title">' +
            name +
            '</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br /><br /><br />' +
            '</p></div><div class="card-action white-text center-align" style="font-size: 20px;">$' +
            data.money +
            '</div></div></div>'
          );
        } else {
          return (
            '<div class="col s12 m2 opponentCard"><div class="custom-card-opponent green darken-2" ><div class=" white-text"><span class="card-title">' +
            name +
            '<br />Bet: $' +
            bet +
            '</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br /><br /><br />' +
            '</p></div><div class="card-action white-text center-align" style="font-size: 20px;">$' +
            data.money +
            '</div></div></div>'
          );
        }
      }
    }
  }
}

function renderOpponentCards(name, data) {
  var bet = 0;
  if (data.bets != undefined) {
    var arr = data.bets[data.bets.length - 1].reverse();
    for (var pn = 0; pn < arr.length; pn++) {
      if (arr[pn].player == name) bet = arr[pn].bet;
    }
  }
  var buyInsText2 =
    data.buyIns > 0 ? (data.buyIns > 1 ? 'buy-ins' : 'buy-in') : '';
  if (data.buyIns > 0) {
    if (data.folded)
      return (
        '<div class="col s12 m2 opponentCard"><div class="custom-card-opponent grey" ><div class=" white-text"><span class="card-title">' +
        name +
        ' | Bet: $' +
        bet +
        '</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br /><br /></p></div><div class="card-action white-text center-align" style="font-size: 20px;">$' +
        data.money +
        ' (' +
        data.buyIns +
        ' ' +
        buyInsText2 +
        ')' +
        '</div></div></div>'
      );
    else
      return (
        '<div class="col s12 m2 opponentCard"><div class="custom-card-opponent green darken-2" ><div class=" white-text"><span class="card-title">' +
        name +
        ' | Bet: $' +
        bet +
        '</span><p><div class="center-align"> ' +
        renderOpponentCard(data.cards[0]) +
        renderOpponentCard(data.cards[1]) +
        ' </div><br /><br /><br /><br /><br />' +
        data.endHand +
        '</p></div><div class="card-action white-text center-align" style="font-size: 20px;">$' +
        data.money +
        ' (' +
        data.buyIns +
        ' ' +
        buyInsText2 +
        ')' +
        '</div></div></div>'
      );
  } else {
    if (data.folded)
      return (
        '<div class="col s12 m2 opponentCard"><div class="custom-card-opponent grey" ><div class=" white-text"><span class="card-title">' +
        name +
        ' | Bet: $' +
        bet +
        '</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br /><br /></p></div><div class="card-action white-text center-align" style="font-size: 20px;">$' +
        data.money +
        '</div></div></div>'
      );
    else
      return (
        '<div class="col s12 m2 opponentCard"><div class="custom-card-opponent green darken-2" ><div class=" white-text"><span class="card-title">' +
        name +
        ' | Bet: $' +
        bet +
        '</span><p><div class="center-align"> ' +
        renderOpponentCard(data.cards[0]) +
        renderOpponentCard(data.cards[1]) +
        ' </div><br /><br /><br /><br /><br />' +
        data.endHand +
        '</p></div><div class="card-action white-text center-align" style="font-size: 20px;">$' +
        data.money +
        '</div></div></div>'
      );
  }
}

function renderOpponentCard(card) {
  if (card.suit == '♠' || card.suit == '♣')
    return (
      '<div class="playingCard_black_opponent" id="card"' +
      card.value +
      card.suit +
      '" data-value="' +
      card.value +
      ' ' +
      card.suit +
      '">' +
      card.value +
      ' ' +
      card.suit +
      '</div>'
    );
  else
    return (
      '<div class="playingCard_red_opponent" id="card"' +
      card.value +
      card.suit +
      '" data-value="' +
      card.value +
      ' ' +
      card.suit +
      '">' +
      card.value +
      ' ' +
      card.suit +
      '</div>'
    );
}

function updateBetDisplay() {
  if ($('#betRangeSlider').val() == $('#usernamesMoney').text()) {
    $('#betDisplay').html(
      '<h3 class="center-align">All-In $' +
        $('#betRangeSlider').val() +
        '</h36>'
    );
  } else {
    $('#betDisplay').html(
      '<h3 class="center-align">$' + $('#betRangeSlider').val() + '</h36>'
    );
  }
}

function updateBetModal() {
  $('#betDisplay').html('<h3 class="center-align">$0</h3>');
  document.getElementById('betRangeSlider').value = 0;
  var usernamesMoneyStr = $('#usernamesMoney').text().replace('$', '');
  var usernamesMoneyNum = parseInt(usernamesMoneyStr);
  $('#betRangeSlider').attr({
    max: usernamesMoneyNum,
    min: 0,
  });
}

function updateRaiseDisplay() {
  $('#raiseDisplay').html(
    '<h3 class="center-align">Raise top bet to $' +
      $('#raiseRangeSlider').val() +
      '</h3>'
  );
}

socket.on('updateRaiseModal', function (data) {
  $('#raiseRangeSlider').attr({
    max: data.usernameMoney,
    min: data.topBet,
  });
});

function updateRaiseModal() {
  document.getElementById('raiseRangeSlider').value = 0;
  socket.emit('raiseModalData', {});
}

socket.on('displayPossibleMoves', function (d) {
  let data = d.moves;
  if (data.fold == 'yes') $('#usernameFold').show();
  else $('#usernameHide').hide();
  if (data.check == 'yes') $('#usernameCheck').show();
  else $('#usernameCheck').hide();
  if (data.bet == 'yes') $('#usernameBet').show();
  else $('#usernameBet').hide();
  if (data.call != 'no' || data.call == 'all-in') {
    $('#usernameCall').show();
    if (data.call == 'all-in') $('#usernameCall').text('Call All-In');
    else $('#usernameCall').text('Call $' + data.call);
  } else $('#usernameCall').hide();
  if (data.raise == 'yes') $('#usernameRaise').show();
  else $('#usernameRaise').hide();
  let hasTimer = d.hasTimer;
  if (hasTimer) {
    $("#timer").show();
    let startTime = 15;
    $("#timer").html(startTime);
    let countdown = setInterval(() => {
      startTime--;
      $("#timer").html(startTime);
    }, 1000);
    setTimeout(() => {
      clearInterval(countdown);
      $("#timer").hide();
      fold();
    }, 15000);
  }
});

socket.on('usePowerUp', function (d) {
  let data = d.obj;
  // here data is the name of the powerup this player is trying to use
  // todo: store this somewhere else maybe

  // let hasTarget = ['showPlayerCard', 'swapWithPlayer'];
  let powerup = data.name;
  let hasTarget = data.hasTarget;
  // have target
  if (hasTarget) {
    socket.emit('showSelectTarget', powerup);
  } else {
    // have no target
    socket.emit('powerUp', {powerup:powerup, num: d.num});
  }
});

socket.on('submitPowerUp', function(d) {
  let data = d.obj;
  let powerUpName = data.name;
  let selectedPlayerName = $('input[name=target]:checked', '#target-radio').val();
  $("#targetModal").hide();
  socket.emit('powerUp', {powerup: powerUpName, target: selectedPlayerName, num: d.num});
})

socket.on('displayToolTip', function(d) {
  let data = d.obj;
  let powerUpTooltip = data.description;
  $("#powerUpToolTip").html(powerUpTooltip);
  $("#powerUpToolTip").show();
});

socket.on('updatePowerUpLog', function(data) {
  let user = data.user;
  let target = data.target;
  let powerUpName = data.powerUpName;
  let time = data.time;
  let fullMsg = time + ' - ' + user + ' used power up "' + powerUpName + '"'
  if (target) fullMsg += ' on ' + target;
  $("#powerUpLogText").append("<br/>" + fullMsg);
  $("#powerUpLog").scrollTop($("#powerUpLog")[0].scrollHeight);
  $("#powerUpAnnounce").html("Latest: " + fullMsg);
  $("#powerUpAnnounce").show();
  setTimeout(() => {
    $("#powerUpAnnounce").empty();
    $("#powerUpAnnounce").hide();
  }, 3000);

})

// client listener
// get the card data and show it (modal? toast? image somewhere)
socket.on('showCommunityCard', function (data) {
  let fullMsg = "Community Card(s): <br/>";
  data.map((d) => {
    fullMsg += d.value;
    fullMsg += " of ";
    fullMsg += d.suit;
    fullMsg += "<br/>";
  })
  $("#revealedCardsLogText").append(fullMsg);
  $("#revealedCardsLog").scrollTop($("#revealedCardsLog")[0].scrollHeight);
  //console.log(data);
})

// client listener
// get the card and show it
socket.on("showPlayerCard", function (data) {
  let d = data.card;
  let n = data.name;
  let fullMsg = "One of " + n + "'s Card: ";

  fullMsg += d.value;
  fullMsg += " of ";
  fullMsg += d.suit;
  fullMsg += "<br/>";

  $("#revealedCardsLogText").append(fullMsg);
  $("#revealedCardsLog").scrollTop($("#revealedCardsLog")[0].scrollHeight);
});

socket.on('swapWithPlayer', function(data) {
  $('#mycards').html(
    data.map(function (c) {
      return renderCard(c);
    })
  );
});

socket.on('selectTarget', function(data) {
  let names = data.playerNames;
  $("#target-radio").empty();
  names.forEach((name) => {
    $('<input type="radio" name="target" value="' + name + '" id="radio-' + name + '"><label for="radio-' + name + '">' + name + '</label>').appendTo("#target-radio");
  });
  $('input[name=target]:eq(0)').prop("checked", true);
  $("#targetModal").show();
});


socket.on('nozdormu', function(data) {
  hasTimer = true;
})

socket.on('forceDC', function(data) {
  Materialize.toast(data + " has disconnected you", 4000);
  $("#gameDiv").remove();
  $("#powerUpLogContainer").remove();
  $("#revealedCardsLogContainer").remove();
  $("#powerUpAnnounce").remove();
  $("#faq").remove();
  $("#faqBtn").remove();
  $("#timer").remove();
  $(".page-footer").remove();
  setTimeout(() => {
    location.reload();
  }, 5000);
})
//rerenders the powerups
socket.on('renderPowerups',function(data) {
  if(data.position == 1) {
    $("#usePowerUp1").attr("src",data.src);
    $("#usePowerUp1").show();
  } 
  if(data.position == 2) {
    $("#usePowerUp2").attr("src",data.src);
    $("#usePowerUp2").show();
  }
})
//deletes used powerup
socket.on('clearPowerUp',function(data) {
  if(data == 1) {
    $("#usePowerUp1").hide();
  }
  if(data == 2) {
    $("#usePowerUp2").hide();
  }

})

// starting point from client
// emit to server call revealCommunityCard
function usePowerUp(num) {
  $("#confirmTarget").attr("powerUpNum", num);
  socket.emit('getPowerUp', {
    powerUpNum: num,
    listener: 'usePowerUp',
  });
}

function showFAQ() {
  $("#faq").show();
}

function closeFAQ() {
  $("#faq").hide();
}

function renderSelf(data) {
  $('#playNext').empty();
  $('#usernamesMoney').text('$' + data.money);
  if (data.text == 'Their Turn') {
    $('#playerInformationCard').removeClass('grey');
    $('#playerInformationCard').removeClass('grey');
    $('#playerInformationCard').addClass('yellow');
    $('#playerInformationCard').addClass('darken-2');
    $('#usernamesCards').removeClass('white-text');
    $('#usernamesCards').addClass('black-text');
    $('#status').text('My Turn');
    Materialize.toast('My Turn', 4000);
    socket.emit('evaluatePossibleMoves', {});
  } else if (data.text == 'Fold') {
    $('#status').text('You Folded');
    $('#playerInformationCard').removeClass('green');
    $('#playerInformationCard').removeClass('yellow');
    $('#playerInformationCard').removeClass('darken-2');
    $('#playerInformationCard').addClass('grey');
    $('#usernamesCards').removeClass('black-text');
    $('#usernamesCards').addClass('white-text');
    Materialize.toast('You folded', 3000);
    $('#usernameFold').hide();
    $('#usernameCheck').hide();
    $('#usernameBet').hide();
    $('#usernameCall').hide();
    $('#usernameRaise').hide();
  } else {
    $('#status').text('');
    $('#usernamesCards').removeClass('black-text');
    $('#usernamesCards').addClass('white-text');
    $('#playerInformationCard').removeClass('grey');
    $('#playerInformationCard').removeClass('yellow');
    $('#playerInformationCard').removeClass('darken-2');
    $('#playerInformationCard').addClass('green');
    $('#playerInformationCard').removeClass('theirTurn');
    $('#usernameFold').hide();
    $('#usernameCheck').hide();
    $('#usernameBet').hide();
    $('#usernameCall').hide();
    $('#usernameRaise').hide();
  }
  $('#blindStatus').text(data.blind);
}


$(window).on('beforeunload', function(){
  socket.close();
});
