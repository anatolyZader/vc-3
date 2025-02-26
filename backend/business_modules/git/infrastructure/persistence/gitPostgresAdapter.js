'use strict';

const { Pool } = require('pg');
const IGitPersistPort = require('../../domain/ports/IGitPersistPort');

class GitPostgresAdapter extends IGitPersistPort {
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

  // async createProject(userId, projectData) {
  //   const client = await this.pool.connect();
  //   try {
  //     const { projectId, title, createdAt } = projectData;
  //     await client.query(
  //       `INSERT INTO projects (id, user_id, title, created_at)
  //        VALUES ($1, $2, $3, $4)`,
  //       [projectId, userId, title, createdAt]
  //     );
  //     console.log(`Created project ${projectId} for user ${userId}.`);
  //   } catch (error) {
  //     console.error('Error creating project:', error);
  //     throw error;
  //   } finally {
  //     client.release();
  //   }
  // }

  // async renameProject(projectId, newTitle) {
  //   const client = await this.pool.connect();
  //   try {
  //     await client.query(
  //       `UPDATE projects
  //        SET title = $1
  //        WHERE id = $2`,
  //       [newTitle, projectId]
  //     );
  //     console.log(`Renamed project ${projectId} to ${newTitle}.`);
  //   } catch (error) {
  //     console.error('Error renaming project:', error);
  //     throw error;
  //   } finally {
  //     client.release();
  //   }
  // }

  // async addRepositoryToProject(projectId, repositoryId) {
  //   const client = await this.pool.connect();
  //   try {
  //     await client.query(
  //       `UPDATE repositories
  //        SET project_id = $1
  //        WHERE id = $2`,
  //       [projectId, repositoryId]
  //     );
  //     console.log(`Added repository ${repositoryId} to project ${projectId}.`);
  //   } catch (error) {
  //     console.error('Error adding repository to project:', error);
  //     throw error;
  //   } finally {
  //     client.release();
  //   }
  // }

  // async removeRepositoryFromProject(projectId, repositoryId) {
  //   const client = await this.pool.connect();
  //   try {
  //     await client.query(
  //       `UPDATE repositories
  //        SET project_id = NULL
  //        WHERE id = $1 AND project_id = $2`,
  //       [repositoryId, projectId]
  //     );
  //     console.log(`Removed repository ${repositoryId} from project ${projectId}.`);
  //   } catch (error) {
  //     console.error('Error removing repository from project:', error);
  //     throw error;
  //   } finally {
  //     client.release();
  //   }
  // }

  // async updateProjectDescription(projectId, description) {
  //   const client = await this.pool.connect();
  //   try {
  //     await client.query(
  //       `UPDATE projects
  //        SET description = $1
  //        WHERE id = $2`,
  //       [description, projectId]
  //     );
  //     console.log(`Updated description of project ${projectId}.`);
  //   } catch (error) {
  //     console.error('Error updating project description:', error);
  //     throw error;
  //   } finally {
  //     client.release();
  //   }
  // }

  async analyzeRepository(repositoryId) {
    console.log(`Analyzing repository ${repositoryId}...`);
    // Return a dummy or computed result
    return { repositoryId, analysis: 'Repository analysis complete.' };
  }

  async fetchProjects(userId) {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT *
         FROM projects
         WHERE user_id = $1`,
        [userId]
      );
      console.log(`Fetched ${rows.length} projects for user ${userId}.`);
      return rows;
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async fetchProjectById(projectId) {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT *
         FROM projects
         WHERE id = $1`,
        [projectId]
      );
      return rows.length ? rows[0] : null;
    } catch (error) {
      console.error('Error fetching project by ID:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteProject(userId, projectId) {
    const client = await this.pool.connect();
    try {
      await client.query(
        `DELETE FROM projects
         WHERE id = $1 AND user_id = $2`,
        [projectId, userId]
      );
      console.log(`Deleted project ${projectId} for user ${userId}.`);
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = GitPostgresAdapter;
