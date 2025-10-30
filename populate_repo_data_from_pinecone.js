// Manually populate repo_data from Pinecone vectors
// This is a one-time fix to populate the PostgreSQL table from existing Pinecone data

require('dotenv').config({ path: './backend/.env' });
const { Pinecone } = require('@pinecone-database/pinecone');
const { Pool } = require('pg');

async function populateRepoDataFromPinecone() {
  console.log('🔄 Populating repo_data from Pinecone vectors\n');

  // Initialize Pinecone
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY
  });
  const index = pinecone.index('eventstorm-index');
  
  // Initialize PostgreSQL
  const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: parseInt(process.env.PG_PORT) || 5432,
    ssl: false
  });

  const userId = 'd41402df-182a-41ec-8f05-153118bf2718';
  const repoId = 'anatolyZader/vc-3';
  const namespace = `${userId}_anatolyzader_vc-3`;

  try {
    console.log(`📊 Fetching vectors from namespace: ${namespace}`);
    
    // Fetch vectors from Pinecone (in batches)
    const vectors = [];
    let fetchMore = true;
    let paginationToken = null;
    
    while (fetchMore) {
      const response = await index.namespace(namespace).listPaginated({
        limit: 100,
        paginationToken
      });
      
      vectors.push(...response.vectors);
      paginationToken = response.pagination?.next;
      fetchMore = !!paginationToken;
      
      console.log(`  Fetched ${vectors.length} vectors so far...`);
    }
    
    console.log(`\n✅ Fetched ${vectors.length} total vectors from Pinecone`);
    
    // Now fetch full vector data with metadata
    console.log('\n📥 Fetching vector metadata...');
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      let stored = 0;
      let skipped = 0;
      
      for (const vectorId of vectors.map(v => v.id)) {
        try {
          // Fetch full vector with metadata
          const fetchResult = await index.namespace(namespace).fetch([vectorId]);
          const vectorData = fetchResult.records[vectorId];
          
          if (!vectorData || !vectorData.metadata) {
            console.log(`  ⚠️  No metadata for vector: ${vectorId}`);
            skipped++;
            continue;
          }
          
          const metadata = vectorData.metadata;
          const filePath = metadata.source || metadata.filePath || 'unknown';
          const content = metadata.text || '';
          const chunkIndex = metadata.chunkIndex ?? 0;
          
          if (!content || content.trim().length === 0) {
            skipped++;
            continue;
          }
          
          const fileExtension = filePath.split('.').pop() || 'unknown';
          const chunkTokens = metadata.chunkTokens || Math.ceil(content.length / 4);
          
          // Build metadata JSON
          const metadataJson = {
            semantic_tags: metadata.semantic_tags || metadata.semanticTags || [],
            ubiquitous_language: metadata.ubiquitous_language || metadata.ubiquitousLanguage || [],
            domain_concepts: metadata.domain_concepts || metadata.domainConcepts || [],
            function_names: metadata.function_names || metadata.functionNames || [],
            class_names: metadata.class_names || metadata.classNames || [],
            type: metadata.type || 'github-code',
            branch: metadata.branch || 'main',
            commit_sha: metadata.commit_sha || metadata.sha || null,
            processed_at: metadata.processedAt || metadata.loaded_at || new Date().toISOString(),
            repo_url: metadata.repoUrl || metadata.repository || null,
            file_type: metadata.fileType || fileExtension
          };
          
          // Insert into repo_data
          const query = `
            INSERT INTO repo_data (
              user_id,
              repo_id,
              file_path,
              file_extension,
              chunk_index,
              chunk_content,
              chunk_tokens,
              metadata,
              language
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (user_id, repo_id, file_path, chunk_index) 
            DO UPDATE SET
              chunk_content = EXCLUDED.chunk_content,
              chunk_tokens = EXCLUDED.chunk_tokens,
              metadata = EXCLUDED.metadata,
              file_extension = EXCLUDED.file_extension,
              updated_at = CURRENT_TIMESTAMP
          `;
          
          await client.query(query, [
            userId,
            repoId,
            filePath,
            fileExtension,
            chunkIndex,
            content,
            chunkTokens,
            JSON.stringify(metadataJson),
            'english'
          ]);
          
          stored++;
          
          if (stored % 50 === 0) {
            console.log(`  💾 Stored ${stored}/${vectors.length} chunks...`);
          }
          
        } catch (chunkError) {
          console.error(`  ❌ Error processing vector ${vectorId}:`, chunkError.message);
          skipped++;
        }
      }
      
      await client.query('COMMIT');
      
      console.log(`\n✅ Populationcomplete!`);
      console.log(`   Stored: ${stored}`);
      console.log(`   Skipped: ${skipped}`);
      console.log(`   Total: ${vectors.length}`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

populateRepoDataFromPinecone();
