// userService.js
    const User = require('../../domain/entities/user');

class UserService {
    constructor(       
    ) {
        console.log('UserService instantiated!');
        this.user = new User();
    }


    async readUsers(authPostgresAdapter) {
        try {
          const users = await authPostgresAdapter.readAllUsers();
          console.log('Users read successfully:', users);
          return users;
        } catch (error) {
          console.error('Error reading users:', error);
          throw error;
        }
      }
      
    async register(username, email, password, authPostgresAdapter) {
        try {
            console.log('hello userService.js')
            const newUser = await this.user.register(username, email, password, authPostgresAdapter);
            console.log('User registered successfully:', newUser);
            return newUser;
        } catch (error) {
            console.error('Error registering user:', error);
            throw error;
        }
    }

    async readUser(username, authPostgresAdapter) {
        try {
            const user = await this.user.readUser(username, authPostgresAdapter);
            console.log('User read successfully:', user);
            return user;
        } catch (error) {
            console.error('Error reading user:', error);
            throw error;
        }
    }



    async removeUser(username, password, authPostgresAdapter) {
        try {
             await this.user.removeUser(username, password, authPostgresAdapter);
            console.log('User removed successfully');
        } catch (error) {
            console.error('Error removing user:', error);
            throw error;
        }
    }   





// ----------------------------------------------------------

    async logout(username, password, authPostgresAdapter) {
        try {
            await this.user.logout(username, password, authPostgresAdapter);
        } catch (error) {
            console.error('Error logging out user:', error);
            throw error;
        }
    }

}

module.exports = UserService;