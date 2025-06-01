// /home/myzader/eventstorm/backend/scripts/dump-openapi.js
'use strict';

const path = require('path');
const fs = require('fs');
const Fastify = require('fastify');
const buildApp = require('../app'); 

(async () => {
  try {
    // 1) Create a fresh Fastify instance:
    const app = Fastify({
      logger: false // you can set true if you want logs in CI
    });

    // 2) Register your “app” plugin exactly as you do at runtime:
    await app.register(buildApp);

    // 3) Now wait until all plugins (including @fastify/swagger) are loaded:
    await app.ready();

    // 4) Call fastify.swagger() to retrieve the full OpenAPI JSON:
    const spec = app.swagger();

    // 5) Compute the output directory for openapi.json:
    //    We want: /home/myzader/eventstorm/backend/business_modules/api/infrastructure/api/openapi.json
    const outputDir = path.resolve(
      __dirname,
      '../business_modules/api/infrastructure/api'
    );

    // 6) Ensure that directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 7) Write the JSON to disk
    const outputPath = path.join(outputDir, 'openapi.json');
    fs.writeFileSync(outputPath, JSON.stringify(spec, null, 2), 'utf8');
    console.log(`✔ openapi.json written to ${outputPath}`);

    // 8) Shut down cleanly
    await app.close();
    process.exit(0);
  } catch (err) {
    console.error('✘ Failed to dump OpenAPI spec:', err);
    process.exit(1);
  }
})();
