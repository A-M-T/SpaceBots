# SpaceBots

SpaceBots is a programming game where players employ their in-browser javascript engines to drive hordes of robots and wage battles in space.

## Quickstart guide

1. Clone or download the repo.

2 _(Linux)_. Install node.js, enter `SpaceBots` directory and download dependencies using `npm install`. Start server using `npm start`.

2 _(Windows)_. Enter `SpaceBots/static` directory and run `server.exe`. 

3. Open [http://localhost:8080/](http://localhost:8080/) to start the game.

4. Click question mark to see game description.

5. Modify files in `SpaceBots/static` to suit your gameplay strategy.

## Starting local server

Local server lets you:

*   test your code offline
*   add new components on the server side

Start by installing node.js. When finished, download dependencies using:

```bash
npm install
```

Before starting server, open two consoles to monitor state of the server:


```bash
touch debug.log && tail -f debug.log
touch exceptions.log && tail -f exceptions.log
```

Now you are ready to roll:

```bash
npm start
```

Server will start on port 8080 (if you are normal user) or on 443 (if run under root).
