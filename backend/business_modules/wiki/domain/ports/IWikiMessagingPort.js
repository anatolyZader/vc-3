/* eslint-disable no-unused-vars */
'use strict';

class IWikiMessagingPort {
  constructor() {
    if (new.target === IWikiMessagingPort) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }

  async publishFetchWikiEvent(fetchedWiki) {
    throw new Error('Method not implemented.');
  }
}

module.exports = IWikiMessagingPort;