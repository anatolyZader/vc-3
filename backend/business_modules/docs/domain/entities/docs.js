// docs.js
/* eslint-disable no-unused-vars */
'use strict';


class Docs {
    constructor(userId) {
        this.userId = userId;
    }

    async fetchDocs(repoId, IDocsGitPort) { 
    const docs = await IDocsGitPort.fetchDocs(repoId); 
    return docs;
  }  
}

module.exports = Docs;
