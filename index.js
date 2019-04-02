const User = require('./lib/user.js');
const Conference = require('./lib/conference.js');
const EventEmitter = require('events');

class BFCPServer extends EventEmitter {
  constructor() {
    super();
    this._users = {};
    this._conferences = {};
  }

  get users() {
    return this._conferences;
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

  async startBFCPConnection(userId, userPort, userIp, conferenceId) {
    let user = new User(userId, userPort, userIp, conferenceId, this);
    this.users[user.id] = user;

    if(conferenceId in this.conferences) {
      this.conferences[conferenceId].addUser(user);
    } else {
      this.conferences[conferenceId] = new Conference(conferenceId);
      this.conferences[conferenceId].addUser(user);
    }

    await user.startBFCPConnection();
  }

  closeBFCPConnection(userId) {
    if(userId in this.users) {
      users[userId].closeBFCPConnection();
    } else {
      throw new Error('The user ' + userId + ' does not exist.');
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
