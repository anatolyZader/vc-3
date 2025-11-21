#!/usr/bin/env node
/**
 * Pinecone CLI Utility - Command-line interface for Pinecone operations
 * Usage: node pinecone_cli.js <command> [options]
 */

const { Pinecone } = require('@pinecone-database/pinecone');

class PineconeCLI {
  constructor() {
    this.client = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
    this.indexName = process.env.PINECONE_INDEX_NAME || 'eventstorm-index';
  }

  async listIndexes() {
    try {
      console.log('🔍 Fetching all indexes...');
      const indexes = await this.client.listIndexes();
      
      if (indexes.indexes && indexes.indexes.length > 0) {
        console.log('\n📊 Available Indexes:');
        indexes.indexes.forEach((index, i) => {
          console.log(`${i + 1}. ${index.name}`);
          console.log(`   - Status: ${index.status || 'unknown'}`);
          console.log(`   - Dimension: ${index.dimension || 'unknown'}`);
          console.log(`   - Metric: ${index.metric || 'unknown'}`);
          console.log(`   - Host: ${index.host || 'unknown'}`);
          console.log('');
        });
      } else {
        console.log('❌ No indexes found');
      }
    } catch (error) {
      console.error('❌ Error listing indexes:', error.message);
    }
  }

  async indexStats(indexName = null) {
    try {
      const targetIndex = indexName || this.indexName;
      console.log(`📊 Getting stats for index: ${targetIndex}`);
      
      const index = this.client.index(targetIndex);
      const stats = await index.describeIndexStats();
      
      console.log('\n📈 Index Statistics:');
      console.log(`Total Vectors: ${stats.totalVectorCount || 0}`);
      console.log(`Dimensions: ${stats.dimension || 'unknown'}`);
      
      if (stats.namespaces && Object.keys(stats.namespaces).length > 0) {
        console.log('\n📁 Namespaces:');
        Object.entries(stats.namespaces).forEach(([name, data]) => {
          console.log(`  ${name}: ${data.vectorCount || 0} vectors`);
        });
      } else {
        console.log('📁 No namespaces found');
      }
      
    } catch (error) {
      console.error('❌ Error getting index stats:', error.message);
    }
  }

  async listNamespaces(indexName = null) {
    try {
      const targetIndex = indexName || this.indexName;
      console.log(`📁 Listing namespaces for index: ${targetIndex}`);
      
      const index = this.client.index(targetIndex);
      const stats = await index.describeIndexStats();
      
      if (stats.namespaces && Object.keys(stats.namespaces).length > 0) {
        console.log('\n📁 Available Namespaces:');
        Object.entries(stats.namespaces).forEach(([name, data]) => {
          console.log(`• ${name} (${data.vectorCount || 0} vectors)`);
        });
      } else {
        console.log('❌ No namespaces found');
      }
    } catch (error) {
      console.error('❌ Error listing namespaces:', error.message);
    }
  }

  async queryVectors(namespace, queryText = 'test query', topK = 5, includeValues = false) {
    try {
      console.log(`🔍 Querying namespace '${namespace}' with text: "${queryText}"`);
      
      // Create a simple query vector (you'd normally use embeddings here)
      const queryVector = new Array(3072).fill(0.1); // Dummy vector for text-embedding-3-large
      
      const index = this.client.index(this.indexName);
      const queryResponse = await index.namespace(namespace).query({
        vector: queryVector,
        topK: topK,
        includeMetadata: true,
        includeValues: includeValues
      });

      if (queryResponse.matches && queryResponse.matches.length > 0) {
        console.log(`\n📋 Found ${queryResponse.matches.length} matches:`);
        queryResponse.matches.forEach((match, i) => {
          console.log(`${i + 1}. ID: ${match.id}`);
          console.log(`   Score: ${match.score?.toFixed(4) || 'unknown'}`);
          if (match.metadata) {
            console.log(`   Metadata:`, JSON.stringify(match.metadata, null, 2));
          }
          if (match.values && includeValues) {
            console.log(`   Vector (first 10 dimensions): [${match.values.slice(0, 10).map(v => v.toFixed(4)).join(', ')}...]`);
            console.log(`   Vector length: ${match.values.length} dimensions`);
          }
          console.log('');
        });
      } else {
        console.log('❌ No matches found');
      }
    } catch (error) {
      console.error('❌ Error querying vectors:', error.message);
    }
  }

  async fetchVectorById(vectorId, namespace, includeValues = true) {
    try {
      console.log(`🎯 Fetching vector by ID: ${vectorId} in namespace: ${namespace}`);
      
      const index = this.client.index(this.indexName);
      const fetchResponse = await index.namespace(namespace).fetch([vectorId]);

      if (fetchResponse.vectors && fetchResponse.vectors[vectorId]) {
        const vector = fetchResponse.vectors[vectorId];
        console.log(`\n📊 Vector Details for ID: ${vectorId}`);
        
        // Show chunk content if available
        if (vector.metadata && vector.metadata.text) {
          console.log(`\n📄 CHUNK CONTENT:`);
          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
          console.log(vector.metadata.text);
          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        }
        
        console.log(`\n🏷️  METADATA:`);
        console.log(JSON.stringify(vector.metadata, null, 2));
        
        if (vector.values && includeValues) {
          console.log(`\n🔢 VECTOR ANALYSIS:`);
          console.log(`   Vector dimensions: ${vector.values.length}`);
          console.log(`   First 10 values: [${vector.values.slice(0, 10).map(v => v.toFixed(4)).join(', ')}...]`);
          console.log(`   Last 10 values: [${vector.values.slice(-10).map(v => v.toFixed(4)).join(', ')}...]`);
          
          // Statistical analysis
          const sum = vector.values.reduce((a, b) => a + b, 0);
          const mean = sum / vector.values.length;
          const min = Math.min(...vector.values);
          const max = Math.max(...vector.values);
          
          console.log(`   Statistics: mean=${mean.toFixed(4)}, min=${min.toFixed(4)}, max=${max.toFixed(4)}`);
        }
        
        return vector;
      } else {
        console.log('❌ Vector not found');
        return null;
      }
    } catch (error) {
      console.error('❌ Error fetching vector:', error.message);
      return null;
    }
  }

  async showChunkContent(namespace, limit = 5) {
    try {
      console.log(`📄 Showing content for ${limit} chunks in namespace: ${namespace}`);
      
      // Query with dummy vector to get chunk content
      const queryVector = new Array(3072).fill(0.1);
      const index = this.client.index(this.indexName);
      
      const queryResponse = await index.namespace(namespace).query({
        vector: queryVector,
        topK: limit,
        includeMetadata: true,
        includeValues: false
      });

      if (queryResponse.matches && queryResponse.matches.length > 0) {
        console.log(`\n📚 Found ${queryResponse.matches.length} chunks with content:`);
        
        queryResponse.matches.forEach((match, i) => {
          console.log(`\n${i + 1}. 📄 CHUNK: ${match.id}`);
          console.log(`   📊 Score: ${match.score?.toFixed(4) || 'unknown'}`);
          
          if (match.metadata) {
            if (match.metadata.source) {
              console.log(`   📁 Source: ${match.metadata.source}`);
            }
            if (match.metadata.chunkIndex !== undefined) {
              console.log(`   🔢 Chunk Index: ${match.metadata.chunkIndex}`);
            }
            if (match.metadata.text) {
              console.log(`   📄 Content Preview (first 200 chars):`);
              console.log(`   ┌─────────────────────────────────────────┐`);
              const preview = match.metadata.text.substring(0, 200);
              const lines = preview.split('\n');
              lines.forEach(line => {
                console.log(`   │ ${line.substring(0, 40).padEnd(40)} │`);
              });
              if (match.metadata.text.length > 200) {
                console.log(`   │ ... (${match.metadata.text.length - 200} more chars)          │`);
              }
              console.log(`   └─────────────────────────────────────────┘`);
            }
          }
        });
      } else {
        console.log('❌ No chunks found');
      }
    } catch (error) {
      console.error('❌ Error showing chunk content:', error.message);
    }
  }

  async searchChunks(namespace, searchText, limit = 3) {
    try {
      console.log(`🔍 Searching for "${searchText}" in namespace: ${namespace}`);
      
      // Create a basic search vector (dummy approach)
      const queryVector = new Array(3072).fill(0.1);
      const index = this.client.index(this.indexName);
      
      const queryResponse = await index.namespace(namespace).query({
        vector: queryVector,
        topK: limit * 3, // Get more results to filter through
        includeMetadata: true,
        includeValues: false
      });

      if (queryResponse.matches && queryResponse.matches.length > 0) {
        // Filter results that contain the search text in metadata
        const matchingChunks = queryResponse.matches.filter(match => {
          if (match.metadata && match.metadata.text) {
            return match.metadata.text.toLowerCase().includes(searchText.toLowerCase());
          }
          return false;
        }).slice(0, limit);

        if (matchingChunks.length > 0) {
          console.log(`\n🎯 Found ${matchingChunks.length} chunks containing "${searchText}":`);
          
          matchingChunks.forEach((match, i) => {
            console.log(`\n${i + 1}. 📄 MATCHING CHUNK: ${match.id}`);
            console.log(`   📁 Source: ${match.metadata.source || 'unknown'}`);
            
            if (match.metadata.text) {
              const text = match.metadata.text;
              const searchIndex = text.toLowerCase().indexOf(searchText.toLowerCase());
              
              if (searchIndex !== -1) {
                // Show context around the match
                const start = Math.max(0, searchIndex - 50);
                const end = Math.min(text.length, searchIndex + searchText.length + 50);
                const context = text.substring(start, end);
                
                console.log(`   📄 Context around "${searchText}":`);
                console.log(`   ┌─────────────────────────────────────────┐`);
                console.log(`   │ ...${context}... │`);
                console.log(`   └─────────────────────────────────────────┘`);
              }
            }
          });
        } else {
          console.log(`❌ No chunks found containing "${searchText}"`);
        }
      } else {
        console.log('❌ No chunks found in namespace');
      }
    } catch (error) {
      console.error('❌ Error searching chunks:', error.message);
    }
  }

  async listVectorIds(namespace, limit = 10) {
    try {
      console.log(`📋 Listing vector IDs in namespace: ${namespace} (limit: ${limit})`);
      
      // Query with dummy vector to get vector IDs
      const queryVector = new Array(3072).fill(0.1);
      const index = this.client.index(this.indexName);
      
      const queryResponse = await index.namespace(namespace).query({
        vector: queryVector,
        topK: limit,
        includeMetadata: true,
        includeValues: false
      });

      if (queryResponse.matches && queryResponse.matches.length > 0) {
        console.log(`\n📋 Found ${queryResponse.matches.length} vector IDs:`);
        queryResponse.matches.forEach((match, i) => {
          console.log(`${i + 1}. ${match.id}`);
          if (match.metadata?.source) {
            console.log(`   Source: ${match.metadata.source}`);
          }
        });
        
        return queryResponse.matches.map(m => m.id);
      } else {
        console.log('❌ No vectors found');
        return [];
      }
    } catch (error) {
      console.error('❌ Error listing vector IDs:', error.message);
      return [];
    }
  }

  async deleteNamespace(namespace, indexName = null) {
    try {
      const targetIndex = indexName || this.indexName;
      console.log(`🗑️  Deleting all vectors in namespace '${namespace}' from index '${targetIndex}'`);
      
      // Ask for confirmation
      console.log('⚠️  This will delete ALL vectors in the namespace. Continue? (yes/no)');
      
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      readline.question('Confirm deletion: ', async (answer) => {
        if (answer.toLowerCase() === 'yes') {
          try {
            const index = this.client.index(targetIndex);
            await index.namespace(namespace).deleteAll();
            console.log('✅ Namespace deleted successfully');
          } catch (error) {
            console.error('❌ Error deleting namespace:', error.message);
          }
        } else {
          console.log('❌ Deletion cancelled');
        }
        readline.close();
      });
    } catch (error) {
      console.error('❌ Error deleting namespace:', error.message);
    }
  }

  showHelp() {
    console.log(`
🌲 Pinecone CLI Utility

Usage: node pinecone_cli.js <command> [options]

Commands:
  list-indexes                    List all Pinecone indexes
  stats [index-name]             Get index statistics
  namespaces [index-name]        List all namespaces in an index  
  query <namespace> [text] [k]   Query vectors in a namespace
  query-with-values <namespace>  Query vectors and show actual vector values
  fetch <vector-id> <namespace>  Fetch specific vector by ID with values
  list-ids <namespace> [limit]   List vector IDs in a namespace
  show-content <namespace> [limit] Show actual chunk content from metadata
  search <namespace> <text>      Search for text within chunk content
  delete-ns <namespace>          Delete all vectors in namespace (DANGEROUS!)
  help                           Show this help message

Examples:
  node pinecone_cli.js list-indexes
  node pinecone_cli.js stats
  node pinecone_cli.js namespaces
  node pinecone_cli.js query anatolyzader_vc-3_main
  node pinecone_cli.js query-with-values anatolyzader_vc-3_main
  node pinecone_cli.js list-ids anatolyzader_vc-3_main 5
  node pinecone_cli.js fetch "specific-vector-id" anatolyzader_vc-3_main
  node pinecone_cli.js show-content anatolyzader_vc-3_main 3
  node pinecone_cli.js search anatolyzader_vc-3_main "function"
  node pinecone_cli.js delete-ns old-namespace

Environment Variables:
  PINECONE_API_KEY      Your Pinecone API key (required)
  PINECONE_INDEX_NAME   Default index name (optional)
`);
  }
}

// Command-line interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!process.env.PINECONE_API_KEY) {
    console.error('❌ Error: PINECONE_API_KEY environment variable is required');
    process.exit(1);
  }

  const cli = new PineconeCLI();

  switch (command) {
    case 'list-indexes':
    case 'list':
      await cli.listIndexes();
      break;
    
    case 'stats':
      await cli.indexStats(args[1]);
      break;
    
    case 'namespaces':
    case 'ns':
      await cli.listNamespaces(args[1]);
      break;
    
    case 'query':
      if (!args[1]) {
        console.error('❌ Error: namespace required for query command');
        process.exit(1);
      }
      await cli.queryVectors(args[1], args[2], parseInt(args[3]) || 5, false);
      break;
    
    case 'query-with-values':
      if (!args[1]) {
        console.error('❌ Error: namespace required for query-with-values command');
        process.exit(1);
      }
      await cli.queryVectors(args[1], args[2] || 'test query', parseInt(args[3]) || 3, true);
      break;
    
    case 'fetch':
      if (!args[1] || !args[2]) {
        console.error('❌ Error: vector ID and namespace required for fetch command');
        console.error('Usage: node pinecone_cli.js fetch <vector-id> <namespace>');
        process.exit(1);
      }
      await cli.fetchVectorById(args[1], args[2], true);
      break;
    
    case 'list-ids':
      if (!args[1]) {
        console.error('❌ Error: namespace required for list-ids command');
        process.exit(1);
      }
      await cli.listVectorIds(args[1], parseInt(args[2]) || 10);
      break;
    
    case 'show-content':
      if (!args[1]) {
        console.error('❌ Error: namespace required for show-content command');
        process.exit(1);
      }
      await cli.showChunkContent(args[1], parseInt(args[2]) || 5);
      break;
    
    case 'search':
      if (!args[1] || !args[2]) {
        console.error('❌ Error: namespace and search text required for search command');
        console.error('Usage: node pinecone_cli.js search <namespace> <search-text>');
        process.exit(1);
      }
      await cli.searchChunks(args[1], args[2], parseInt(args[3]) || 3);
      break;
    
    case 'delete-ns':
    case 'delete-namespace':
      if (!args[1]) {
        console.error('❌ Error: namespace required for delete command');
        process.exit(1);
      }
      await cli.deleteNamespace(args[1]);
      break;
    
    case 'help':
    case '--help':
    case '-h':
    default:
      cli.showHelp();
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = PineconeCLI;