// wiki.js
/* eslint-disable no-unused-vars */
'use strict';


class Wiki {
    constructor(userId) {
        this.userId = userId;
    }

    async fetchWiki(repoId, IWikiGitPort) { 
    const wiki = await IWikiGitPort.fetchWiki(repoId); 
    return wiki;
  }  
}

module.exports = Wiki;
