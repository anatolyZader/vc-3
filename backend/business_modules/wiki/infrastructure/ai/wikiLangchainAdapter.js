'use strict';

const IWikiAiPort = require('../../domain/ports/IWikiAiPort');
const { promises: fs } = require('fs');
const path = require('path');
const { DirectoryLoader } = require('langchain/document_loaders/fs/directory');
const { TextLoader } = require('langchain/document_loaders/fs/text');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { PineconeStore } = require('@langchain/pinecone');
const { Pinecone } = require('@pinecone-database/pinecone');
const { PromptTemplate } = require('@langchain/core/prompts');
const { RunnableSequence } = require('@langchain/core/runnables');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { formatDocumentsAsString } = require('langchain/util/document');
const Bottleneck = require("bottleneck");

class WikiLangchainAdapter extends IWikiAiPort {
  constructor({ aiProvider = 'openai' }) {
    super();
    this.aiProvider = aiProvider;

    // Event Dispatcher
    try {
      const { eventBus } = require('../../../../eventDispatcher');
      this.eventBus = eventBus;
      console.log('📡 WikiLangchainAdapter: Successfully connected to shared event bus');
    } catch (error) {
      console.warn(`⚠️ WikiLangchainAdapter: Could not access shared event bus: ${error.message}`);
      this.eventBus = null;
    }

    // Rate limiting and queueing
    this.requestsInLastMinute = 0;
    this.lastRequestTime = Date.now();
    this.maxRequestsPerMinute = 60;
    this.retryDelay = 5000;
    this.maxRetries = 5;
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.startQueueProcessor();

    // Initialize embeddings model
    this.embeddings = new OpenAIEmbeddings({
      model: 'text-embedding-3-large',
      apiKey: process.env.OPENAI_API_KEY
    });

    // Initialize Pinecone client
    if (process.env.PINECONE_API_KEY) {
      this.pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY
      });
      this.pineconeIndexName = 'eventstorm-wiki';
    } else {
      console.warn('No Pinecone API key found, vector search will be unavailable');
      this.pinecone = null;
    }

    // Initialize chat model
    this.initializeLLM();

    // Bottleneck rate limiter for Pinecone upserts
    this.pineconeLimiter = new Bottleneck({
      reservoir: 100,
      reservoirRefreshAmount: 100,
      reservoirRefreshInterval: 1000,
      maxConcurrent: 5,
    });
  }

  initializeLLM() {
    try {
      switch (this.aiProvider.toLowerCase()) {
        case 'anthropic': {
          console.log('Initializing Anthropic provider for Wiki');
          const { ChatAnthropic } = require('@langchain/anthropic');
          this.llm = new ChatAnthropic({ modelName: 'claude-3-haiku-20240307', temperature: 0, apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: this.maxRetries });
          break;
        }
        case 'google': {
          console.log('Initializing Google provider for Wiki');
          const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
          this.llm = new ChatGoogleGenerativeAI({ modelName: 'gemini-pro', apiKey: process.env.GOOGLE_API_KEY, maxRetries: this.maxRetries });
          break;
        }
        case 'openai':
        default: {
          console.log('Initializing OpenAI provider for Wiki');
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

  async updateWikiFiles(userId) {
    return this.queueRequest(() => this._executeFileUpdate(userId));
  }

  async _executeFileUpdate(userId) {
    console.log('[wikiLangchainAdapter] _executeFileUpdate started.');
    this.emitRagStatus('start', { message: 'Starting wiki file update process.', userId });
    try {
      const businessModulesPath = path.resolve(__dirname, '../../../../business_modules');
      console.log(`[wikiLangchainAdapter] Loading files from: ${businessModulesPath}`);

      const loader = new DirectoryLoader(
        businessModulesPath,
        {
          '.js': (filePath) => new TextLoader(filePath),
          '.md': (filePath) => new TextLoader(filePath),
        },
        true // recursive
      );

      const docs = await loader.load();
      console.log(`[wikiLangchainAdapter] Loaded ${docs.length} documents.`);
      this.emitRagStatus('loaded', { message: `Loaded ${docs.length} documents.`, count: docs.length, userId });

      const splitter = this.createSmartSplitter(docs);

      const splits = await splitter.splitDocuments(docs);
      console.log(`[wikiLangchainAdapter] Created ${splits.length} document splits.`);
      this.emitRagStatus('split', { message: `Created ${splits.length} document splits.`, count: splits.length, userId });

      const pinecone = new Pinecone();
      const indexName = 'eventstorm-wiki';
      const pineconeIndex = pinecone.index(indexName);
      console.log('[wikiLangchainAdapter] Pinecone index retrieved.');

      try {
        await pinecone.describeIndex(indexName);
        console.log(`[wikiLangchainAdapter] Pinecone index '${indexName}' already exists.`);
      } catch (error) {
        // Assuming the error is because the index doesn't exist
        if (error.name === 'PineconeNotFoundError') {
          console.log(`[wikiLangchainAdapter] Pinecone index '${indexName}' not found. Creating it...`);
          await pinecone.createIndex({
            name: indexName,
            dimension: 3072, // Dimension for text-embedding-3-large
            metric: 'cosine',
            spec: { 
              serverless: { 
                cloud: 'aws', 
                region: 'us-east-1' 
              } 
            } 
          });
          console.log(`[wikiLangchainAdapter] Pinecone index '${indexName}' created. Waiting for it to be ready...`);
          // Wait for a moment for the index to be ready
          await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
        } else {
          throw error; // Re-throw other errors
        }
      }

      await PineconeStore.fromDocuments(splits, this.embeddings, {
        pineconeIndex,
        maxConcurrency: 5,
      });
      console.log('[wikiLangchainAdapter] Pinecone store updated with new documents. Now generating module documentation...');
      this.emitRagStatus('indexed', { message: 'Pinecone store updated successfully.', userId });

      const moduleDirs = (await fs.readdir(businessModulesPath, { withFileTypes: true }))
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const moduleName of moduleDirs) {
        // Avoid trying to generate a doc for the 'reqs' directory if it's not a full module
        if (moduleName === 'reqs') continue;
        const modulePath = path.join(businessModulesPath, moduleName);
        this.emitRagStatus('generating_doc', { message: `Generating documentation for ${moduleName}...`, module: moduleName, userId });
        await this._generateDocForModule(moduleName, modulePath);
        this.emitRagStatus('generated_doc', { message: `Successfully generated documentation for ${moduleName}.`, module: moduleName, userId });
      }

      this.emitRagStatus('success', { message: 'Wiki files updated and module documentation generated successfully.', userId });
      return { success: true, message: 'Wiki files updated and module documentation generated successfully.' };
    } catch (error) {
      console.error('[wikiLangchainAdapter] Error updating wiki files:', error);
      this.emitRagStatus('error', { message: 'An error occurred during the wiki update process.', error: error.message, userId });
      // Do not re-throw the error, as it will crash the process.
      // The error is logged and reported via RAG status.
    }
  }

  async _generateDocForModule(moduleName, modulePath) {
    console.log(`[wikiLangchainAdapter] Generating documentation for module: ${moduleName}`);
    
    // Monitor memory usage at the start
    const memUsage = process.memoryUsage();
    console.log(`[wikiLangchainAdapter] Memory usage at start for ${moduleName}:`, {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
    });
    
    try {
        console.log(`[wikiLangchainAdapter] Initializing Pinecone index for module: ${moduleName}`);
        const pineconeIndex = this.pinecone.index(this.pineconeIndexName);
        console.log(`[wikiLangchainAdapter] Pinecone index initialized: ${this.pineconeIndexName}`);

        const vectorStore = await PineconeStore.fromExistingIndex(this.embeddings, { pineconeIndex });
        console.log(`[wikiLangchainAdapter] Vector store created for module: ${moduleName}`);

        // Monitor memory before similarity search
        const memBeforeSearch = process.memoryUsage();
        console.log(`[wikiLangchainAdapter] Memory before similarity search for ${moduleName}:`, {
          rss: `${Math.round(memBeforeSearch.rss / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memBeforeSearch.heapUsed / 1024 / 1024)}MB`
        });

        console.log(`[wikiLangchainAdapter] Performing similarity search for module: ${moduleName}`);
        
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
        console.log(`[wikiLangchainAdapter] Similarity search completed for module: ${moduleName}. Results count: ${searchResults.length}`);

        console.log(`[wikiLangchainAdapter] Filtering relevant documents for module: ${moduleName}`);
        const relevantDocs = searchResults.filter(doc => 
            doc.metadata.source && doc.metadata.source.startsWith(modulePath)
        );
        console.log(`[wikiLangchainAdapter] Relevant documents filtered for module: ${moduleName}. Count: ${relevantDocs.length}`);

        if (relevantDocs.length === 0) {
            console.warn(`[wikiLangchainAdapter] No relevant documents found for module \"${moduleName}\" after filtering. Skipping documentation generation.`);
            return;
        }

        console.log(`[wikiLangchainAdapter] Retrieved and filtered ${relevantDocs.length} relevant documents for module \"${moduleName}\".`);

        // Monitor memory before LLM processing
        const memBeforeLLM = process.memoryUsage();
        console.log(`[wikiLangchainAdapter] Memory before LLM processing for ${moduleName}:`, {
          rss: `${Math.round(memBeforeLLM.rss / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memBeforeLLM.heapUsed / 1024 / 1024)}MB`
        });

        console.log(`[wikiLangchainAdapter] Creating prompt for LLM for module: ${moduleName}`);
        const template = `
            You are an expert software engineer tasked with creating documentation.
            Based on the following code context from files within the \"{moduleName}\" module, please generate a concise, high-level summary of the module's purpose, architecture, and key functionalities.
            The summary should be in Markdown format, suitable for a README.md file.

            CONTEXT:
            ---
            {context}
            ---

            Based on the context, generate the Markdown summary for the \"{moduleName}\" module.
            `;
        const prompt = new PromptTemplate({
            template,
            inputVariables: ["context", "moduleName"],
        });

        console.log(`[wikiLangchainAdapter] Invoking LLM chain for module: ${moduleName}`);
        
        // Add timeout and error handling for LLM invocation
        const timeoutMs = 60000; // 60 seconds timeout
        const llmPromise = (async () => {
            const chain = RunnableSequence.from([
                {
                    context: () => formatDocumentsAsString(relevantDocs),
                    moduleName: () => moduleName,
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
        console.log(`[wikiLangchainAdapter] LLM generated documentation for module: ${moduleName}`);

        // Monitor memory after LLM processing
        const memAfterLLM = process.memoryUsage();
        console.log(`[wikiLangchainAdapter] Memory after LLM processing for ${moduleName}:`, {
          rss: `${Math.round(memAfterLLM.rss / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memAfterLLM.heapUsed / 1024 / 1024)}MB`
        });

        console.log(`[wikiLangchainAdapter] Writing documentation to file for module: ${moduleName}`);
        const outputPath = path.join(modulePath, `${moduleName}.md`);
        await fs.writeFile(outputPath, llmResponse);
        console.log(`[wikiLangchainAdapter] Successfully wrote documentation to ${outputPath}`);

        // Monitor final memory usage
        const memAtEnd = process.memoryUsage();
        console.log(`[wikiLangchainAdapter] Memory at end for ${moduleName}:`, {
          rss: `${Math.round(memAtEnd.rss / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memAtEnd.heapUsed / 1024 / 1024)}MB`
        });

        // Force garbage collection if available (requires --expose-gc flag)
        if (global.gc) {
            console.log(`[wikiLangchainAdapter] Running garbage collection after ${moduleName}`);
            global.gc();
        }

    } catch (error) {
        console.error(`[wikiLangchainAdapter] Error generating documentation for module ${moduleName}:`, error);
        console.error(`[wikiLangchainAdapter] Module Path: ${modulePath}`);
        console.error(`[wikiLangchainAdapter] Error Stack: ${error.stack}`);
        
        // Log memory usage at error
        const memAtError = process.memoryUsage();
        console.error(`[wikiLangchainAdapter] Memory at error for ${moduleName}:`, {
          rss: `${Math.round(memAtError.rss / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memAtError.heapUsed / 1024 / 1024)}MB`
        });
        
        // Do not rethrow, so one module failing doesn't stop others.
    }
  }

  createSmartSplitter(documents) {
    const chunkSize = 1500;
    const chunkOverlap = 250;
    const languageCount = {};
    documents.forEach(doc => {
      const extension = (doc.metadata.source || '').split('.').pop().toLowerCase();
      if (['js', 'jsx', 'ts', 'tsx'].includes(extension)) languageCount.javascript = (languageCount.javascript || 0) + 1;
    });
    const predominantLanguage = Object.keys(languageCount).length > 0 ? 'javascript' : 'text';
    console.log(`Using {predominantLanguage} code splitter for document processing.`);
    if (predominantLanguage === 'javascript') {
        return RecursiveCharacterTextSplitter.fromLanguage("js", { chunkSize, chunkOverlap });
    }
    return new RecursiveCharacterTextSplitter({ chunkSize, chunkOverlap });
  }

  emitRagStatus(status, details = {}) {
    const logDetails = { component: 'WikiLangchainAdapter', status, ...details };
    console.log(`🔍 RAG STATUS: {status}`, logDetails);
    if (this.eventBus) {
      this.eventBus.emit('ragStatusUpdate', { timestamp: new Date().toISOString(), ...logDetails });
    }
  }

  // Rate limiting and queueing
  async checkRateLimit() {
    const now = Date.now();
    if (now - this.lastRequestTime > 60000) {
      this.requestsInLastMinute = 0;
      this.lastRequestTime = now;
    }
    if (this.requestsInLastMinute < this.maxRequestsPerMinute) {
      this.requestsInLastMinute++;
      return true;
    }
    return false;
  }

  startQueueProcessor() {
    setInterval(() => this.processQueue(), 1000);
  }

  async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return;
    this.isProcessingQueue = true;
    const request = this.requestQueue.shift();
    if (await this.checkRateLimit()) {
      try {
        await request.execute();
      } catch (error) {
        console.error('Error processing request:', error);
        if (request.retryCount < this.maxRetries) {
          request.retryCount++;
          this.requestQueue.unshift(request); // Add back to the front for retry
        }
      } finally {
        this.isProcessingQueue = false;
        // Defer the next call to avoid stack overflow
        setImmediate(() => this.processQueue());
      }
    } else {
      this.requestQueue.unshift(request); // Return to the queue
      this.isProcessingQueue = false;
    }
  }

  queueRequest(execute) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ execute, resolve, reject, retryCount: 0 });
      if (!this.isProcessingQueue) {
        this.processQueue();
      }
    });
  }
}

module.exports = WikiLangchainAdapter;
