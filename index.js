const User = require('./lib/user.js');
const Conference = require('./lib/conference.js');
const EventEmitter = require('events');
const Config = require('config');

class BFCPServer extends EventEmitter {
  constructor() {
    super();
    this._users = {};
    this._conferences = {};
  }

  get users() {
    return this._users;
  }

  set users(users) {
    this._users = users;
  }

  get conferences() {
    return this._conferences;
  }

  set conferences(conferences) {
    this._conferences = conferences;
  }

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
      'serverIp': '143.54.10.49'
    }
  }

  stopBfcpConnection(userId) {
    if(userId in this.users) {
      this.users[userId].stopBfcpConnection();
    } else {
      throw new Error('The user ' + userId + ' does not exist.');
    }
  }

  floorRequestResponse(conferenceId, userId, status) {
    if(userId in this.users && conferenceId in this.conferences) {
      this.users[userId].floorRequestResponse(status);
    }
  }

  emitFloorRequest(user) {
    this.emit('FloorRequest',
     {
       'userId': user.id,
       'conferenceId': user.conferenceId
     }
    );
  }

  emitFloorRelease(user) {
    this.emit('FloorRelease',
     {
      'userId': user.id,
      'conferenceId': user.conferenceId
     }
    );
  }
}

module.exports = BFCPServer;
