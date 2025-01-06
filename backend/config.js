// config.js

'use strict';

const logOptions = require('./aop/log/logPlugin');

module.exports = {
  logger: logOptions,
  disableRequestLogging: true,
  requestIdLogLabel: false,
  requestIdHeader: 'x-request-id',
  https: {
    keyPath: '/etc/letsencrypt/live/eventstorm.me/privkey.pem',
    certPath: '/etc/letsencrypt/live/eventstorm.me/fullchain.pem',
  },
  server: {
    port: 443,
    host: '0.0.0.0',
  },
};
