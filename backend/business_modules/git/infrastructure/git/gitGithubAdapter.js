/* eslint-disable no-console */
/* eslint-disable no-unused-vars */
'use strict';
const { Octokit } = require('@octokit/rest');
const IGitPort = require('../../domain/ports/IGitPort');

class GitGithubAdapter extends IGitPort {
  constructor() {
    super();
    const token = process.env.GITHUB_TOKEN;
    if (!token) throw new Error('Missing GITHUB_TOKEN');
    this.octokit = new Octokit({ auth: token });
  }

  async fetchRepo(userId, repoId) {
    console.log(`=== GitGithubAdapter.fetchRepo called ===`);
    console.log(`Parameters: userId=${userId}, repoId=${repoId}`);
    console.log(`Github token present: ${process.env.GITHUB_TOKEN ? 'YES' : 'NO'}`);
    
    const parts = repoId.split('/');
    if (parts.length !== 2) {
      throw new Error(`Invalid repoId format "${repoId}", expected "owner/repo"`);
    }
    const [owner, repo] = parts;
    console.log(`Parsed owner: ${owner}, repo: ${repo}`);
    
    try {
      console.log('Step 1: Fetching repository metadata...');
      
      // 1. Fetch repository details
      const repoResponse = await this.octokit.rest.repos.get({
        owner,
        repo,
        headers: {
          accept: 'application/vnd.github+json'
        }
      });

      console.log(`Repository response received. Status: ${repoResponse.status}`);
      console.log(`Default branch: ${repoResponse.data.default_branch}`);

      const defaultBranch = repoResponse.data.default_branch;

      console.log('Step 2: Fetching branch details...');

      // 2. Fetch the default branch details
      const branchResponse = await this.octokit.rest.repos.getBranch({
        owner,
        repo,
        branch: defaultBranch,
        headers: {
          accept: 'application/vnd.github+json'
        }
      });

      console.log('Step 3: Fetching repository tree (file structure)...');

      // 3. Fetch the complete file tree
      const treeResponse = await this.octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: branchResponse.data.commit.sha,
        recursive: 1 // Get all files recursively
      });

      console.log(`Tree fetched: ${treeResponse.data.tree.length} items found`);

      console.log('Step 4: Filtering and fetching code files...');

      // 4. Filter for code files and fetch their content
      const codeFiles = await this.fetchCodebaseForRAG(owner, repo, treeResponse.data.tree);

      console.log(`Codebase fetched: ${codeFiles.length} files processed`);

      // 5. Combine all data in RAG-friendly format
      const data = {
        // Repository metadata
        repository: repoResponse.data,
        branch: branchResponse.data,
        
        // RAG-optimized codebase
        codebase: {
          totalFiles: codeFiles.length,
          files: codeFiles,
          summary: this.generateCodebaseSummary(codeFiles, repoResponse.data),
          lastUpdated: new Date().toISOString(),
          fetchedBy: userId,
          branchName: defaultBranch,
          commitSha: branchResponse.data.commit.sha
        }
      };

      console.log('=== GitGithubAdapter.fetchRepo completed successfully ===');
      return data;
    } catch (error) {
      console.error(`=== ERROR in GitGithubAdapter.fetchRepo ===`);
      console.error(`Error type: ${error.constructor.name}`);
      console.error(`Error message: ${error.message}`);
      console.error(`Error status: ${error.status}`);
      console.error(`Error response:`, error.response?.data);
      console.error(`Full error:`, error);
      throw error;
    }
  }

  generateCodebaseSummary(codeFiles, repoData) {
    const languageStats = {};
    const fileTypeStats = {};
    let totalLines = 0;
    let totalCharacters = 0;

    codeFiles.forEach(file => {
      // Language statistics
      const lang = file.language;
      languageStats[lang] = (languageStats[lang] || 0) + 1;
      
      // File type statistics
      const type = file.metadata.fileType;
      fileTypeStats[type] = (fileTypeStats[type] || 0) + 1;
      
      // Size statistics
      totalLines += file.metadata.lineCount;
      totalCharacters += file.metadata.characterCount;
    });

    return {
      repository: {
        name: repoData.full_name,
        description: repoData.description,
        primaryLanguage: repoData.language,
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        size: repoData.size,
        createdAt: repoData.created_at,
        updatedAt: repoData.updated_at
      },
      codebaseStats: {
        totalFiles: codeFiles.length,
        totalLines,
        totalCharacters,
        averageFileSize: Math.round(totalCharacters / codeFiles.length),
        languageDistribution: languageStats,
        fileTypeDistribution: fileTypeStats
      },
      // For RAG context
      ragContext: {
        repositoryDescription: repoData.description || `${repoData.full_name} - A ${repoData.language || 'mixed-language'} repository`,
        mainLanguages: Object.keys(languageStats).slice(0, 3),
        hasDocumentation: fileTypeStats.documentation > 0,
        hasTests: fileTypeStats.test > 0,
        complexityIndicator: this.calculateComplexityIndicator(codeFiles.length, totalLines, Object.keys(languageStats).length)
      }
    };
  }

  calculateComplexityIndicator(fileCount, lineCount, languageCount) {
    // Simple heuristic for complexity
    if (fileCount < 10 && lineCount < 1000) return 'simple';
    if (fileCount < 50 && lineCount < 10000) return 'moderate';
    if (fileCount < 200 && lineCount < 50000) return 'complex';
    return 'very_complex';
  }

  async fetchDocs(userId, repoId) {
    // Keep your existing docs method unchanged
    const [owner, repo] = repoId.split('/');
    const docsRepo = `${repo}.docs`;
    try {
      const repoResponse = await this.octokit.rest.repos.get({
        owner,
        repo,
        headers: {
          accept: 'application/vnd.github+json'
        }
      });

      const defaultBranch = repoResponse.data.default_branch;

      const response = await this.octokit.rest.repos.downloadZipballArchive({
        owner,
        repo: docsRepo,
        ref: defaultBranch
      });
      console.log(`Docs for '${defaultBranch}' branch downloaded for repository: ${repoId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching docs for repository ${repoId}:`, error.message);
      throw error;
    }
  }
}

module.exports = GitGithubAdapter;