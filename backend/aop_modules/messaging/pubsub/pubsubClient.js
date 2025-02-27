const { PubSub } = require('@google-cloud/pubsub')
const pubsubClient = new PubSub();

// Export the instance so other modules can use it.
module.exports = pubsubClient;
