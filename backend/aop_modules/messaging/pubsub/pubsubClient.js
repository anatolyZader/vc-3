const { PubSub } = require('@google-cloud/pubsub')
const pubSubClient = new PubSub();

// Export the instance so other modules can use it.
module.exports = pubSubClient;
