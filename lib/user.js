const dgram = require('dgram');
const Config = require('config');
const fs = require('fs');
const BFCPUser = require('bfcp-lib');

class User {
  constructor(id, port, ip, conferenceId, bfcpServer) {
    this._id = id;
    this._port = port;
    this._ip = ip;
    this._conferenceId = conferenceId;
    this._bfcpUser = new BFCPUser(id, conferenceId);
    this._bfcpConnection = null;
    this._bfcpServer = bfcpServer;
  }

  get id() {
    return this._id;
  }

  set id(id) {
    this._id = id;
  }

  get port() {
    return this._port;
  }

  set port(port) {
    this._port = port;
  }

  get ip() {
    return this._ip;
  }

  set ip(ip) {
    this._ip = ip;
  }

  static getServerPort() {
    return this.serverPort++;
  }

  get conferenceId() {
    return this._conferenceId;
  }

  set conferenceId(conferenceId) {
    this._conferenceId = conferenceId;
  }

  get bfcpUser() {
    return this._bfcpUser;
  }

  set bfcpUser(bfcpUser) {
    this._bfcpUser = bfcpUser;
  }

  get bfcpConnection() {
    return this._bfcpConnection;
  }

  set bfcpConnection(bfcpConnection) {
    this._bfcpConnection = bfcpConnection;
  }

  get bfcpServer() {
    return this._bfcpServer;
  }

  set bfcpServer(bfcpServer) {
    this._bfcpServer = bfcpServer;
  }

  _sendHelloAck() {
    console.log('[bfcp-server] Sending HelloAck to user ' + this.id);
    this._sendMessage(this.bfcpUser.helloAckMessage());
  }

  _sendMessage(message) {
    this.bfcpConnection.send(message, this._port, this._ip);
  }

  _receiveMessage(message) {
    message = this.bfcpUser.receiveMessage(message);

    switch(message.name) {
      case 'Hello':
        console.log("[bfcp-server] Hello received from user " + this.id);
        this._sendHelloAck();
        break;
      case 'FloorRequest':
        console.log("[bfcp-server] FloorRequest received from user " + this.id);
        this.bfcpServer.emitFloorRequest(this);
        break;
      default:
        console.log('[bfcp-server] Wrong message name');
    }
  }

  _handleBfcpConnectionMessages() {
    this.bfcpConnection.on('error', (err) => {
      console.log('[bfcp-server] server error:\n' + 'err.stack');
      this.bfcpConnection.close();
    });

    this.bfcpConnection.on('message', (msg, rinfo) => {
      console.log('[bfcp-server] Message received...');
      this._receiveMessage(msg);
    });
  }

  async startBFCPConnection() {
    let udpServer = dgram.createSocket('udp4');
    await new Promise((resolve) => {
      udpServer.bind(User.getServerPort(), Config.get('server.ip'), () => {
        this.bfcpConnection = udpServer;
        console.log('[bfcp-server] Bfcp connection for user ' + this.id + ' on server ' +
          this.bfcpConnection.address().address + ':' + this.bfcpConnection.address().port + ' started.');
        this._handleBfcpConnectionMessages();
        resolve();
      });
    });
  }

  stopBFCPConnection() {
    this.bfcpConnection.close(() => {
      console.log('[bfcp-server] Bfcp connection for user ' + this.id + ' closed.');
    })
  }
}

User.serverPort = Config.get('server.port');

module.exports = User;
