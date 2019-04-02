const dgram = require('dgram');
const Config = require('config');
const fs = require('fs');
const BFCPUser = require('bfcp-lib');

class User {
  constructor(id, port, ip, conferenceId, transportProtocol, bfcpServer) {
    this._id = id;
    this._port = port;
    this._ip = ip;
    this._conferenceId = conferenceId;
    this._transportProtocol = transportProtocol;
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

  get transportProtocol() {
    return this._transportProtocol;
  }

  set transportProtocol(transportProtocol) {
    this._transportProtocol = transportProtocol;
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

  _sendFloorRequestStatus(status) {
    console.log('[bfcp-server] Sending FloorRequestStatus to user ' + this.id
     + ' with status ' + status);
    if(status) {
      this._sendMessage(this.bfcpUser.floorRequestStatusMessage(3));
    } else {
      this._sendMessage(this.bfcpUser.floorRequestStatusMessage(6));
    }
  }

  _sendMessage(message) {
    this.bfcpConnection.send(message, this._port, this._ip);
  }

  _receiveMessage(message) {
    try {
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

        case 'FloorRequestStatusAck':
        console.log('[bfcp-server] FloorRequestStatusAck received from user ' + this.id);
        break;

        case 'FloorRelease':
        console.log('[bfcp-server] FloorRelease received from user ' + this.id);
        this.bfcpServer.emitFloorRelease(this);
        break;

        default:
        console.log('[bfcp-server] Wrong message name');
      }
    } catch(error) {
      console.log(error);
    }
  }

  _handleBfcpConnectionMessages() {
    this.bfcpConnection.on('error', (err) => {
      console.log('[bfcp-server] server error:\n' + 'err.stack');
      this.bfcpConnection.close();
    });

    this.bfcpConnection.on('message', (msg, rinfo) => {
      this._receiveMessage(msg);
    });
  }

  async startBfcpConnection() {
    let udpServer = dgram.createSocket('udp4');
    return await new Promise((resolve) => {
      let serverPort = User.getServerPort();
      udpServer.bind(serverPort, '143.54.10.49', () => {
        this.bfcpConnection = udpServer;
        console.log('[bfcp-server] Bfcp connection for user ' + this.id + ' on server ' +
          this.bfcpConnection.address().address + ':' + this.bfcpConnection.address().port + ' started.');
        this._handleBfcpConnectionMessages();
        resolve(serverPort);
      });
    });
  }

  stopBfcpConnection() {
    this.bfcpConnection.close(() => {
      console.log('[bfcp-server] Bfcp connection for user ' + this.id + ' closed.');
    })
  }

  floorRequestResponse(status) {
    this._sendFloorRequestStatus(status);
  }
}
User.serverPort = 8000;
module.exports = User;
