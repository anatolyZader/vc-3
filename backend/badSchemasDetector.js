// debug/bad‑schema‑detector.js
'use strict';
const fp = require('fastify-plugin');

module.exports = fp(async function badSchemaDetector (fastify) {
  const offenders = [];

  // Runs once for every route that is being registered
  fastify.addHook('onRoute', (route) => {
    const res = route.schema?.response;
    if (!res) return;                    // route has no response map

    for (const [code, value] of Object.entries(res)) {
      if (value === undefined) {
        offenders.push({ url: route.url, method: route.method, code });
      }
    }
  });

  // After all plugins & routes – but BEFORE swagger turns them into OpenAPI
  fastify.addHook('onReady', async () => {
    if (offenders.length) {
      fastify.log.error(
        '❌ Swagger will crash because these routes have ' +
        'response schemas equal to undefined:\n' +
        offenders.map(o => `${o.method} ${o.url} → ${o.code}`).join('\n')
      );
      // Fail fast during development
      process.exit(1);
    }
  });
});
