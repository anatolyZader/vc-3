/* eslint-disable no-unused-vars */
'use strict';

const { Pool } = require('pg');
const IWikiPersistPort = require('../../domain/ports/IWikiPersistPort');

class WikiPostgresAdapter extends IWikiPersistPort {
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

}

module.exports = WikiPostgresAdapter;
