// devAuthProvider.js
'use strict';

/**
 * Development Authentication Provider
 * 
 * Handles all development-mode authentication logic:
 * - Creates persisted dev users in database for referential integrity
 * - Provides consistent dev identity
 * - Ensures chat system can find user records
 * 
 * Only active when NODE_ENV=development
 */

const { v4: uuidv4 } = require('uuid');

// In-memory dev user storage for caching
let devUser = null;

const DEV_USER_DEFAULTS = {
  email: 'dev@localhost.com',
  username: 'Developer'
};

class DevAuthProvider {
  /**
   * Get or create the development user
   * Creates user in database to ensure referential integrity with chat system
   */
  static async getDevUser(requestBody = {}, authPersistAdapter = null) {
    // Allow customization via request body, with sensible defaults
    const email = requestBody.email || DEV_USER_DEFAULTS.email;
    const username = requestBody.username || DEV_USER_DEFAULTS.username;
    
    // Check if user exists in database first
    if (authPersistAdapter) {
      try {
        const existingUser = await authPersistAdapter.getUserInfo(email);
        if (existingUser) {
          console.log(`[DevAuth] Found existing user in database: ${email}`);
          devUser = {
            id: existingUser.id,
            email: existingUser.email,
            username: existingUser.username,
            isDevelopmentUser: true
          };
          return devUser;
        }
      } catch (error) {
        console.warn(`[DevAuth] Error checking for existing user: ${error.message}`);
      }
    }
    
    // Return existing dev user if it matches the requested email and we don't have persistence adapter
    if (devUser && !authPersistAdapter && (devUser.email === email || 
        (email === DEV_USER_DEFAULTS.email && username === DEV_USER_DEFAULTS.username))) {
      return devUser;
    }
    
    // Create new dev user
    const userId = uuidv4();
    devUser = {
      id: userId,
      email: email,
      username: username,
      // No password needed for dev mode
      createdAt: new Date().toISOString(),
      isDevelopmentUser: true
    };

    // Persist to database if adapter is available
    if (authPersistAdapter) {
      try {
        const createdUser = await authPersistAdapter.registerUser(username, email, 'dev-password-placeholder');
        // Use the actual ID returned from the database
        devUser.id = createdUser.id;
        console.log(`[DevAuth] Created and persisted dev user to database: ${email} with ID: ${createdUser.id}`);
      } catch (error) {
        console.warn(`[DevAuth] Error persisting dev user to database: ${error.message}`);
        // Continue with in-memory user if DB fails
      }
    } else {
      console.log(`[DevAuth] Created in-memory dev user (no persistence): ${email}`);
    }
    
    console.log(`[DevAuth] Created in-memory dev user: ${email}`);
    return devUser;
  }

  /**
   * Check if current environment supports dev auth
   */
  static isDevMode() {
    return process.env.NODE_ENV === 'development';
  }

  /**
   * Get default dev user without persistence
   */
  static getDefaultDevUser() {
    return {
      id: uuidv4(),
      email: DEV_USER_DEFAULTS.email,
      username: DEV_USER_DEFAULTS.username,
      isDevelopmentUser: true
    };
  }

  /**
   * Clear the in-memory dev user (useful for testing)
   */
  static clearDevUser() {
    devUser = null;
  }
}

module.exports = DevAuthProvider;