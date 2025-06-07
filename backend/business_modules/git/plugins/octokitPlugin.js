// octokitPlugin.js
/* eslint-disable no-unused-vars */ 
'use strict';

const fp = require('fastify-plugin');
const { Octokit } = require('@octokit/rest');

async function octokitPlugin(fastify, options) {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is missing.');
  }

  const octokit = new Octokit({
    auth: token,
    userAgent: 'eventstorm/v0.0.1',
  });

  fastify.decorate('octokit', octokit);
}

module.exports = fp(octokitPlugin);