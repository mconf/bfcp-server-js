# bfcp-server-js
bfcp-server-js is a simple application to handle user and conferences in
the Binary Floor Control Protocol environment.

1. [BFCPServer](https://github.com/Scheffel-V/bfcp-server-js#BFCPServer)

## BFCPServer
**BFCPServer** class is the main class of this application, which is used to
_communicate_ with other applications. It fires events representing BFCP
messages.

```javascript
const BfcpServer = require('bfcp-server-js');
const Logger;

let bfcpServer = new BfcpServer(
  {
    'ip': '127.0.0.1',
    'startingPort': 8000,
    'logger': Logger
  }
);

bfcpServer.on('FloorRequest', (body) => {
  /**
   * Here you can handle the Floor Request.
   */
   let conferenceId = 1;
   let userId = 1;
   let status = true;

  /**
   * Then you can send a response.
   */
  bfcpServer.floorRequestResponse(conferenceId, userId, status);
});

bfcpServer.on('FloorRelease', (body) => {
  /**
   * Here you can handle the Floor Release.
   */
   let conferenceId = 1;
   let userId = 1;
   let status = false;

  /**
   * Then you can send a response.
   */
   bfcpServer.floorRequestResponse(conferenceId, userId, false);
});
```
