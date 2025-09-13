const { PineconeStore } = require('@langchain/pinecone');
const VectorSearchStrategy = require('./vectorSearchStrategy');

class VectorSearchOrchestrator {
  constructor(vectorStore, pinecone, embeddings) {
    this.vectorStore = vectorStore;
    this.pinecone = pinecone;
    this.embeddings = embeddings;
  }

  async performSearch(prompt) {
    const searchStrategy = VectorSearchStrategy.determineSearchStrategy(prompt);
    this.logSearchStrategy(searchStrategy);

    const VECTOR_SEARCH_TIMEOUT = 30000; // 30 seconds
    const pineconeIndex = process.env.PINECONE_INDEX_NAME || 'eventstorm-index';
    
    const codeSearchPromise = this.createResilientSearch(
      this.vectorStore,
      prompt,
      searchStrategy.codeResults,
      searchStrategy.codeFilters,
      'CODE'
    );

    const coreDocsVectorStore = new PineconeStore(this.embeddings, {
      pineconeIndex: this.pinecone.Index(pineconeIndex),
      namespace: 'core-docs'
    });

    const docsSearchPromise = this.createResilientSearch(
      coreDocsVectorStore,
      prompt,
      searchStrategy.docsResults,
      searchStrategy.docsFilters,
      'DOCS'
    );

    return await this.executeSearchWithTimeout([codeSearchPromise, docsSearchPromise], VECTOR_SEARCH_TIMEOUT);
  }

  async createResilientSearch(vectorStore, prompt, maxResults, filters, searchType) {
    try {
      if (filters && Object.keys(filters).length > 0) {
        console.log(`[${new Date().toISOString()}] 🔍 ${searchType}: Attempting filtered search with:`, JSON.stringify(filters));
        return await vectorStore.similaritySearch(prompt, maxResults, { filter: filters });
      } else {
        return await vectorStore.similaritySearch(prompt, maxResults);
      }
    } catch (filterError) {
      console.log(`[${new Date().toISOString()}] ⚠️ ${searchType} filter error (${filterError.message}), retrying without filters`);
      return await vectorStore.similaritySearch(prompt, maxResults);
    }
  }

  async executeSearchWithTimeout(searchPromises, timeout) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Vector search timeout')), timeout);
    });

    try {
      const [codeDocs, docsDocs] = await Promise.race([
        Promise.all(searchPromises),
        timeoutPromise
      ]);
      
      const allDocuments = [...codeDocs, ...docsDocs];
      
      // CLIENT CODE EXCLUSION - Filter out client code chunks post-retrieval
      const similarDocuments = this.filterClientCode(allDocuments);

      // Log retrieved documents for debugging
      similarDocuments.forEach((doc, i) => {
        console.log(`[DEBUG] Chunk ${i}: ${doc.metadata.source || 'Unknown'} | ${doc.pageContent.substring(0, 200)}`);
      });
      console.log(`[${new Date().toISOString()}] 🔍 RAG DEBUG: Retrieved ${similarDocuments.length} documents from vector store`);
      
      if (similarDocuments.length > 0) {
        console.log(`[${new Date().toISOString()}] 🔍 RAG DEBUG: First document metadata:`, 
          JSON.stringify(similarDocuments[0].metadata, null, 2));
        console.log(`[${new Date().toISOString()}] 🔍 RAG DEBUG: First document content preview: ${similarDocuments[0].pageContent.substring(0, 100)}...`);
        
        // Log all document sources for better debugging
        console.log(`[${new Date().toISOString()}] 🔍 RAG DEBUG: All retrieved document sources:`);
        similarDocuments.forEach((doc, index) => {
          console.log(`[${new Date().toISOString()}]   ${index + 1}. ${doc.metadata.source || 'Unknown'} (${doc.pageContent.length} chars)`);
        });
      }
      
      return similarDocuments;

    } catch (timeoutError) {
      console.log(`[${new Date().toISOString()}] ⚠️ Vector search timed out`);
      throw timeoutError;
    }
  }

  /**
   * CLIENT CODE EXCLUSION - Filter out client/frontend code chunks from search results
   */
  filterClientCode(documents) {
    const clientDirectories = ['client/', 'frontend/', 'web/', 'www/', 'static/', 'public/', 'assets/'];
    const frontendExtensions = ['.html', '.css', '.scss', '.sass', '.less'];
    const frontendFiles = ['index.html', 'main.jsx', 'app.js', 'index.js'];
    
    const originalCount = documents.length;
    const filteredDocuments = documents.filter(doc => {
      const source = doc.metadata?.source?.toLowerCase() || '';
      
      // Check for client directories
      for (const clientDir of clientDirectories) {
        if (source.includes(clientDir)) {
          console.log(`[${new Date().toISOString()}] 🚫 CLIENT FILTER: Excluded ${doc.metadata.source} (client directory)`);
          return false;
        }
      }
      
      // Check for frontend file extensions
      for (const ext of frontendExtensions) {
        if (source.endsWith(ext)) {
          console.log(`[${new Date().toISOString()}] 🚫 CLIENT FILTER: Excluded ${doc.metadata.source} (frontend extension)`);
          return false;
        }
      }
      
      // Check for frontend entry point files in client contexts
      const fileName = source.split('/').pop() || '';
      if (frontendFiles.includes(fileName) && clientDirectories.some(dir => source.includes(dir))) {
        console.log(`[${new Date().toISOString()}] 🚫 CLIENT FILTER: Excluded ${doc.metadata.source} (frontend entry file)`);
        return false;
      }
      
      return true;
    });
    
    if (filteredDocuments.length !== originalCount) {
      console.log(`[${new Date().toISOString()}] 🧹 CLIENT FILTER: Filtered ${originalCount - filteredDocuments.length} client code chunks, ${filteredDocuments.length} backend chunks remaining`);
    }
    
    return filteredDocuments;
  }

  logSearchStrategy(searchStrategy) {
    console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: Code=${searchStrategy.codeResults} docs, Docs=${searchStrategy.docsResults} docs`);
    console.log(`[${new Date().toISOString()}] 🧠 SEARCH FILTERS: Code=${JSON.stringify(searchStrategy.codeFilters)}, Docs=${JSON.stringify(searchStrategy.docsFilters)}`);
  }
}

module.exports = VectorSearchOrchestrator;
