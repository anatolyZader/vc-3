'use strict';

const IDocsAiPort = require('../../domain/ports/IDocsAiPort');
const { promises: fs } = require('fs');
const path = require('path');
const { DirectoryLoader } = require('langchain/document_loaders/fs/directory');
const { TextLoader } = require('langchain/document_loaders/fs/text');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { PromptTemplate } = require('@langchain/core/prompts');
const { RunnableSequence } = require('@langchain/core/runnables');
const { StringOutputParser } = require('@langchain/core/output_parsers');

// Import extracted utility functions (matching AI module)
const RequestQueue = require('../../../ai/infrastructure/ai/requestQueue');
const LLMProviderManager = require('../../../ai/infrastructure/ai/providers/lLMProviderManager');

// Modern Pinecone service (matching AI module)
const PineconeService = require('../../../ai/infrastructure/ai/rag_pipelines/context/embedding/pineconeService');
const PineconePlugin = require('../../../ai/infrastructure/ai/rag_pipelines/context/embedding/pineconePlugin');
const { formatDocumentsAsString } = require('langchain/util/document');

class DocsLangchainAdapter extends IDocsAiPort {
  constructor({ aiProvider = 'openai' }) {
    super();

    // Make userId null by default to avoid DI error (matching AI module)
    this.userId = null;

    // Get provider from options
    this.aiProvider = aiProvider;
    console.log(`[${new Date().toISOString()}] DocsLangchainAdapter initializing with provider: ${this.aiProvider}`);

    // Get access to the event bus for status updates (matching AI module)
    try {
      const { eventBus } = require('../../../../eventDispatcher');
      this.eventBus = eventBus;
      console.log(`[${new Date().toISOString()}] 📡 Successfully connected to shared event bus`);
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ Could not access shared event bus: ${error.message}`);
      this.eventBus = null;
      console.log(`[${new Date().toISOString()}] [DEBUG] Event bus unavailable.`);
    }

    // Initialize request queue for rate limiting and queuing (matching AI module)
    this.requestQueue = new RequestQueue({
      maxRequestsPerMinute: 20,  // Conservative rate to avoid API limits
      retryDelay: 5000,          // 5 seconds between retries
      maxRetries: 3              // Reasonable retry count (15s max retry time)
    });

    // Keep direct access to pineconeLimiter for backward compatibility (matching AI module)
    this.pineconeLimiter = this.requestQueue.pineconeLimiter;

    try {
      // Initialize embeddings model: converts text to vectors (matching AI module)
      this.embeddings = new OpenAIEmbeddings({
        model: 'text-embedding-3-large',
        apiKey: process.env.OPENAI_API_KEY
      });
      console.log(`[${new Date().toISOString()}] [DEBUG] Embeddings model initialized.`);

      // Initialize chat model based on provider (matching AI module)
      this.llmProviderManager = new LLMProviderManager(this.aiProvider, {
        maxRetries: this.requestQueue.maxRetries
      });
      this.llm = this.llmProviderManager.getLLM();
      console.log(`[${new Date().toISOString()}] [DEBUG] LLM initialized.`);

      // Don't initialize vectorStore until we have a userId (matching AI module)
      this.vectorStore = null;
      console.log(`[${new Date().toISOString()}] [DEBUG] Vector store set to null (will be initialized after userId).`);

      // Initialize Pinecone service (matching AI module)
      if (process.env.PINECONE_API_KEY) {
        this.pineconePlugin = new PineconePlugin();
        this.pineconeService = new PineconeService({
          pineconePlugin: this.pineconePlugin,
          rateLimiter: this.pineconeLimiter
        });
        
        // Use wiki-specific index if available, fallback to main index
        this.pineconeIndexName = process.env.PINECONE_WIKI_INDEX_NAME || process.env.PINECONE_INDEX_NAME || 'eventstorm-index';
        console.log(`[${new Date().toISOString()}] 📊 DocsLangchainAdapter: Using Pinecone index: ${this.pineconeIndexName}`);
      } else {
        console.warn(`[${new Date().toISOString()}] No Pinecone API key found, vector search will be unavailable`);
        this.pineconeService = null;
        this.pineconePlugin = null;
      }

      console.log(`[${new Date().toISOString()}] DocsLangchainAdapter initialized successfully`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error initializing DocsLangchainAdapter:`, error.message);
      console.log(`[${new Date().toISOString()}] [DEBUG] Initialization error stack:`, error.stack);
      // We'll continue with degraded functionality and try to recover later
    }
  }

  // Add method to set userId after construction - this is crucial! (matching AI module)
  async setUserId(userId) {
    if (!userId) {
      console.warn(`[${new Date().toISOString()}] Attempted to set null/undefined userId in DocsLangchainAdapter`);
      return this;
    }
    console.log(`[${new Date().toISOString()}] [DEBUG] setUserId called with: ${userId}`);

    this.userId = userId;
    console.log(`[${new Date().toISOString()}] [DEBUG] userId set to: ${this.userId}`);

    try {
      // Initialize vector store directly - adapter owns the vector store lifecycle (matching AI module)
      if (process.env.PINECONE_API_KEY && this.pineconeService) {
        // Adapter owns and manages the vector store
        // Use repository-specific namespace format that matches actual document storage (exact match to AI module)
        const repositoryNamespace = `${this.userId}_anatolyzader_vc-3`;
        this.vectorStore = await this.pineconeService.createVectorStore(this.embeddings, repositoryNamespace);
        console.log(`[${new Date().toISOString()}] [DEBUG] Vector store created and owned by adapter for userId: ${this.userId} with namespace: ${repositoryNamespace}`);
      } else {
        console.warn(`[${new Date().toISOString()}] Missing Pinecone API key or service - vector store not initialized`);
        this.vectorStore = null;
      }
      
      console.log(`[${new Date().toISOString()}] DocsLangchainAdapter userId updated to: ${this.userId}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error creating vector store for user ${this.userId}:`, error.message);
      console.log(`[${new Date().toISOString()}] [DEBUG] Vector store creation error stack:`, error.stack);
      // Still set the userId even if vectorStore creation fails
    }

    return this;
  }

  initializeLLM() {
    try {
      switch (this.aiProvider.toLowerCase()) {
        case 'anthropic': {
          console.log('Initializing Anthropic provider for Docs');
          const { ChatAnthropic } = require('@langchain/anthropic');
          this.llm = new ChatAnthropic({ modelName: 'claude-3-haiku-20240307', temperature: 0, apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: this.maxRetries });
          break;
        }
        case 'google': {
          console.log('Initializing Google provider for Docs');
          const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
          this.llm = new ChatGoogleGenerativeAI({ modelName: 'gemini-pro', apiKey: process.env.GOOGLE_API_KEY, maxRetries: this.maxRetries });
          break;
        }
        case 'openai':
        default: {
          console.log('Initializing OpenAI provider for Docs');
          const { ChatOpenAI } = require('@langchain/openai');
          this.llm = new ChatOpenAI({ modelName: 'gpt-4o', temperature: 0, apiKey: process.env.OPENAI_API_KEY, maxRetries: this.maxRetries });
          break;
        }
      }
      console.log(`Successfully initialized LLM for provider: ${this.aiProvider}`);
    } catch (error) {
      console.error(`Error initializing LLM for provider ${this.aiProvider}:`, error);
      throw new Error(`Failed to initialize LLM provider ${this.aiProvider}: ${error.message}`);
    }
  }

  async updateDocsFiles(userId) {
    // Set userId first (matching AI module pattern)
    await this.setUserId(userId);
    
    // Use the modern request queue for rate limiting (matching AI module)
    return this.requestQueue.queueRequest(() => this.executeFileUpdate(userId));
  }

  async executeFileUpdate(userId) {
    console.log(`[${new Date().toISOString()}] DocsLangchainAdapter: executeFileUpdate started for user ${userId}`);
    this.emitRagStatus('start', { message: 'Starting docs file update process.', userId });
    
    // Validate Pinecone availability (matching AI module error handling)
    if (!this.pineconeService) {
      const errorMsg = 'Pinecone service not available - missing API key or initialization failed';
      console.error(`[${new Date().toISOString()}] ${errorMsg}`);
      this.emitRagStatus('error', { message: errorMsg, userId });
      return { success: false, message: errorMsg };
    }
    
    try {
  const businessModulesPath = path.resolve(__dirname, '../../../../business_modules');
  // Also determine repository root (one level above backend) to find root-level files like ARCHITECTURE.ms
  const repoRootPath = path.resolve(__dirname, '../../../../..');
      console.log(`[docsLangchainAdapter] Loading files from: ${businessModulesPath}`);

      const loader = new DirectoryLoader(
        businessModulesPath,
        {
          '.js': (filePath) => new TextLoader(filePath),
          '.md': (filePath) => new TextLoader(filePath),
        },
        true // recursive
      );

      let docs = await loader.load();
      console.log(`[docsLangchainAdapter] Loaded ${docs.length} documents from business_modules.`);

      // Attempt to include repository-root architecture.md file
      const archCandidates = ['ARCHITECTURE.md', 'architecture.md'];
      for (const candidate of archCandidates) {
        try {
          const archPath = path.join(repoRootPath, candidate);
          await fs.access(archPath);
          const archContent = await fs.readFile(archPath, 'utf8');
          // Create a langchain-style document object so the splitter can handle it
          docs.push({ pageContent: archContent, metadata: { source: archPath } });
          console.log(`[docsLangchainAdapter] Included repository architecture file for indexing: ${archPath} (${archContent.length} chars)`);
          this.emitRagStatus('included_architecture_file', { path: archPath, chars: archContent.length, userId });
          break; // include first match only
        } catch (err) {
          // Not found, keep trying other candidate names
        }
      }
      this.emitRagStatus('loaded', { message: `Loaded ${docs.length} documents.`, count: docs.length, userId });

  const splitter = this.createSmartSplitter(docs);

      const splits = await splitter.splitDocuments(docs);
      console.log(`[docsLangchainAdapter] Created ${splits.length} document splits.`);
      this.emitRagStatus('split', { message: `Created ${splits.length} document splits.`, count: splits.length, userId });

      // Use the modern PineconeService pattern (matching AI module)
      if (!this.vectorStore) {
        console.warn(`[${new Date().toISOString()}] Vector store not initialized, attempting to create with userId: ${userId}`);
        await this.setUserId(userId);
      }

      if (!this.vectorStore) {
        throw new Error('Failed to initialize vector store - Pinecone service unavailable');
      }

      // Use the userId-based vector store for consistent namespacing (matching AI module)
      const repositoryNamespace = `${userId}_anatolyzader_vc-3`;
      await this.pineconeService.upsertDocuments(splits, this.embeddings, {
        namespace: repositoryNamespace, // Use repository-specific namespace to match AI module
        batchSize: 100,
        onProgress: (processed, total) => {
          console.log(`[docsLangchainAdapter] Progress: ${processed}/${total} documents processed`);
        }
      });
      console.log('[docsLangchainAdapter] Pinecone store updated with new documents. Now generating module documentation...');
      this.emitRagStatus('indexed', { message: 'Pinecone store updated successfully.', userId });

      const moduleDirs = (await fs.readdir(businessModulesPath, { withFileTypes: true }))
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      // Generate documentation for business modules
      for (const moduleName of moduleDirs) {
        // Avoid trying to generate a doc for the 'reqs' directory if it's not a full module
        if (moduleName === 'reqs') continue;
        const modulePath = path.join(businessModulesPath, moduleName);
        this.emitRagStatus('generating_doc', { message: `Generating documentation for ${moduleName}...`, module: moduleName, userId });
        await this.generateDocForModule(moduleName, modulePath);
        this.emitRagStatus('generated_doc', { message: `Successfully generated documentation for ${moduleName}.`, module: moduleName, userId });
      }

      // Generate documentation for root files and plugins
      await this.generateRootFileDocumentation(userId);

      // Generate overall architecture documentation
      // NOTE: Architecture documentation is now manually maintained
      // await this.generateArchitectureDocumentation(userId);

      this.emitRagStatus('success', { message: 'Docs files updated, module documentation and root file documentation generated successfully.', userId });
      return { success: true, message: 'Docs files updated and all documentation generated successfully.' };
    } catch (error) {
      console.error('[docsLangchainAdapter] Error updating docs files:', error);
      this.emitRagStatus('error', { message: 'An error occurred during the docs update process.', error: error.message, userId });
      // Do not re-throw the error, as it will crash the process.
      // The error is logged and reported via RAG status.
    }
  }

  async generateDocForModule(moduleName, modulePath) {
    console.log(`[docsLangchainAdapter] Generating documentation for module: ${moduleName}`);
    
    // Monitor memory usage at the start
    const memUsage = process.memoryUsage();
    console.log(`[docsLangchainAdapter] Memory usage at start for ${moduleName}:`, {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
    });
    
    try {
        // Load ARCHITECTURE.md for context
        // Search for architecture.md file in backend root first, then repo root
        const backendRootPath = path.resolve(__dirname, '../../../../');
        const repoRootPath = path.resolve(__dirname, '../../../../..');
        let architectureContent = '';
        const archCandidates = ['ARCHITECTURE.md', 'architecture.md'];
        for (const basePath of [backendRootPath, repoRootPath]) {
          for (const candidate of archCandidates) {
            try {
              const architecturePath = path.join(basePath, candidate);
              await fs.access(architecturePath);
              architectureContent = await fs.readFile(architecturePath, 'utf8');
              console.log(`[docsLangchainAdapter] Loaded ${candidate} for context from ${basePath} (${architectureContent.length} chars)`);
              // stop searching once found
              break;
            } catch (error) {
              // continue searching
            }
          }
          if (architectureContent) break;
        }
        console.log(`[docsLangchainAdapter] Using vector store for module: ${moduleName}`);
        // Use the existing repository-specific vector store (matching AI module)
        const repositoryNamespace = `${this.userId}_anatolyzader_vc-3`;
        const vectorStore = this.vectorStore || await this.pineconeService.createVectorStore(this.embeddings, repositoryNamespace);
        console.log(`[docsLangchainAdapter] Vector store ready for module: ${moduleName}`);

        // Monitor memory before similarity search
        const memBeforeSearch = process.memoryUsage();
        console.log(`[docsLangchainAdapter] Memory before similarity search for ${moduleName}:`, {
          rss: `${Math.round(memBeforeSearch.rss / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memBeforeSearch.heapUsed / 1024 / 1024)}MB`
        });

        console.log(`[docsLangchainAdapter] Performing similarity search for module: ${moduleName}`);
        
        // Add timeout protection for similarity search
        const searchTimeoutMs = 45000; // 45 seconds timeout
        const searchPromise = vectorStore.similaritySearch(
            `High-level summary of the \"${moduleName}\" module's purpose, architecture, and key functionalities.`,
            20 // retrieve more docs to have a higher chance of getting module-specific ones
        );
        
        const searchTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Similarity search timeout for module ${moduleName}`)), searchTimeoutMs);
        });
        
        const searchResults = await Promise.race([searchPromise, searchTimeoutPromise]);
        console.log(`[docsLangchainAdapter] Similarity search completed for module: ${moduleName}. Results count: ${searchResults.length}`);

        console.log(`[docsLangchainAdapter] Filtering relevant documents for module: ${moduleName}`);
        const relevantDocs = searchResults.filter(doc => 
            doc.metadata.source && doc.metadata.source.startsWith(modulePath)
        );
        console.log(`[docsLangchainAdapter] Relevant documents filtered for module: ${moduleName}. Count: ${relevantDocs.length}`);

        if (relevantDocs.length === 0) {
            console.warn(`[docsLangchainAdapter] No relevant documents found for module \"${moduleName}\" after filtering. Skipping documentation generation.`);
            return;
        }

        console.log(`[docsLangchainAdapter] Retrieved and filtered ${relevantDocs.length} relevant documents for module \"${moduleName}\".`);

        // Monitor memory before LLM processing
        const memBeforeLLM = process.memoryUsage();
        console.log(`[docsLangchainAdapter] Memory before LLM processing for ${moduleName}:`, {
          rss: `${Math.round(memBeforeLLM.rss / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memBeforeLLM.heapUsed / 1024 / 1024)}MB`
        });

        console.log(`[docsLangchainAdapter] Creating prompt for LLM for module: ${moduleName}`);
        const template = `
            You are an expert software engineer tasked with creating documentation.
            Based on the following code context from files within the \"{moduleName}\" module, please generate a concise, high-level summary of the module's purpose, architecture, and key functionalities.
            The summary should be in Markdown format, suitable for a README.md file.

            ARCHITECTURE CONTEXT (for consistency):
            ---
            {architectureContext}
            ---

            CODE CONTEXT:
            ---
            {context}
            ---

            Based on the context and architecture reference, generate the Markdown summary for the \"{moduleName}\" module.
            Ensure the documentation is consistent with the overall system architecture described above.
            `;
        const prompt = new PromptTemplate({
            template,
            inputVariables: ["context", "moduleName", "architectureContext"],
        });

        console.log(`[docsLangchainAdapter] Invoking LLM chain for module: ${moduleName}`);
        
        // Add timeout and error handling for LLM invocation
        const timeoutMs = 60000; // 60 seconds timeout
        const llmPromise = (async () => {
            const chain = RunnableSequence.from([
                {
                    context: () => formatDocumentsAsString(relevantDocs),
                    moduleName: () => moduleName,
                    architectureContext: () => architectureContent.substring(0, 3000), // Limit to prevent token overflow
                },
                prompt,
                this.llm,
                new StringOutputParser(),
            ]);
            return await chain.invoke();
        })();

        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`LLM invocation timeout for module ${moduleName}`)), timeoutMs);
        });

        const llmResponse = await Promise.race([llmPromise, timeoutPromise]);
        console.log(`[docsLangchainAdapter] LLM generated documentation for module: ${moduleName}`);

        // Monitor memory after LLM processing
        const memAfterLLM = process.memoryUsage();
        console.log(`[docsLangchainAdapter] Memory after LLM processing for ${moduleName}:`, {
          rss: `${Math.round(memAfterLLM.rss / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memAfterLLM.heapUsed / 1024 / 1024)}MB`
        });

        console.log(`[docsLangchainAdapter] Writing documentation to file for module: ${moduleName}`);
        const outputPath = path.join(modulePath, `${moduleName}.md`);
        await fs.writeFile(outputPath, llmResponse);
        console.log(`[docsLangchainAdapter] Successfully wrote documentation to ${outputPath}`);

        // Monitor final memory usage
        const memAtEnd = process.memoryUsage();
        console.log(`[docsLangchainAdapter] Memory at end for ${moduleName}:`, {
          rss: `${Math.round(memAtEnd.rss / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memAtEnd.heapUsed / 1024 / 1024)}MB`
        });

        // Force garbage collection if available (requires --expose-gc flag)
        if (global.gc) {
            console.log(`[docsLangchainAdapter] Running garbage collection after ${moduleName}`);
            global.gc();
        }

    } catch (error) {
        console.error(`[docsLangchainAdapter] Error generating documentation for module ${moduleName}:`, error);
        console.error(`[docsLangchainAdapter] Module Path: ${modulePath}`);
        console.error(`[docsLangchainAdapter] Error Stack: ${error.stack}`);
        
        // Log memory usage at error
        const memAtError = process.memoryUsage();
        console.error(`[docsLangchainAdapter] Memory at error for ${moduleName}:`, {
          rss: `${Math.round(memAtError.rss / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memAtError.heapUsed / 1024 / 1024)}MB`
        });
        
        // Do not rethrow, so one module failing doesn't stop others.
    }
  }

  async generateRootFileDocumentation(userId) {
    console.log(`[docsLangchainAdapter] Generating consolidated documentation for root files and plugins`);
    
    try {
      const backendRootPath = path.resolve(__dirname, '../../../../');
      console.log(`[docsLangchainAdapter] Backend root path: ${backendRootPath}`);

      // Use the existing repository-specific vector store (matching AI module)
      const repositoryNamespace = `${this.userId}_anatolyzader_vc-3`;
      const vectorStore = this.vectorStore || await this.pineconeService.createVectorStore(this.embeddings, repositoryNamespace);

      // Define root files to document
      const rootFiles = [
        { file: 'app.js', description: 'Main application entry point' },
        { file: 'server.js', description: 'Fastify server configuration and startup' },
        { file: 'fastify.config.js', description: 'Fastify server configuration' }
      ];

      // Find all plugin files
      const allFiles = await fs.readdir(backendRootPath);
      const pluginFiles = allFiles
        .filter(file => file.endsWith('Plugin.js'))
        .map(file => ({ 
          file, 
          description: `${file.replace('Plugin.js', '')} plugin configuration and functionality`
        }));

      // Combine root files and plugin files
      const filesToDocument = [...rootFiles, ...pluginFiles];

      console.log(`[docsLangchainAdapter] Found ${filesToDocument.length} root files to document:`, 
        filesToDocument.map(f => f.file));

      // Collect all file contents and context
      const fileContents = [];
      
      this.emitRagStatus('generating_root_doc', { 
        message: `Generating consolidated documentation for ${filesToDocument.length} root files and plugins...`, 
        userId 
      });

      for (const { file, description } of filesToDocument) {
        const filePath = path.join(backendRootPath, file);
        
        // Check if file exists
        try {
          await fs.access(filePath);
          const content = await fs.readFile(filePath, 'utf8');
          fileContents.push({
            file,
            description,
            content: content.substring(0, 6000), // Limit content to prevent token overflow
            filePath
          });
          console.log(`[docsLangchainAdapter] Collected content for ${file}: ${content.length} characters`);
        } catch (error) {
          console.warn(`[docsLangchainAdapter] File ${file} not found, skipping...`);
          continue;
        }
      }

      // Generate consolidated documentation
      await this.generateConsolidatedRootDocumentation(fileContents, vectorStore, backendRootPath);

      this.emitRagStatus('generated_root_doc', { 
        message: `Successfully generated consolidated root documentation covering ${fileContents.length} files.`, 
        userId 
      });

      console.log(`[docsLangchainAdapter] Completed consolidated root files documentation generation`);

    } catch (error) {
      console.error(`[docsLangchainAdapter] Error generating root file documentation:`, error);
      console.error(`[docsLangchainAdapter] Error Stack: ${error.stack}`);
      
      this.emitRagStatus('root_doc_error', { 
        message: 'Error generating root file documentation', 
        error: error.message, 
        userId 
      });
    }
  }

  async generateConsolidatedRootDocumentation(fileContents, vectorStore, backendRootPath) {
    console.log(`[docsLangchainAdapter] Generating consolidated documentation for ${fileContents.length} root files`);
    
    // Load ARCHITECTURE.md for context
    let architectureContent = '';
    try {
      const architecturePath = path.join(backendRootPath, 'ARCHITECTURE.md');
      architectureContent = await fs.readFile(architecturePath, 'utf8');
      console.log(`[docsLangchainAdapter] Loaded ARCHITECTURE.md for context (${architectureContent.length} chars)`);
    } catch (error) {
      console.log(`[docsLangchainAdapter] Could not load ARCHITECTURE.md: ${error.message}`);
    }
    
    // Monitor memory usage
    const memUsage = process.memoryUsage();
    console.log(`[docsLangchainAdapter] Memory usage at start for consolidated root docs:`, {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`
    });
    
    try {
      // Perform similarity search for related context
      console.log(`[docsLangchainAdapter] Performing similarity search for root files and plugins`);
      
      const searchTimeoutMs = 45000; // 45 seconds timeout
      const searchQuery = `backend application configuration setup plugins fastify server startup environment`;
      const searchPromise = vectorStore.similaritySearch(searchQuery, 20);
      
      const searchTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Similarity search timeout for root documentation`)), searchTimeoutMs);
      });
      
      const searchResults = await Promise.race([searchPromise, searchTimeoutPromise]);
      console.log(`[docsLangchainAdapter] Similarity search completed for root docs. Results count: ${searchResults.length}`);

      // Filter for relevant context (exclude root files to avoid circular references)
      const relevantDocs = searchResults.filter(doc => 
        doc.metadata.source && 
        !fileContents.some(fc => doc.metadata.source.includes(fc.file))
      );
      console.log(`[docsLangchainAdapter] Filtered relevant documents for root docs. Count: ${relevantDocs.length}`);

      // Create context from similar documents
      const contextDocs = relevantDocs.slice(0, 8); // Limit to top 8 for context
      const context = contextDocs.length > 0 
        ? contextDocs.map(doc => `Source: ${doc.metadata.source}\n${doc.pageContent}`).join('\n\n---\n\n')
        : 'No related context found in the codebase.';

      // Prepare file contents for the prompt
      const filesDescription = fileContents.map(fc => `
## ${fc.file}
**Description**: ${fc.description}

\`\`\`javascript
${fc.content}
\`\`\`
`).join('\n');

      // Generate consolidated documentation using LLM
      console.log(`[docsLangchainAdapter] Creating prompt for consolidated root documentation`);
      const template = `
You are an expert software engineer tasked with creating comprehensive documentation for the backend application's root files and plugins.

ARCHITECTURE CONTEXT (for consistency):
---
{architectureContext}
---

You need to document the following files as a single consolidated documentation:

{filesDescription}

RELATED CODEBASE CONTEXT:
{context}

Please generate a comprehensive Markdown documentation that covers all these files in a single document. 
Ensure consistency with the overall system architecture described above.

Structure it as follows:

# Backend Application - Root Files & Plugins Documentation

## Overview
Brief overview of the backend application architecture and how these root files and plugins work together.

## Core Application Files

### app.js
- Purpose and role
- Key configurations
- How it initializes the application

### server.js  
- Purpose and role
- Server startup process
- Key configurations

### fastify.config.js
- Purpose and role
- Configuration options
- Integration with the application

## Plugins Architecture

### Plugin System Overview
Brief explanation of how the plugin system works in this application.

### Individual Plugins
For each plugin file, provide:
- **Purpose**: What the plugin does
- **Key Features**: Main functionality
- **Configuration**: Important settings or dependencies
- **Integration**: How it integrates with the application

## Application Lifecycle
Explain how these components work together during application startup and runtime.

## Development Notes
- Important considerations for developers
- Configuration requirements
- Best practices

Generate comprehensive, well-structured documentation that helps developers understand the backend application's root architecture and plugin system.
      `;

      const prompt = new PromptTemplate({
        template,
        inputVariables: ["filesDescription", "context", "architectureContext"],
      });

      console.log(`[docsLangchainAdapter] Invoking LLM chain for consolidated root documentation`);
      
      // Add timeout protection for LLM invocation
      const timeoutMs = 120000; // 120 seconds timeout (longer for consolidated documentation)
      const llmPromise = (async () => {
        const chain = RunnableSequence.from([
          {
            filesDescription: () => filesDescription.substring(0, 15000), // Limit content to prevent token overflow
            context: () => context.substring(0, 5000), // Limit context to prevent token overflow
            architectureContext: () => architectureContent.substring(0, 3000), // Limit architecture context
          },
          prompt,
          this.llm,
          new StringOutputParser(),
        ]);
        return await chain.invoke();
      })();

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`LLM invocation timeout for consolidated root documentation`)), timeoutMs);
      });

      const llmResponse = await Promise.race([llmPromise, timeoutPromise]);
      console.log(`[docsLangchainAdapter] LLM generated consolidated root documentation`);

      // Write consolidated documentation to root folder
      const outputPath = path.join(backendRootPath, 'ROOT_DOCUMENTATION.md');
      await fs.writeFile(outputPath, llmResponse);
      console.log(`[docsLangchainAdapter] Successfully wrote consolidated documentation to ${outputPath}`);

      // Monitor final memory usage
      const memAtEnd = process.memoryUsage();
      console.log(`[docsLangchainAdapter] Memory at end for consolidated root docs:`, {
        rss: `${Math.round(memAtEnd.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memAtEnd.heapUsed / 1024 / 1024)}MB`
      });

      // Force garbage collection if available
      if (global.gc) {
        console.log(`[docsLangchainAdapter] Running garbage collection after consolidated root docs`);
        global.gc();
      }

    } catch (error) {
      console.error(`[docsLangchainAdapter] Error generating consolidated root documentation:`, error);
      console.error(`[docsLangchainAdapter] Error Stack: ${error.stack}`);
      
      // Log memory usage at error
      const memAtError = process.memoryUsage();
      console.error(`[docsLangchainAdapter] Memory at error for consolidated root docs:`, {
        rss: `${Math.round(memAtError.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memAtError.heapUsed / 1024 / 1024)}MB`
      });
      
      throw error; // Re-throw to be handled by caller
    }
  }

  async generateArchitectureDocumentation(userId, existingArchitectureContent = null) {
    const isUpdating = existingArchitectureContent && existingArchitectureContent.trim().length > 0;
    console.log(`[docsLangchainAdapter] ${isUpdating ? 'Updating' : 'Generating'} overall architecture documentation`);
    
    try {
      const backendRootPath = path.resolve(__dirname, '../../../../');
      
      // Initialize Pinecone components with repository-specific namespace
      const repositoryNamespace = `${userId}_anatolyzader_vc-3`;
      const vectorStore = await this.pineconeService.createVectorStore(this.embeddings, repositoryNamespace);

      this.emitRagStatus('generating_architecture_doc', { 
        message: `${isUpdating ? 'Updating' : 'Generating'} overall application architecture documentation...`, 
        userId 
      });

      // Perform comprehensive similarity search to get context from all parts of the application
      console.log(`[docsLangchainAdapter] Performing comprehensive similarity search for architecture documentation`);
      const searchResults = await vectorStore.similaritySearch(
        "Application architecture, business modules, domain structure, ports adapters, services controllers, infrastructure setup, main functionalities, overall system design",
        30 // Get more context for comprehensive architecture overview
      );
      console.log(`[docsLangchainAdapter] Similarity search completed for architecture docs. Results count: ${searchResults.length}`);

      // Get a diverse set of documents from different parts of the system
      const businessModuleDocs = searchResults.filter(doc => 
        doc.metadata.source && doc.metadata.source.includes('business_modules/')
      ).slice(0, 10);
      
      const aopModuleDocs = searchResults.filter(doc => 
        doc.metadata.source && doc.metadata.source.includes('aop_modules/')
      ).slice(0, 5);
      
      const rootDocs = searchResults.filter(doc => 
        doc.metadata.source && 
        doc.metadata.source.includes('backend/') && 
        !doc.metadata.source.includes('business_modules/') &&
        !doc.metadata.source.includes('aop_modules/')
      ).slice(0, 8);

      const clientDocs = searchResults.filter(doc => 
        doc.metadata.source && doc.metadata.source.includes('client/')
      ).slice(0, 5);

      // Read key configuration files for additional context
      const configFiles = ['package.json', 'infraConfig.json'];
      const configContents = [];
      
      for (const configFile of configFiles) {
        try {
          const configPath = path.join(backendRootPath, configFile);
          const content = await fs.readFile(configPath, 'utf8');
          configContents.push({
            filename: configFile,
            content: content
          });
          console.log(`[docsLangchainAdapter] Loaded configuration file: ${configFile}`);
        } catch (err) {
          console.log(`[docsLangchainAdapter] Could not load config file ${configFile}: ${err.message}`);
        }
      }

      // Combine all contexts
      const allRelevantDocs = [...businessModuleDocs, ...aopModuleDocs, ...rootDocs, ...clientDocs];
      const searchContext = formatDocumentsAsString(allRelevantDocs);
      
      const configContext = configContents.map(({ filename, content }) => 
        `=== ${filename} ===\n${content.substring(0, 1500)}${content.length > 1500 ? '...' : ''}`
      ).join('\n\n');

      console.log(`[docsLangchainAdapter] Creating prompt for architecture documentation`);
      
      const template = isUpdating ? `
You are a senior software architect tasked with updating existing architecture documentation for a modern Node.js application.

EXISTING ARCHITECTURE.MD CONTENT:
---
{existingContent}
---

Based on the current codebase context and configuration below, update the existing architecture documentation to ensure it accurately reflects the current state of the system.

Preserve the existing structure and content where still accurate, but:
- Update any outdated information
- Add new sections for components that have been added
- Remove or update sections for components that have changed
- Ensure all technical details are current and accurate
- Maintain the professional tone and comprehensive coverage

CURRENT CODEBASE CONTEXT:
---
{searchContext}
---

CURRENT CONFIGURATION CONTEXT:
---
{configContext}
---

Return the updated ARCHITECTURE.md content as a comprehensive, well-structured Markdown document.
` : `
You are a senior software architect tasked with creating comprehensive architecture documentation for a modern Node.js application.

Based on the following codebase context and configuration, create a detailed ARCHITECTURE.md file that explains:

1. **Application Overview**: Purpose, main functionalities, and target use cases
2. **Architecture Patterns**: Hexagonal architecture, domain-driven design, modular structure
3. **System Structure**: 
   - Business modules vs AOP modules
   - Domain, application, infrastructure layers
   - Ports and adapters pattern
4. **Key Components**:
   - Authentication and authorization
   - Chat functionality with AI integration
   - Git analysis and docs generation
   - API structure and documentation
   - Real-time communication (WebSocket)
5. **Technology Stack**: Framework choices, databases, external services
6. **Data Flow**: How requests flow through the system
7. **Integration Points**: External APIs, AI services, databases
8. **Development Practices**: Module organization, dependency injection, testing approach

CODEBASE CONTEXT:
---
{searchContext}
---

CONFIGURATION CONTEXT:
---
{configContext}
---

Create a comprehensive, well-structured Markdown document that serves as the definitive guide to understanding this application's architecture. 
Include diagrams in text format where helpful, and explain the reasoning behind architectural decisions.
Focus on both the technical implementation and the business value delivered by each component.
`;

      const inputVariables = isUpdating ? 
        ["existingContent", "searchContext", "configContext"] : 
        ["searchContext", "configContext"];

      const prompt = new PromptTemplate({
        template,
        inputVariables,
      });

      console.log(`[docsLangchainAdapter] Invoking LLM chain for architecture documentation`);
      
      // Add timeout protection for comprehensive documentation
      const timeoutMs = 120000; // 2 minutes for comprehensive architecture documentation
      const llmPromise = (async () => {
        const chainInput = isUpdating ? {
          existingContent: () => existingArchitectureContent,
          searchContext: () => searchContext,
          configContext: () => configContext,
        } : {
          searchContext: () => searchContext,
          configContext: () => configContext,
        };
        
        const chain = RunnableSequence.from([
          chainInput,
          prompt,
          this.llm,
          new StringOutputParser(),
        ]);
        return await chain.invoke();
      })();

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('LLM invocation timeout for architecture documentation')), timeoutMs);
      });

      const llmResponse = await Promise.race([llmPromise, timeoutPromise]);
      console.log(`[docsLangchainAdapter] LLM ${isUpdating ? 'updated' : 'generated'} architecture documentation`);

      // Write to ARCHITECTURE.md
      const outputPath = path.join(backendRootPath, 'ARCHITECTURE.md');
      await fs.writeFile(outputPath, llmResponse);
      console.log(`[docsLangchainAdapter] Successfully ${isUpdating ? 'updated' : 'wrote'} architecture documentation to ${outputPath}`);

      this.emitRagStatus('generated_architecture_doc', { 
        message: `Successfully ${isUpdating ? 'updated' : 'generated'} overall architecture documentation.`, 
        userId 
      });

    } catch (error) {
      console.error(`[docsLangchainAdapter] Error generating architecture documentation:`, error);
      this.emitRagStatus('architecture_doc_error', { 
        message: 'Error generating architecture documentation.', 
        error: error.message, 
        userId 
      });
      // Don't throw to avoid stopping other documentation generation
    }
  }

  createSmartSplitter(documents) {
    const chunkSize = 1500;
    const chunkOverlap = 250;
    const languageCount = {};
    documents.forEach(doc => {
      const src = doc.metadata.source || '';
      const extension = src.includes('.') ? src.split('.').pop().toLowerCase() : '';
      if (['js', 'jsx', 'ts', 'tsx'].includes(extension)) languageCount.javascript = (languageCount.javascript || 0) + 1;
    });
    const predominantLanguage = Object.keys(languageCount).length > 0 ? 'javascript' : 'text';
    console.log(`Using ${predominantLanguage} code splitter for document processing.`);
    if (predominantLanguage === 'javascript') {
        return RecursiveCharacterTextSplitter.fromLanguage("js", { chunkSize, chunkOverlap });
    }
    return new RecursiveCharacterTextSplitter({ chunkSize, chunkOverlap });
  }

  /**
   * Emit RAG status events for monitoring (matching AI module)
   */
  emitRagStatus(status, details = {}) {
    // Always log the status update
    console.log(`[${new Date().toISOString()}] 🔍 RAG STATUS: ${status}`, 
      Object.keys(details).length > 0 ? JSON.stringify(details, null, 2) : '');
    
    // Try to emit to the event bus if available
    try {
      // First try the instance event bus
      if (this.eventBus) {
        this.eventBus.emit('ragStatusUpdate', {
          component: 'docsLangchainAdapter',
          timestamp: new Date().toISOString(),
          status,
          ...details
        });
        return;
      }
      
      // Fallback to imported event bus if instance one isn't available
      const eventDispatcherPath = '../../../../eventDispatcher';
      const { eventBus } = require(eventDispatcherPath);
      if (eventBus) {
        eventBus.emit('ragStatusUpdate', {
          component: 'docsLangchainAdapter',
          timestamp: new Date().toISOString(),
          status,
          ...details
        });
      }
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ Failed to emit RAG status update: ${error.message}`);
    }
  }
}

module.exports = DocsLangchainAdapter;
