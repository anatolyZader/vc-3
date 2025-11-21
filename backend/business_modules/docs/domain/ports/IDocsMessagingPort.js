/* eslint-disable no-unused-vars */
'use strict';

class IDocsMessagingPort {
  constructor() {
    if (new.target === IDocsMessagingPort) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }

  async publishFetchDocsEvent(fetchedDocs) {
    throw new Error('Method not implemented.');
  }
}

module.exports = IDocsMessagingPort;