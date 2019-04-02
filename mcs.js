const BFCPServer = require('./server.js');

let server = new BFCPServer();

server.startBFCPConnection(1, 45001, '143.54.10.49', 5);
//server.startBFCPConnection(2, 45001, '143.54.10.49', 5);

server.on('FloorRequest', (args) => {
  console.log('[mcs] FloorRequest!');
  console.log(args);
})
