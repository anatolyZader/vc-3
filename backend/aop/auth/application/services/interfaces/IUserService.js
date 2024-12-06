/* eslint-disable no-unused-vars */
class IUserService {
  constructor() {
    if (new.target === IUserService) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }

  async readUsers(IAuthPersistPort) {
    throw new Error('Method not implemented.');
  }

  async register(username, email, password, IAuthPersistPort) {
    throw new Error('Method not implemented.');
  }

  async readUser(email, IAuthPersistPort) {
    throw new Error('Method not implemented.');
  }

  async removeUser(email, IAuthPersistPort) {
    throw new Error('Method not implemented.');
  }
}

module.exports = IUserService;
