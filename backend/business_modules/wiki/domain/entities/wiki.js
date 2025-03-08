// project_wiki_module/wikiPage.js
/* eslint-disable no-unused-vars */
'use strict';

const { v4: uuidv4 } = require('uuid');

class Wiki {
    constructor(userId) {
        this.userId = userId;
    }

    async fetchWiki(repoId, IWikiGitPort) { 
    const wiki = await IWikiGitPort.fetchWiki(this.userId, repoId); 
    return wiki;
  }

}

module.exports = Wiki;
