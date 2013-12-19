// Welcome to SpaceBots, game where robots controlled by AI and human
// players compete to create thriving industry, accumulate resources
// and secure rare and efficient machines.

// This game is meant to be operated from built-in browser
// console. You can invoke it depending on your browser:

// Chrome: Shift + Ctrl + J
// Firefox: Shift + Ctrl + K (you may disable CSS and Network buttons)

// If you have done everything properly, you should be reading the
// same file but from the inside of your browser :)

// We will show you how to interact with the game. Let's start with
// ... XXX

// Simple isn't it? You have just enabled the 'if' statement a few
// lines upwards from here :D

// You will constantly be using Javascript to learn game mechanics, to
// automate boring chores and to write any tools you like that help
// you in the game.  We will teach you how to do it, don't worry if
// you are a javascript newbie.

// It is a good idea to take at least a short course on javascript
// before reading rest of the source code. This way you will
// understand the basics.  Examples from the code will help you even
// better understand the language.

// The code is filled with excercises so you can really understand
// mechanics governing various parts of the game. In the meantime you
// will learn some really neat programming tricks, so even if you are
// an expert programmer, taking this tutorial will have some benefit.

// Having said all the basics nessessary, we can begin the tour of the
// source code.

// The game is operated through a live connection with its
// server. Here is the line that uses socket.io library to create
// this connection.

var socket;

var connect = function() {
  return new Promise(function(resolve, reject) {

    socket = io.connect();

    // We use the 'connect' event to execute action right after
    // connection is created.

    socket.on('connect', resolve());
    
  });
};

var send = function(command, argument) {
  if(!command) throw "error: Add command to `send(command, argument)`";
  if(!argument) throw "error: Add argument object to `send(command, argument)`";

  return new Promise(function(resolve, reject) {
    socket.emit(command, argument, function(status, reply) {
      if(status === 'success')
        resolve(reply);
      else
        reject(reply);
    });
  });
};


// We won't use socket.io directly anymore. All communication with
// server will be done by sending and receiving messages using just
// created socket.

// After connection we should log in. Here we have a function to
// log in to the game

var log_in = function() {
  // We don't have an account yet. A player is identified by a long
  // (32 characters) hexadecimal number called id. SpaceBots uses
  // such identifiers for most of the stuff found in the game. We
  // can create new id with `uid` function from `common` module.

  localStorage.player_id = localStorage.player_id || common.uid();

  // We store id in localStorage. This way you will log into the
  // same account each time you visit the page.

  // Excercise: calculate, how big is the probability that this
  // newly generated number could collide with random id of other
  // player. You can do it now.

  // Tip: find a calculator that can handle very small numbers.

  // As number of players is much higher than one (offline players
  // also count) the probability of id collision raises.

  // Excercise: calculate how much players should there be to raise
  // the probability of collision to 1%?

  // Tip: google for birthday paradox

  // Now that we have an id, we can send it to the server.

  console.log("Logging in...");

  return send('log in', { player_id: localStorage.player_id });
};

var logged_in = connect().then(log_in);
