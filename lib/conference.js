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
    for(let i = 0; i < this.users.length; i++) {
      if(this.users[i].id == user.id) {
        this.users.pop(i);
      }
    }
  }
}

module.exports = Conference;
