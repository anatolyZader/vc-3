'use strict';

const fastifySession = require('@fastify/session');
const { Store } = fastifySession;

class RedisStore extends Store {
  constructor(sendCommand) {
    super();
    this.send = sendCommand;
  }

  // get session data from Redis
  // sid - session ID, sess - session object, ttlMs - time to live in milliseconds (for JavaScript/Node.js), cb - callback function
  get(sid, cb) {
    this.send(['GET', sid])
      .then((data) => cb(null, data ? JSON.parse(data) : null))
      .catch(cb);
  }

  // store session data in Redis
  set(sid, sess, ttlMs, cb) {
    const data = JSON.stringify(sess);
    const ttl  = typeof ttlMs === 'number' ? Math.ceil(ttlMs / 1000) : undefined;
    const cmd  = ttl ? ['SETEX', sid, ttl, data] : ['SET', sid, data];
    this.send(cmd).then(() => cb(null)).catch(cb);
  }

  destroy(sid, cb) {
    this.send(['DEL', sid]).then(() => cb(null)).catch(cb);
  }
}

module.exports = RedisStore;
