#!/usr/bin/env node
/**
 * Simple smoke test to ensure processor modules load without executing full pipeline logic.
 * It imports key processor classes and instantiates them with minimal/no dependencies.
 * This helps catch accidental top-level await or unresolved promise usage regressions.
 */

function safeRequire(p) {
  try {
    const mod = require(p);
    console.log(`[SMOKE] Loaded: ${p}`);
    return mod;
  } catch (e) {
    console.error(`[SMOKE] Failed to load ${p}:`, e.message);
    process.exitCode = 1;
  }
}

const base = '../business_modules/ai/infrastructure/ai/rag_pipelines/context/processors';

const EmbeddingManager = safeRequire(`${base}/embeddingManager.js`);
const DocsProcessor = safeRequire(`${base}/docsProcessor.js`);
const ApiSpecProcessor = safeRequire(`${base}/apiSpecProcessor.js`);
const RepoProcessor = safeRequire(`${base}/repoProcessor.js`);

function attemptConstruct(name, Ctor, args = []) {
  try {
    const instance = new Ctor(...args);
    console.log(`[SMOKE] Constructed ${name}`);
    return instance;
  } catch (e) {
    console.warn(`[SMOKE] Could not construct ${name}: ${e.message}`);
  }
}

attemptConstruct('EmbeddingManager', EmbeddingManager, [/* empty opts to rely on defaults */]);
attemptConstruct('DocsProcessor', DocsProcessor, [{}]);
attemptConstruct('ApiSpecProcessor', ApiSpecProcessor, [{}]);
attemptConstruct('RepoProcessor', RepoProcessor, [{}]);

console.log('[SMOKE] Completed processor smoke test');
