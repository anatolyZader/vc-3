'use strict';
// authPostgresAdapter.js 

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const IAuthPersistPort = require('../../domain/ports/IAuthPersistPort');

class AuthPostgresAdapter extends IAuthPersistPort {
  constructor() {
    super();
    this.pool = new Pool({
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DATABASE,
      host: process.env.PG_HOST,
      port: process.env.PG_PORT,
    });
  }

  async readAllUsers() {
    console.log('this.pool at authPostgresAdapter: ', this.pool);
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query('SELECT * FROM users');
      return rows;
    } catch (error) {
      console.error('Error reading all users:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async createUser(username, email, password) {
    const client = await this.pool.connect();
    try {
      const id = uuidv4();

      // Check for duplicate email
      const existingUser = await client.query('SELECT * FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        throw new Error('Email already exists');
      }

      // Use plain-text password
      await client.query(
        'INSERT INTO users (id, username, email, password) VALUES ($1, $2, $3, $4)',
        [id, username, email, password]
      );
      return { id, username, email };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async readUser(email) {
    console.log('Querying user with email:', email);
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query('SELECT * FROM users WHERE email=$1', [email]);
      return rows.length ? rows[0] : null;
    } catch (error) {
      console.error('Error reading user:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async removeUser(email, password) {
    const client = await this.pool.connect();
    try {
      // Step 1: Retrieve the user by email
      const { rows } = await client.query('SELECT password FROM users WHERE email=$1', [email]);
      console.log("rows: ", rows)
      if (rows.length === 0) {
        console.log('No user found with the given email');
        return false; // User not found
      }
  
      // Step 2: Validate the provided password
      const storedPassword = rows[0].password;
      if (storedPassword !== password) {
        console.log('Provided password does not match');
        return false; // Password mismatch
      }
  
      // Step 3: Delete the user if the password matches
      const deleteResult = await client.query('DELETE FROM users WHERE email=$1', [email]);
      console.log(`User deleted: ${deleteResult.rowCount > 0}`);
      return deleteResult.rowCount > 0; // Return true if a row was deleted
    } catch (error) {
      console.error('Error removing user:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
}

module.exports = AuthPostgresAdapter;
