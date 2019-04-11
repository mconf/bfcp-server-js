/**
 * @classdesc
 * This class is a abstract representation of an BFCP Conference, in the
 * BFCP environment.
 * @memberof bfcp-server-js
 */
class Conference {
  /**
   * @param {Integer} id The Conference id
   */
  constructor(id) {
    this._id = id;
    this._users = [];
  }

  /**
   * Gets the conference id.
   * @return {Integer} The id
   */
  get id() {
    return this._id;
  }

  set id(id) {
    this._id = id;
  }

  /**
   * Gets the conference user list.
   * @return {bfcp-server-js.User[]} The user list
   */
  get users() {
    return this._users;
  }

  set users(users) {
    this._users = users;
  }

  /**
   * Adds a User to this conference user list.
   * @param {bfcp-server-js.User} user The user
   * @public
   */
  addUser(user) {
    this.users.push(user);
  }

  /**
   * Removes a User to this conference user list.
   * @param  {bfcp-server-js.User} user The user
   * @public
   */
  removeUser(user) {
    this.users.splice(this.users.indexOf(user), 1);
  }
}

module.exports = Conference;
