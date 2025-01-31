'use strict';
/* eslint-disable no-unused-vars */

const fp = require('fastify-plugin');

module.exports = fp(async function gitRouter(fastify, opts) {
  console.log('gitRouter is loaded!');

  // Route to create a new project
  fastify.route({
    method: 'POST',
    url: '/project',
    handler: fastify.createProject,
  });

  // Route to fetch a list of projects
  fastify.route({
    method: 'GET',
    url: '/projects',
    handler: fastify.fetchProjectList,
  });

  // Route to fetch a specific project
  fastify.route({
    method: 'GET',
    url: '/project/:projectId',
    handler: fastify.fetchProject,
  });

  // Route to rename a project
  fastify.route({
    method: 'PATCH',
    url: '/project/:projectId/rename',
    handler: fastify.renameProject,
  });

  // Route to delete a project
  fastify.route({
    method: 'DELETE',
    url: '/project/:projectId',
    handler: fastify.deleteProject,
  });

  // Route to add a repository to a project
  fastify.route({
    method: 'POST',
    url: '/project/:projectId/repository',
    handler: fastify.addRepository,
  });

  // Route to remove a repository from a project
  fastify.route({
    method: 'DELETE',
    url: '/project/:projectId/repository',
    handler: fastify.removeRepository,
  });

  // Route to fetch a repository
  fastify.route({
    method: 'GET',
    url: '/repository/:repositoryId',
    handler: fastify.fetchRepository,
  });

  // Route to analyze a repository
  fastify.route({
    method: 'POST',
    url: '/repository/:repositoryId/analyze',
    handler: fastify.analyzeRepository,
  });

});
