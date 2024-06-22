const { v4: uuidv4 } = require('uuid');

class User {
  constructor(username, email, IAuthDatabasePort) {
    this.userId = uuidv4();
    this.username = username;
    this.email = email;
    this.passwordHash = '';
    this.databasePort = IAuthDatabasePort;
    }

    async readUser() {
        try {
            const fetchedUserDTO = await this.IAuthPostgresPort.findUser(this.username, this.passwordHash);
            console.log('user data fetched successfully!');
            return fetchedUserDTO;
        } catch (error) {
            console.error('Error fetching user data:', error);
        throw error;
    }};

    async addUser() {
        try {
            const newUserDTO = await this.IAuthPostgresPort.createUser(this.username, this.passwordHash);
            console.log('new user added successfully!');
            return newUserDTO;
        } catch (error) {
            console.error('Error adding new user: ', error);
        throw error;
    }
 }
}

module.exports = User;
