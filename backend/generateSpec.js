#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');
const app  = require('./app');

async function writeSpec() {
  await app.ready();

  // generate the OpenAPI spec
  const spec = app.swagger(); // or app.openapi()

  // resolve the target file under business_modules/api/infrastructure/api/
  const out = path.resolve(
    __dirname,
    'business_modules',
    'api',
    'infrastructure',
    'api',
    'httpApiSpec.json'
  );

  // ensure the directory exists
  fs.mkdirSync(path.dirname(out), { recursive: true });

  // write the spec
  fs.writeFileSync(out, JSON.stringify(spec, null, 2), 'utf8');

  console.log(`✔️  OpenAPI spec written to ${out}`);
  process.exit(0);
}

writeSpec().catch(err => {
  console.error(err);
  process.exit(1);
});
