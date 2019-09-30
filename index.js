const User = require('./lib/user.js');
const Conference = require('./lib/conference.js');
const EventEmitter = require('events');

/**
 * @classdesc
 * This class is the main class of this application, which is used to
 * communicate with other applications.
 * @extends EventEmitter
 * @memberof bfcp-server-js
 * @emits BFCPServer#event:FloorRequest
 * @emits BFCPServer#event:FloorRelease
 */
class BFCPServer extends EventEmitter {
  /**
   * @param {Object} args Server arguments. Must containt the server starting
   * port, ip and logger.
   */
  constructor(args) {
    super();
    this._users = {};
    this._conferences = {};
    User.serverPort = args.startingPort;
    User.portPool = [];
    User.serverIp = args.ip;
    this.logger = args.logger;
  }

  /**
   * Gets the users.
   * @return {bfcp-server-js.User[]} The user list
   */
  get users() {
    return this._users;
  }

  set users(users) {
    this._users = users;
  }

  /**
   * Gets the conferences.
   * @return {bfcp-server-js.Conference[]} The conference list
   */
  get conferences() {
    return this._conferences;
  }

  set conferences(conferences) {
    this._conferences = conferences;
  }

  /**
   * Starts a new BFCP connection for a new User.
   * @param  {Integer} userId            The user id
   * @param  {Integer} userPort          The user port
   * @param  {String}  userIp            The user ip
   * @param  {Integer} conferenceId      The conference id
   * @param  {String}  transportProtocol The user transport protocol
   * @return {Object}                    Returns a object containing the
   *                                     server port and ip.
   * @public
   */
  async startBfcpConnection(userId, userPort, userIp, conferenceId, transportProtocol) {
    let user = new User(userId, userPort, userIp, conferenceId, transportProtocol, this);
    this.users[user.id] = user;

    if(conferenceId in this.conferences) {
      this.conferences[conferenceId].addUser(user);
    } else {
      this.conferences[conferenceId] = new Conference(conferenceId);
      this.conferences[conferenceId].addUser(user);
    }

    let serverPort = await user.startBfcpConnection();
    return {
      'serverPort': serverPort,
      'serverIp': User.serverIp,
      'floorControlRole': 's-only',
      'setup': 'passive',
      'confid': conferenceId,
      'userid': user.bfcpUser.userId,
      'transportProtocol' : user.transportProtocol
    }
  }

  /**
   * Stops a BFCP connection for the user with userId.
   * @param  {Integer} userId The user id
   * @public
   */
  stopBfcpConnection(userId) {
    if(userId in this.users) {
      let user = this.users[userId];
      let conference = this.conferences[user.conferenceId];
      user.stopBfcpConnection();
      conference.removeUser(user);
      if(conference.users.length == 0) {
        this.logger.info('[BFCP-SERVER] Conference ' + conference.id +
        ' have 0 users. Deleting it.');
        delete this.conferences[user.conferenceId];
      }
      this.logger.info('[BFCP-SERVER] Deleting user ' + userId + '.');
      delete this.users[userId];
    } else {
      this.logger.warn('The user ' + userId + ' does not exist.');
    }
  }

  /**
   * Sends a floor request response to the user with userId,
   * and floor status to the other users in the conference
   * with conferenceId.
   * @param  {Integer} conferenceId The conference id
   * @param  {Integer} userId       The user id
   * @param  {Boolean} status       The floor response status
   * @public
   */
  floorRequestResponse(conferenceId, userId, status) {
    if(userId in this.users && conferenceId in this.conferences) {
      this.users[userId].floorRequestResponse(status);
    } else {
      this.logger.warn('[BFCP-SERVER] User or conference not found.')
    }
  }

  /**
   * Sends a floor status to all users in the conference,
   * except for the user with userId.
   * @param  {Integer} conferenceId The conference id
   * @param  {Integer} userId       The user id
   * @param  {Boolean} status       The floor response status
   * @public
   */
  floorStatus(conferenceId, userId, status) {
    this.logger.info('[BFCP-SERVER] Informing users in the conference ' +
     conferenceId + ' that the floor status is ' + status + '.');
    if(userId in this.users && conferenceId in this.conferences) {
      for(let user of this.conferences[conferenceId].users) {
        if(user.id != userId) {
          user.floorStatus(this.users[userId].wantedFloorId, status);
        }
      }
    } else {
      this.logger.warn('[BFCP-SERVER] User or conference not found.')
    }
  }

  /**
   * Sends a floor status to the user with userId,
   * in the conference with conferenceId.
   * @param  {Integer} conferenceId The conference id
   * @param  {Integer} userId       The user id
   * @param  {Boolean} status       The floor response status
   * @public
   */
  floorQueryResponse(conferenceId, userId, status) {
    if(userId in this.users && conferenceId in this.conferences) {
      this.users[userId].floorQueryResponse(status);
    } else {
      this.logger.warn('[BFCP-SERVER] User or conference not found.')
    }
  }

  /**
   * Emits the FloorRequest event.
   * @param  {bfcp-server-js.User} user The user who called this method
   * @public
   * @emits  BFCPServer#event:FloorRequest
   */
  emitFloorRequest(user) {
    this.emit('FloorRequest',
     {
       'userId': user.id,
       'conferenceId': user.conferenceId
     }
    );
  }

  /**
   * Emits the FloorRelease event.
   * @param  {bfcp-server-js.User} user The user who called this method
   * @public
   * @emits BFCPServer#event:FloorRelease
   */
  emitFloorRelease(user) {
    this.emit('FloorRelease',
     {
      'userId': user.id,
      'conferenceId': user.conferenceId
     }
    );
  }

  /**
   * Emits the FloorQuery event.
   * @param  {bfcp-server-js.User} user The user who called this method
   * @public
   * @emits BFCPServer#event:FloorQuery
   */
  emitFloorQuery(user) {
    this.emit('FloorQuery',
     {
      'userId': user.id,
      'conferenceId': user.conferenceId
     }
    );
  }
}

module.exports = BFCPServer;
