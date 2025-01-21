'use strict';
// const fs = require('fs');
const config = require('./config');

module.exports = {
  server: {
    // https: {
    //   key: fs.readFileSync(config.https.keyPath),
    //   cert: fs.readFileSync(config.https.certPath),
    // },
    // port: config.server.port || 443,
    port: 3000,
    host: '127.0.0.1', // or '0.0.0.0'
  },
  options: {
    logger: config.logger,
  },
};
