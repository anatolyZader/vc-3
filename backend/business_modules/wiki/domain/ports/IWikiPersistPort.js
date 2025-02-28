/* eslint-disable no-unused-vars */
'use strict';

class IWikiPersistPort {
  constructor() {
    if (new.target === IWikiPersistPort) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }


}

module.exports = IWikiPersistPort;
