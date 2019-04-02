class Conference {
  constructor(id) {
    this._id = id;
    this._users = {};
  }

  get id() {
    return this._id;
  }

  set id(id) {
    this._id = id;
  }

  get users() {
    return this._users;
  }

  set users(users) {
    this._users = users;
  }

  addUser(user) {
    this.users[user.id] = user;
  }

  removeUser(user) {
    delete this.users[user.id];
  }
}

module.exports = Conference;
