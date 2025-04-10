// config.js

'use strict';

const logOptions = require('./aop/log/logPlugin');

module.exports = {
  logger: logOptions,
  disableRequestLogging: true,
  requestIdLogLabel: false,
  requestIdHeader: 'x-request-id',
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
};
