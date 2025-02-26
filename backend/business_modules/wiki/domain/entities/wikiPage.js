// project_wiki_module/wikiPage.js
/* eslint-disable no-unused-vars */
'use strict';

const { v4: uuidv4 } = require('uuid');
const WikiPageTitle = require('../value_objects/wikiPageTitle');

class WikiPage {
  constructor(userId, title = '', content = '') {
    this.userId = userId;
    this.pageId = uuidv4();
    this.title = new WikiPageTitle(title);
    this.content = content;
    this.status = 'draft'; // draft, published, etc.
    this.revisions = [];
  }

    async fetchPage(IGitWikiPersistPort) { 
    const page = await IGitWikiPersistPort.fetchPage(this.pageId); 
    return page;
    }

  async create(IGitWikiPersistPort) {
    const newPage = {
      pageId: this.pageId,
      title: this.title.toString(),
      content: this.content,
      createDate: new Date(),
    };
    await IGitWikiPersistPort.createPage(this.userId, newPage);
    console.log(`Wiki page ${newPage.pageId} created for user ${this.userId}.`);
  }

  async updateContent(newContent, IGitWikiPersistPort) {
    this.content = newContent;
    await IGitWikiPersistPort.updatePageContent(this.pageId, newContent);
    console.log(`Wiki page ${this.pageId} content updated.`);
  }

  async rename(newTitle, IGitWikiPersistPort) {
    this.title = new WikiPageTitle(newTitle);
    await IGitWikiPersistPort.renamePage(this.pageId, this.title.toString());
    console.log(`Wiki page ${this.pageId} renamed to: ${this.title}`);
  }

}

module.exports = WikiPage;
