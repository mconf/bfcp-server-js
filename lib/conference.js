class Conference {
  constructor(id) {
    this._id = id;
    this._users = [];
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
    this.users.push(user);
  }

  removeUser(user) {
    this.users.splice(this.users.indexOf(user), 1);
  }
}

module.exports = Conference;
