const dgram = require('dgram');
const fs = require('fs');
const BFCPLib = require('bfcp-lib');
const net = require('net');
const BFCPUser = BFCPLib.User;
const Primitive = BFCPLib.Primitive;
const RequestStatusValue = BFCPLib.RequestStatusValue;
const AttributeName = BFCPLib.AttributeName;

/**
 * @classdesc
 * This class is a abstract representation of a BFCP Endpoint, in the BFCP
 * environment. It can communicate with the bfcp-lib through the bfcpUser
 * attribute.
 * @memberof bfcp-server-js
 */
class User {
  /**
   * @param {Integer} id                The BFCP endpoint Id
   * @param {Integer} port              The BFCP endpoint port
   * @param {String} ip                 The BFCP endpoint ip
   * @param {Integer} conferenceId      The conference id
   * @param {String} transportProtocol  The BFCP endpoint transport protocol
   * @param {bfcp-server-js.BFCPServer} bfcpServer  Reference to the BFCPServer
   */
  constructor(id, port, ip, conferenceId, transportProtocol, bfcpServer) {
    this._id = id;
    this._port = port;
    this._ip = ip;
    this._conferenceId = conferenceId;
    this._transportProtocol = transportProtocol;
    this._wantedFloorId = 0;
    this._queryFloorId = 0;
    this._lastFloorRequest = null;
    this._lastFloorRelease = null;
    this._bfcpUser = new BFCPUser(id, conferenceId);
    this._bfcpConnection = null;
    this._bfcpServer = bfcpServer;
  }

  /**
   * Gets the User id.
   * @return {Integer} The id
   */
  get id() {
    return this._id;
  }

  set id(id) {
    this._id = id;
  }

  /**
   * Gets the User port. Will be used to send messages to the endpoint
   * through the UDP/TCP connection.
   * @return {Integer} The port
   */
  get port() {
    return this._port;
  }

  set port(port) {
    this._port = port;
  }

  /**
   * Gets the User ip. Will be used to send messages to the endpoint
   * through the UDP/TCP connection.
   * @return {String} The ip
   */
  get ip() {
    return this._ip;
  }

  set ip(ip) {
    this._ip = ip;
  }

  /**
   * Gets a Server port, used for this User receive messages from the endpoint.
   * @return {Integer} The port
   * @static
   */
  static getServerPort() {
    return this.portPool.length == 0 ? this.serverPort++ : this.portPool.pop(0);
  }

  /**
   * Adds a Server port to port pool, so it can be used in the future for
   * other clients.
   * @return {Integer} The port
   * @static
   */
  static addServerPortToPool(port) {
    this.portPool.push(port);
  }

  /**
   * Gets the Server ip, used for this User receive messages from the endpoint.
   * @return {String} The ip
   */
  static getServerIp() {
    return this.serverIp;
  }

  /**
   * Gets the conference id of this user.
   * @return {Integer} The conference id
   */
  get conferenceId() {
    return this._conferenceId;
  }

  set conferenceId(conferenceId) {
    this._conferenceId = conferenceId;
  }

  /**
   * Gets the transport protocol of this user, that is used to create a
   * connection. Can be 'TCP' or 'UDP'.
   * @return {String} The transport protocol
   */
  get transportProtocol() {
    return this._transportProtocol;
  }

  set transportProtocol(transportProtocol) {
    this._transportProtocol = transportProtocol;
  }

  /**
   * Gets the most recently wanted floor id that this User requested with
   * a FloorRequest message.
   * @return {Integer} The wanted floor id
   */
  get wantedFloorId() {
    return this._wantedFloorId;
  }

  set wantedFloorId(wantedFloorId) {
    this._wantedFloorId = wantedFloorId;
  }

  /**
   * Gets the most recently query floor id that this User requested with
   * a FloorQuery message.
   * @return {Integer} The query floor id
   */
  get queryFloorId() {
    return this._queryFloorId;
  }

  set queryFloorId(queryFloorId) {
    this._queryFloorId = queryFloorId;
  }

  /**
   * Gets the last floor request received by this User.
   * @return {bfcp-lib.Message} The floor request message
   */
  get lastFloorRequest() {
    return this._lastFloorRequest;
  }

  set lastFloorRequest(floorRequest) {
    this._lastFloorRequest = floorRequest;
  }

  /**
   * Gets the last floor release received by this User.
   * @return {bfcp-lib.Message} The floor release message
   */
  get lastFloorRelease() {
    return this._lastFloorRelease;
  }

  set lastFloorRelease(floorRelease) {
    this._lastFloorRelease = floorRelease;
  }

  /**
   * Gets the bfcp-lib User, used to communicate with bfcp-lib library.
   * @return {bfcp-lib.User} The bfcp-lib User
   */
  get bfcpUser() {
    return this._bfcpUser;
  }

  set bfcpUser(bfcpUser) {
    this._bfcpUser = bfcpUser;
  }

  /**
   * Gets this User connection socket. Can be created by TCP or UDP server.
   * @return {Socket} The UDP/TCP socket
   */
  get bfcpConnection() {
    return this._bfcpConnection;
  }

  set bfcpConnection(bfcpConnection) {
    this._bfcpConnection = bfcpConnection;
  }

  /**
   * Gets the BFCPServer object.
   * @return {bfcp-server-js.BFCPServer} The server
   */
  get bfcpServer() {
    return this._bfcpServer;
  }

  set bfcpServer(bfcpServer) {
    this._bfcpServer = bfcpServer;
  }

  /**
   * Sends a HelloAck message through the connection, in response to a
   * Hello message.
   * @param  {bfcp-lib.Message} helloMessage The Hello message
   * @private
   */
  _sendHelloAck(helloMessage) {
    this.bfcpServer.logger.info('[BFCP-SERVER] Sending HelloAck to user ' + this.id);
    this._sendMessage(this.bfcpUser.helloAckMessage(helloMessage));
  }

  /**
   * Sends a FloorStatus message through the connection.
   * @param  {Integer} floorId The floor id
   * @param  {Boolean} status  The status. Can be true, representing a Granted,
   *                           and false, representing a Released.
   * @private
   */
  _sendFloorStatus(floorId, status) {
    let requestStatusValue = status ? RequestStatusValue.Granted : RequestStatusValue.Released;
    this.bfcpServer.logger.info('[BFCP-SERVER] Sending FloorStatus to user ' + this.id
     + ' with status ' + status);
     this._sendMessage(this.bfcpUser.floorStatusMessage(floorId, requestStatusValue));
  }

  /**
   * Sends a FloorRequestStatus message through the connection, in response
   * to a FloorRequest or FloorRelease message.
   * @param  {Boolean} status The status. Can be true, representing a Granted,
   *                          and false, representing a Released.
   * @private
   */
  _sendFloorRequestStatus(status) {
    this.bfcpServer.logger.info('[BFCP-SERVER] Sending FloorRequestStatus to user ' + this.id
     + ' with status ' + status);
    if(status) {
      this._sendMessage(this.bfcpUser.floorRequestStatusMessage(this.lastFloorRequest,
       this.wantedFloorId, RequestStatusValue.Granted));
    } else {
      if(this.lastFloorRelease != null) {
        this._sendMessage(this.bfcpUser.floorRequestStatusMessage(this.lastFloorRelease,
         this.wantedFloorId, RequestStatusValue.Released));
         this.lastFloorRelease = null;
      } else {
        this._sendMessage(this.bfcpUser.floorRequestStatusMessage(this.lastFloorRequest,
         this.wantedFloorId, RequestStatusValue.Released));
      }
    }
  }

  /**
   * Sends a message through the connection socket. Can be a TCP socket or a
   * UDP socket.
   * @param  {Buffer[]} message The buffered message
   * @private
   */
  _sendMessage(message) {
    if(this.bfcpConnection) {
      if(this.transportProtocol == 'UDP') {
        this.bfcpConnection.send(message, this.port, this.ip);
      } else {
        this.bfcpConnection.write(message, this.port, this.ip);
      }
    }
  }

  /**
   * Receives a buffered message, transforming it in a object oriented message
   * with the bfcp-lib User.
   * @param  {Buffer[]} message The buffered message
   * @private
   */
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
          this.lastFloorRequest = message;
          this.bfcpServer.emitFloorRequest(this);
          break;

        case Primitive.FloorRequestStatusAck:
          this.bfcpServer.logger.info('[BFCP-SERVER] FloorRequestStatusAck received from user ' + this.id);
          break;

        case Primitive.FloorRelease:
          this.bfcpServer.logger.info('[BFCP-SERVER] FloorRelease received from user ' + this.id);
          this.lastFloorRelease = message;
          this.bfcpServer.emitFloorRelease(this);
          break;

        case Primitive.FloorStatusAck:
          this.bfcpServer.logger.info('[BFCP-SERVER] FloorStatusAck received from user ' + this.id);
          break;

        case Primitive.FloorQuery:
          this.bfcpServer.logger.info('[BFCP-SERVER] FloorQuery received from user ' + this.id);
          this.queryFloorId = message.getAttribute(AttributeName.FloorId).content;
          this.bfcpServer.emitFloorQuery(this);
          break;

        default:
          this.bfcpServer.logger.warn('[BFCP-SERVER] Unkwown message received.');
          break;
      }
    } catch(error) {
      this.bfcpServer.logger.error(error);
    }
  }

  /**
   * Handles the UDP connection messages.
   * @private
   */
  _handleBfcpUdpConnectionMessages(port) {
    this.bfcpConnection.on('close', () => {
      this.bfcpServer.logger.info('[BFCP-SERVER] Bfcp UDP connection for user ' + this.id + ' closed.');
      User.addServerPortToPool(port);
    });

    this.bfcpConnection.on('error', (err) => {
      this.bfcpServer.logger.error('[BFCP-SERVER] server error:\n' + 'err.stack');
      this.bfcpConnection.close();
    });

    this.bfcpConnection.on('message', (msg, rinfo) => {
      this._receiveMessage(msg);
    });
  }

  /**
   * Handles the TCP connection messages.
   * @private
   */
  _handleBfcpTcpConnectionMessages(tcpServer, port) {
    this.bfcpConnection.on('close', () => {
      this.bfcpServer.logger.info('[BFCP-SERVER] Bfcp TCP connection for user ' + this.id + ' closed.');
      tcpServer.close();
      User.addServerPortToPool(port);
    });

    this.bfcpConnection.on('error', (err) => {
      this.bfcpServer.logger.error('[BFCP-SERVER] server error:\n' + 'err.stack');
      this.bfcpConnection.destroy();
    });

    this.bfcpConnection.on('data', (data) => {
      this._receiveMessage(data);
    });
  }

  /**
   * Stops the udp connection.
   * @private
   */
  _stopBfcpUdpConnection() {
    if(this.bfcpConnection) {
      this.bfcpConnection.close();
    }
  }

  /**
   * Stops the tcp connection.
   * @todo Finalize TCP server
   * @private
   */
  _stopBfcpTcpConnection() {
    if(this.bfcpConnection) {
      this.bfcpConnection.destroy();
    }
  }

  /**
   * Starts a UDP connection.
   * @private
   */
  async _startBfcpUdpConnection() {
    let udpServer = dgram.createSocket('udp4');
    return await new Promise((resolve) => {
      let serverPort = User.getServerPort();
      udpServer.bind(serverPort, User.getServerIp(), () => {
        this.bfcpConnection = udpServer;
        this.bfcpServer.logger.info('[BFCP-SERVER] Bfcp UDP connection for user ' + this.id + ' on server ' +
          this.bfcpConnection.address().address + ':' + this.bfcpConnection.address().port + ' started.');
        this._handleBfcpUdpConnectionMessages(this.bfcpConnection.address().port);
        resolve(serverPort);
      });
    });
  }

  /**
   * Starts a TCP connection.
   * @private
   */
  _startBfcpTcpConnection() {
    let serverPort = User.getServerPort();
    let tcpServer = net.createServer((connection) => {
      this.bfcpConnection = connection;
      this.bfcpServer.logger.info('[BFCP-SERVER] Bfcp TCP connection for user ' + this.id + ' on server ' +
        this.bfcpConnection.address().address + ':' + this.bfcpConnection.address().port + ' started.');
      this._handleBfcpTcpConnectionMessages(tcpServer, this.bfcpConnection.address().port);
    });
    tcpServer.listen(serverPort, User.getServerIp());
    return serverPort;
  }

  /**
   * Starts a BFCP (UDP/TCP) connection.
   * @return {Integer} Server port
   * @public
   */
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

  /**
   * Stops the BFCP (UDP/TCP) connection.
   * @public
   */
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

  /**
   * Sends a floor request response to the BFCP endpoint.
   * @param  {Boolean} status The floor request reponse status. Can be true,
   * representing Granted, or false, representing Released.
   * @public
   */
  floorRequestResponse(status) {
    this._sendFloorRequestStatus(status);
  }

  /**
   * Sends a floor status message to the BFCP endpoint.
   * @param  {Integer} floorId The floor id
   * @param  {Boolean} status  The floor status value. Can be true
   * representing Granted, or false, representing Released.
   * @public
   */
  floorStatus(floorId, status) {
    this._sendFloorStatus(floorId, status);
  }

  /**
   * Sends a floor status to the BFCP endpoint.
   * @param  {Boolean} status The floor request reponse status. Can be true,
   * representing Granted, or false, representing Released.
   * @public
   */
  floorQueryResponse(status) {
    this._sendFloorStatus(this.queryFloorId, status);
  }
}

module.exports = User;
