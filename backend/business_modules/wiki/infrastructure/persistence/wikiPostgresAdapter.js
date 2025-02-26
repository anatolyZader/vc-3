/* eslint-disable no-unused-vars */
'use strict';

const { Pool } = require('pg');
const IProjectWikiPersistPort = require('../../domain/ports/IProjectWikiPersistPort');
const WikiPage = require('../../domain/entities/wikiPage');
const WikiPageTitle = require('../../domain/value_objects/wikiPageTitle');

class WikiPostgresAdapter extends IProjectWikiPersistPort {
  constructor() {
    super();
    this.pool = new Pool({
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DATABASE,
      host: process.env.PG_HOST,
      port: process.env.PG_PORT,
    });
  }

  /**
   * Persist a newly created wiki page.
   */
  async createPage(userId, page) {
    const client = await this.pool.connect();
    try {
      const pageId = page.pageId;
      const pageTitle = page.title.toString();
      const content = page.content;
      const createDate = new Date();

      await client.query(
        `INSERT INTO wiki_pages (id, user_id, title, content, create_date)
         VALUES ($1, $2, $3, $4, $5)`,
        [pageId, userId, pageTitle, content, createDate]
      );

      console.log(`Created wiki page ${pageId} for user ${userId}`);
      return { pageId };
    } catch (error) {
      console.error('Error creating wiki page:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update the content of a wiki page.
   */
  async updatePageContent(pageId, newContent) {
    const client = await this.pool.connect();
    try {
      await client.query(
        `UPDATE wiki_pages
         SET content = $1
         WHERE id = $2`,
        [newContent, pageId]
      );
      console.log(`Updated content for wiki page ${pageId}`);
    } catch (error) {
      console.error('Error updating wiki page content:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Rename a wiki page.
   */
  async renamePage(pageId, newTitle) {
    const client = await this.pool.connect();
    try {
      await client.query(
        `UPDATE wiki_pages
         SET title = $1
         WHERE id = $2`,
        [newTitle.toString(), pageId]
      );
      console.log(`Renamed wiki page ${pageId} to ${newTitle.toString()}`);
    } catch (error) {
      console.error('Error renaming wiki page:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Fetch all wiki pages for a user.
   */
  async fetchPages(userId) {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT * FROM wiki_pages
         WHERE user_id = $1
         ORDER BY create_date DESC`,
        [userId]
      );
      console.log('Wiki pages retrieved successfully for user:', userId);
      const pages = rows.map((row) => {
        const page = new WikiPage(row.user_id, row.title, row.content);
        page.pageId = row.id;
        page.createDate = row.create_date;
        return page;
      });
      return pages;
    } catch (error) {
      console.error('Error fetching wiki pages:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Fetch a single wiki page by ID.
   */
  async fetchPage(userId, pageId) {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT * FROM wiki_pages
         WHERE user_id = $1 AND id = $2`,
        [userId, pageId]
      );
      if (rows.length === 0) {
        console.log(`No wiki page found with ID: ${pageId} for user ${userId}`);
        return null;
      }
      const row = rows[0];
      const page = new WikiPage(row.user_id, row.title, row.content);
      page.pageId = row.id;
      page.createDate = row.create_date;
      console.log(`Fetched wiki page ${pageId} for user ${userId}`);
      return page;
    } catch (error) {
      console.error('Error fetching wiki page:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete a wiki page.
   */
  async deletePage(userId, pageId) {
    const client = await this.pool.connect();
    try {
      await client.query(
        `DELETE FROM wiki_pages
         WHERE user_id = $1 AND id = $2`,
        [userId, pageId]
      );
      console.log(`Deleted wiki page ${pageId} for user ${userId}`);
    } catch (error) {
      console.error('Error deleting wiki page:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Search for wiki pages by query.
   */
  async searchInPages(userId, query) {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT * FROM wiki_pages
         WHERE user_id = $1 AND title ILIKE $2
         ORDER BY create_date DESC`,
        [userId, `%${query}%`]
      );
      console.log(`Found ${rows.length} wiki page(s) for user ${userId} matching query "${query}"`);
      return rows;
    } catch (error) {
      console.error('Error searching wiki pages:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Edit a wiki revision.
   */
  async editRevision(revisionId, newContent) {
    const client = await this.pool.connect();
    try {
      await client.query(
        `UPDATE wiki_revisions
         SET content = $1, timestamp = $2
         WHERE id = $3`,
        [newContent, new Date(), revisionId]
      );
      console.log(`Edited revision ${revisionId} with new content.`);
    } catch (error) {
      console.error('Error editing wiki revision:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = WikiPostgresAdapter;
