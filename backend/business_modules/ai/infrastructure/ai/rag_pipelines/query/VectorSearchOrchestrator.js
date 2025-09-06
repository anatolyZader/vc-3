const { PineconeStore } = require('@langchain/pinecone');
const VectorSearchStrategy = require('./VectorSearchStrategy');

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
    
    const userSearchPromise = this.createResilientSearch(
      this.vectorStore,
      prompt,
      searchStrategy.userResults,
      searchStrategy.userFilters,
      'USER'
    );

    const coreDocsVectorStore = new PineconeStore(this.embeddings, {
      pineconeIndex: this.pinecone.Index(pineconeIndex),
      namespace: 'core-docs'
    });

    const coreDocsSearchPromise = this.createResilientSearch(
      coreDocsVectorStore,
      prompt,
      searchStrategy.coreResults,
      searchStrategy.coreFilters,
      'CORE DOCS'
    );

    return await this.executeSearchWithTimeout([userSearchPromise, coreDocsSearchPromise], VECTOR_SEARCH_TIMEOUT);
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
      const [userDocs, coreDocs] = await Promise.race([
        Promise.all(searchPromises),
        timeoutPromise
      ]);
      
      const similarDocuments = [...userDocs, ...coreDocs];

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

  logSearchStrategy(searchStrategy) {
    console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: User=${searchStrategy.userResults} docs, Core=${searchStrategy.coreResults} docs`);
    console.log(`[${new Date().toISOString()}] 🧠 SEARCH FILTERS: User=${JSON.stringify(searchStrategy.userFilters)}, Core=${JSON.stringify(searchStrategy.coreFilters)}`);
  }
}

module.exports = VectorSearchOrchestrator;
