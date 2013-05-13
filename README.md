# SpaceBots

SpaceBots is a programming game where players employ their in-browser
javascript engines to drive hordes of robots and wage battles in
space.

## Running

After cloning complete dependencies:

 npm install

Before starting server, open two consoles to monitor state of the
server:

 touch debug.log && tail -f debug.log

 touch exceptions.log && tail -f exceptions.log

Now you are ready to roll:

 npm start

Server will start on port 8000 (if you are normal user) or on 443 (if
run under root).