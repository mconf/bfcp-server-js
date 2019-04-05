const dgram = require('dgram');
const fs = require('fs');
const BFCPLib = require('bfcp-lib');
const net = require('net');
const BFCPUser = BFCPLib.User;
const Primitive = BFCPLib.Primitive;
const RequestStatusValue = BFCPLib.RequestStatusValue;
const AttributeName = BFCPLib.AttributeName;

class User {
  constructor(id, port, ip, conferenceId, transportProtocol, bfcpServer) {
    this._id = id;
    this._port = port;
    this._ip = ip;
    this._conferenceId = conferenceId;
    this._transportProtocol = transportProtocol;
    this._wantedFloorId = 0;
    this._floorRequestQueue = [];
    this._floorReleaseQueue = [];
    this._bfcpUser = new BFCPUser(id, conferenceId);
    this._bfcpConnection = null;
    this._tcpServer = null;
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

  static getServerIp() {
    return this.serverIp;
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

  get wantedFloorId() {
    return this._wantedFloorId;
  }

  set wantedFloorId(wantedFloorId) {
    this._wantedFloorId = wantedFloorId;
  }

  get floorRequestQueue() {
    return this._floorRequestQueue;
  }

  set floorRequestQueue(floorRequestQueue) {
    this._floorRequestQueue = floorRequestQueue;
  }

  get floorReleaseQueue() {
    return this._floorReleaseQueue;
  }

  set floorReleaseQueue(floorReleaseQueue) {
    this._floorReleaseQueue = floorReleaseQueue;
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

  get tcpServer() {
    return this._tcpServer;
  }

  set tcpServer(tcpServer) {
    this._tcpServer = tcpServer;
  }

  get bfcpServer() {
    return this._bfcpServer;
  }

  set bfcpServer(bfcpServer) {
    this._bfcpServer = bfcpServer;
  }

  _sendHelloAck(helloMessage) {
    this.bfcpServer.logger.info('[BFCP-SERVER] Sending HelloAck to user ' + this.id);
    this._sendMessage(this.bfcpUser.helloAckMessage(helloMessage));
  }

  _sendFloorStatus(floorId, status) {
    let requestStatusValue = status ? RequestStatusValue.Granted : RequestStatusValue.Released;
    this.bfcpServer.logger.info('[BFCP-SERVER] Sending FloorStatus to user ' + this.id
     + ' with status ' + status);
     this._sendMessage(this.bfcpUser.floorStatusMessage(floorId, requestStatusValue));
  }

  _sendFloorRequestStatus(status) {
    this.bfcpServer.logger.info('[BFCP-SERVER] Sending FloorRequestStatus to user ' + this.id
     + ' with status ' + status);
    if(status) {
      this._sendMessage(this.bfcpUser.floorRequestStatusMessage(this.floorRequestQueue.pop(0),
       this.wantedFloorId, RequestStatusValue.Granted));
    } else {
      this._sendMessage(this.bfcpUser.floorRequestStatusMessage(this.floorReleaseQueue.pop(0),
       this.wantedFloorId, RequestStatusValue.Released));
    }
  }

  _sendMessage(message) {
    if(this.transportProtocol == 'UDP') {
      this.bfcpConnection.send(message, this._port, this._ip);
    } else {
      this.bfcpConnection.write(message, this._port, this._ip);
    }
  }

  _receiveMessage(message) {
    try {
      message = this.bfcpUser.receiveMessage(message);
      switch(message.commonHeader.primitive) {

        case Primitive.Hello:
          this.bfcpServer.logger.info("[BFCP-SERVER] Hello received from user " + this.id);
          this._sendHelloAck(message);
          break;

        case Primitive.FloorRequest:
          this.bfcpServer.logger.info("[BFCP-SERVER] FloorRequest received from user " + this.id);
          this.wantedFloorId = message.getAttribute(AttributeName.FloorId).content;
          this.floorRequestQueue.push(message);
          this.bfcpServer.emitFloorRequest(this);
          break;

        case Primitive.FloorRequestStatusAck:
          this.bfcpServer.logger.info('[BFCP-SERVER] FloorRequestStatusAck received from user ' + this.id);
          break;

        case Primitive.FloorRelease:
          this.bfcpServer.logger.info('[BFCP-SERVER] FloorRelease received from user ' + this.id);
          this.floorReleaseQueue.push(message);
          this.bfcpServer.emitFloorRelease(this);
          break;

        case Primitive.FloorStatusAck:
          this.bfcpServer.logger.info('[BFCP-SERVER] FloorStatusAck received from user ' + this.id);
          break;

        default:
          this.bfcpServer.logger.warn('[BFCP-SERVER] Unkwown message received.');
          break;
      }
    } catch(error) {
      this.bfcpServer.logger.error(error);
    }
  }

  _handleBfcpUdpConnectionMessages() {
    this.bfcpConnection.on('error', (err) => {
      this.bfcpServer.logger.error('[BFCP-SERVER] server error:\n' + 'err.stack');
      this.bfcpConnection.close();
    });

    this.bfcpConnection.on('message', (msg, rinfo) => {
      this._receiveMessage(msg);
    });
  }

  _handleBfcpTcpConnectionMessages() {
    this.bfcpConnection.on('data', (data) => {
      this._receiveMessage(data);
    })
  }

  async startBfcpConnection() {
    switch(this.transportProtocol) {
      case 'UDP':
        return await this._startBfcpUdpConnection();
        break;

      case 'TCP':
        return this._startBfcpTcpConnection();
        break;

      default:
        throw new Error("I can't create a connection with this protocol.");
    }
  }

  async _startBfcpUdpConnection() {
    let udpServer = dgram.createSocket('udp4');
    return await new Promise((resolve) => {
      let serverPort = User.getServerPort();
      udpServer.bind(serverPort, User.getServerIp(), () => {
        this.bfcpConnection = udpServer;
        this.bfcpServer.logger.info('[BFCP-SERVER] Bfcp UDP connection for user ' + this.id + ' on server ' +
          this.bfcpConnection.address().address + ':' + this.bfcpConnection.address().port + ' started.');
        this._handleBfcpUdpConnectionMessages();
        resolve(serverPort);
      });
    });
  }

  _startBfcpTcpConnection() {
    let serverPort = User.getServerPort();
    let tcpServer = net.createServer((connection) => {
      this.bfcpConnection = connection;
      this.bfcpServer.logger.info('[BFCP-SERVER] Bfcp TCP connection for user ' + this.id + ' on server ' +
        this.bfcpConnection.address().address + ':' + this.bfcpConnection.address().port + ' started.');
      this._handleBfcpTcpConnectionMessages();
    });
    this.tcpServer = tcpServer;
    tcpServer.listen(serverPort, User.getServerIp());
    return serverPort;
  }


  stopBfcpConnection() {
    switch(this.transportProtocol) {
      case 'UDP':
        this._stopBfcpUdpConnection();
        break;

      case 'TCP':
        this._stopBfcpTcpConnection();
        break;

      default:
        throw new Error("I can't stop a connection with this protocol.");
    }
  }

  _stopBfcpUdpConnection() {
    this.bfcpConnection.close(() => {
      this.bfcpServer.logger.info('[BFCP-SERVER] Bfcp connection for user ' + this.id + ' closed.');
    });
  }

  _stopBfcpTcpConnection() {
    this.tcpServer.close(() => {
      this.bfcpServer.logger.info('[BFCP-SERVER] Bfcp connection for user ' + this.id + ' closed.');
    });
  }

  floorRequestResponse(status) {
    this._sendFloorRequestStatus(status);
  }

  floorStatus(floorId, status) {
    this._sendFloorStatus(floorId, status);
  }
}

module.exports = User;
