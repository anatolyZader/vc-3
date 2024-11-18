const User = require('../../domain/entities/user');

class AuthService {
  constructor() {
    console.log('AuthService instantiated!');
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
      console.log('hello userService.js');
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

  async logout(username, password, authPostgresAdapter) {
    try {
      await this.user.logout(username, password, authPostgresAdapter);
    } catch (error) {
      console.error('Error logging out user:', error);
      throw error;
    }
  }

  async verifyGoogleToken(token, authPostgresAdapter) {
    try {
      const googleUser = await this.user.verifyGoogleToken(token);
      const user = await authPostgresAdapter.findOrCreateUser(googleUser);
      console.log('Google token verified successfully:', user);
      return user;
    } catch (error) {
      console.error('Error verifying Google token:', error);
      throw error;
    }
  }

  async generateVerificationCode(email, authPostgresAdapter) {
    try {
      const verificationCode = this.user.generateVerificationCode();
      await authPostgresAdapter.storeVerificationCode(email, verificationCode);
      console.log('Verification code generated and stored:', verificationCode);
      return verificationCode;
    } catch (error) {
      console.error('Error generating verification code:', error);
      throw error;
    }
  }

  async sendVerificationCode(email, code) {
    try {
      await this.user.sendCodeViaEmail(email, code);
      console.log('Verification code sent via email:', code);
    } catch (error) {
      console.error('Error sending verification code:', error);
      throw error;
    }
  }

  async verifyCode(email, code, authPostgresAdapter) {
    try {
      const isValid = await authPostgresAdapter.verifyCode(email, code);
      if (!isValid) {
        console.error('Invalid verification code');
        return false;
      }
      console.log('Verification code validated successfully');
      return true;
    } catch (error) {
      console.error('Error verifying code:', error);
      throw error;
    }
  }

  async refreshToken(user) {
    try {
      const newToken = this.user.refreshToken(user);
      console.log('JWT token refreshed successfully:', newToken);
      return newToken;
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }
  }
}

module.exports = AuthService;
