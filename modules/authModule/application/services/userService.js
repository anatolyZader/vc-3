// userService.js
    const User = require('../../domain/aggregates/user');

class UserService {

    constructor() {
        console.log('UserService instantiated!');
        this.user = new User();
    }

    async register(username, email, passwordHash, authPostgresAdapter) {
        try {
            const newUser = await this.user.addUser(username, email, passwordHash, authPostgresAdapter);
            console.log('User registered successfully:', newUser);
            return newUser;
        } catch (error) {
            console.error('Error registering user:', error);
            throw error;
        }
    }

    async login(username, password) {
        try {
            const user = await this.user.authenticate(username, password);
            if (user) {
                console.log('User logged in successfully:', user);
                return user;
            } else {
                console.error('Invalid username or password');
                return null;
            }
        } catch (error) {
            console.error('Error logging in user:', error);
            throw error;
        }
    }

}

module.exports = UserService;
