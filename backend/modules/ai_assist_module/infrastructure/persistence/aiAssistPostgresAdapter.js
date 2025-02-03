// aiAssistPostgresAdapter.js
/* eslint-disable no-unused-vars */
'use strict';

const { Pool } = require('pg');


class aiAssistPostgresAdapter {
  constructor() {
    this.pool = new Pool({
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DATABASE,
      host: process.env.PG_HOST,
      port: process.env.PG_PORT,
    });
  }

  async hello() {
    console.log('hello from chatPostgresAdapter hello() method');
  }

  
}

module.exports = aiAssistPostgresAdapter;
