
const IDependencyResolver = require('./IDependencyResolver');

class DIAdapter extends IDependencyResolver {
  constructor(fastify) {
    super();
    this.fastify = fastify;
    
  }

  getDependency(dependencyName) {
    return this.fastify.diContainer.resolve(dependencyName);
  }
}

module.exports = DIAdapter;
