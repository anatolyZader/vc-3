// octokitPlugin.js
/* eslint-disable no-unused-vars */ 
'use strict';
const { Octokit, App } = require("@octokit/rest");

console.log('process.env.GITHUB_TOKEN at octokitPlugin: ', process.env.GITHUB_TOKEN);

const token = process.env.GITHUB_TOKEN;
if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is missing.');
}

const octokit = new Octokit({
  auth: token,
  userAgent: 'eventstorm/v0.0.1',
});

module.exports = octokit;