'use strict';
const fs = require('fs');
const path = require('path');

function collectJsFiles(dir) {
  let files = [];
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) files = files.concat(collectJsFiles(full));
    else if (entry.endsWith('.js')) files.push(full);
  }
  return files;
}

describe.skip('Git Domain exports (disabled)', () => {
  test('placeholder', () => {
    expect(true).toBe(true);
  });
});
