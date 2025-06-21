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

  async fetchCodebaseForRAG(owner, repo, treeItems) {
    const codeFiles = [];
    const maxFileSizeBytes = 1024 * 1024; // 1MB limit per file
    const maxTotalFiles = 500; // Limit total files to prevent API abuse
    
    // Filter for code files (exclude binaries, large files, etc.)
    const relevantFiles = treeItems
      .filter(item => item.type === 'blob') // Only files, not directories
      .filter(item => this.isCodeFile(item.path))
      .filter(item => item.size <= maxFileSizeBytes)
      .slice(0, maxTotalFiles); // Limit total files

    console.log(`Processing ${relevantFiles.length} relevant files out of ${treeItems.length} total items`);

    // Fetch file contents in batches to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < relevantFiles.length; i += batchSize) {
      const batch = relevantFiles.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (file) => {
        try {
          const contentResponse = await this.octokit.rest.repos.getContent({
            owner,
            repo,
            path: file.path,
            headers: {
              accept: 'application/vnd.github+json'
            }
          });

          // Decode base64 content
          const content = Buffer.from(contentResponse.data.content, 'base64').toString('utf8');
          
          return {
            // RAG-optimized structure
            path: file.path,
            name: file.path.split('/').pop(),
            directory: file.path.substring(0, file.path.lastIndexOf('/')) || '.',
            extension: this.getFileExtension(file.path),
            language: this.detectLanguage(file.path),
            size: file.size,
            content: content,
            sha: file.sha,
            url: file.url,
            
            // RAG metadata for better retrieval
            metadata: {
              fileType: this.getFileType(file.path),
              isTestFile: this.isTestFile(file.path),
              isConfigFile: this.isConfigFile(file.path),
              isDocumentationFile: this.isDocumentationFile(file.path),
              lineCount: content.split('\n').length,
              characterCount: content.length,
              lastModified: new Date().toISOString(), // Could be enhanced with actual commit date
              
              // For LangChain document chunking
              documentId: `${repo}:${file.path}`,
              source: `github:${owner}/${repo}`,
              chunk_metadata: {
                repository: `${owner}/${repo}`,
                file_path: file.path,
                file_type: this.getFileType(file.path),
                language: this.detectLanguage(file.path)
              }
            }
          };
        } catch (error) {
          console.warn(`Failed to fetch content for ${file.path}:`, error.message);
          return null; // Skip failed files
        }
      });

      const batchResults = await Promise.all(batchPromises);
      const validResults = batchResults.filter(result => result !== null);
      codeFiles.push(...validResults);

      // Small delay between batches to be nice to GitHub API
      if (i + batchSize < relevantFiles.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return codeFiles;
  }

  isCodeFile(path) {
    const codeExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.hpp',
      '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.clj',
      '.sh', '.bash', '.zsh', '.ps1', '.sql', '.html', '.css', '.scss', '.sass',
      '.less', '.vue', '.svelte', '.json', '.xml', '.yaml', '.yml', '.toml',
      '.md', '.rst', '.txt', '.ini', '.cfg', '.conf', '.dockerfile', '.makefile',
      '.gradle', '.maven', '.cmake', '.r', '.matlab', '.lua', '.perl', '.dart'
    ];

    const extension = this.getFileExtension(path).toLowerCase();
    const filename = path.split('/').pop().toLowerCase();
    
    // Check by extension
    if (codeExtensions.includes(extension)) return true;
    
    // Check by filename patterns
    const codeFilenames = [
      'readme', 'license', 'changelog', 'contributing', 'dockerfile',
      'makefile', 'gemfile', 'podfile', 'cartfile', 'package.json',
      'composer.json', 'requirements.txt', 'pipfile', 'poetry.lock'
    ];
    
    return codeFilenames.some(name => filename.includes(name));
  }

  getFileExtension(path) {
    const lastDot = path.lastIndexOf('.');
    return lastDot > 0 ? path.substring(lastDot) : '';
  }

  detectLanguage(path) {
    const extension = this.getFileExtension(path).toLowerCase();
    const languageMap = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.c': 'c',
      '.cpp': 'cpp',
      '.h': 'c',
      '.hpp': 'cpp',
      '.cs': 'csharp',
      '.php': 'php',
      '.rb': 'ruby',
      '.go': 'go',
      '.rs': 'rust',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.json': 'json',
      '.xml': 'xml',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.md': 'markdown',
      '.sql': 'sql',
      '.sh': 'bash',
      '.bash': 'bash'
    };
    
    return languageMap[extension] || 'text';
  }

  getFileType(path) {
    const filename = path.split('/').pop().toLowerCase();
    const extension = this.getFileExtension(path).toLowerCase();
    
    if (this.isTestFile(path)) return 'test';
    if (this.isConfigFile(path)) return 'config';
    if (this.isDocumentationFile(path)) return 'documentation';
    if (['.md', '.rst', '.txt'].includes(extension)) return 'documentation';
    if (['.json', '.yaml', '.yml', '.xml', '.ini', '.cfg', '.conf'].includes(extension)) return 'config';
    if (['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.cs', '.php', '.rb', '.go', '.rs'].includes(extension)) return 'source';
    if (['.html', '.css', '.scss', '.sass', '.less'].includes(extension)) return 'frontend';
    if (['.sql'].includes(extension)) return 'database';
    if (['.sh', '.bash', '.ps1'].includes(extension)) return 'script';
    
    return 'other';
  }

  isTestFile(path) {
    const lowerPath = path.toLowerCase();
    return lowerPath.includes('test') || 
           lowerPath.includes('spec') || 
           lowerPath.includes('__tests__') ||
           lowerPath.includes('.test.') ||
           lowerPath.includes('.spec.');
  }

  isConfigFile(path) {
    const filename = path.split('/').pop().toLowerCase();
    const configFiles = [
      'package.json', 'package-lock.json', 'yarn.lock',
      'composer.json', 'requirements.txt', 'pipfile', 'poetry.lock',
      'dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
      'makefile', 'cmake', 'build.gradle', 'pom.xml',
      '.env', '.env.example', '.gitignore', '.gitattributes',
      'tsconfig.json', 'webpack.config.js', 'babel.config.js',
      '.eslintrc', '.prettierrc', 'jest.config.js'
    ];
    
    return configFiles.some(config => filename.includes(config.toLowerCase()));
  }

  isDocumentationFile(path) {
    const filename = path.split('/').pop().toLowerCase();
    return filename.includes('readme') || 
           filename.includes('changelog') || 
           filename.includes('contributing') ||
           filename.includes('license') ||
           path.toLowerCase().includes('docs/') ||
           path.toLowerCase().includes('documentation/');
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

  async fetchWiki(userId, repoId) {
    // Keep your existing wiki method unchanged
    const [owner, repo] = repoId.split('/');
    const wikiRepo = `${repo}.wiki`;
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
        repo: wikiRepo,
        ref: defaultBranch
      });
      console.log(`Wiki for '${defaultBranch}' branch downloaded for repository: ${repoId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching wiki for repository ${repoId}:`, error.message);
      throw error;
    }
  }
}

module.exports = GitGithubAdapter;