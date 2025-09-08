// octokitPlugin.js
/* eslint-disable no-unused-vars */
'use strict';
const fp = require('fastify-plugin');
const { Octokit } = require('@octokit/rest');

module.exports = fp(async function octokitPlugin(fastify, opts) {
  fastify.log.info('[octokitPlugin] initializing…');

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    fastify.log.error('[octokitPlugin] GITHUB_TOKEN missing');
    throw new Error('GITHUB_TOKEN environment variable is required');
  }

  const octokit = new Octokit({
    auth: token,
    userAgent: 'eventstorm/v0.0.1',
  });

  fastify.decorate('octokit', octokit);
  fastify.log.info('[octokitPlugin] octokit registered successfully');
});
