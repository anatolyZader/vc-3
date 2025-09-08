// loggerConfig.js
module.exports = {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'SYS:standard',
        colorize: true,
      },
    },
  };
  