#!/usr/bin/env node

/**
 * Real-time LangSmith Trace Analyzer
 * 
 * Connects directly to LangSmith API to get the latest traces and chunks
 * Perfect for development mode where traces go directly to LangSmith
 */

const { Client } = require('langsmith');

async function analyzeLatestTrace() {
  try {
    console.log('🔍 Real-time LangSmith Trace Analyzer');
    console.log('=====================================\n');

    // Check environment
    const apiKey = process.env.LANGSMITH_API_KEY;
    if (!apiKey) {
      console.error('❌ LANGSMITH_API_KEY not found');
      console.log('💡 Run with: LANGSMITH_API_KEY="your-key" node realtime-trace-analyzer.js');
      return;
    }

    // Initialize LangSmith client
    const client = new Client({
      apiKey: apiKey,
      apiUrl: process.env.LANGCHAIN_ENDPOINT || 'https://api.smith.langchain.com'
    });

    console.log('✅ Connected to LangSmith API');
    console.log(`🔑 API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
    console.log(`📁 Project: ${process.env.LANGCHAIN_PROJECT || 'vibeswitch-trace'}\n`);

    // Get the most recent runs
    console.log('📊 Fetching latest traces...');
    const runs = await client.listRuns({
      projectName: process.env.LANGCHAIN_PROJECT || 'vibeswitch-trace',
      limit: 10,
      order: 'desc'
    });

    if (!runs || runs.length === 0) {
      console.log('⚠️  No traces found in the project');
      console.log('💡 Make sure you have sent a query and LangSmith tracing is enabled');
      return;
    }

    console.log(`🎯 Found ${runs.length} recent traces\n`);

    // Find the most recent RAG query
    let latestQueryRun = null;
    for (const run of runs) {
      if (run.name && run.name.includes('respondToPrompt') && run.inputs) {
        latestQueryRun = run;
        break;
      }
    }

    if (!latestQueryRun) {
      console.log('⚠️  No recent query traces found');
      console.log('📋 Available traces:');
      runs.slice(0, 5).forEach((run, index) => {
        console.log(`   ${index + 1}. ${run.name || 'Unnamed'} - ${new Date(run.start_time).toLocaleTimeString()}`);
      });
      return;
    }

    // Analyze the latest query
    console.log('🎯 Latest Query Trace Analysis');
    console.log('==============================\n');
    
    console.log(`📋 Trace Details:`);
    console.log(`   ID: ${latestQueryRun.id}`);
    console.log(`   Name: ${latestQueryRun.name}`);
    console.log(`   Status: ${latestQueryRun.status}`);
    console.log(`   Start Time: ${new Date(latestQueryRun.start_time).toLocaleString()}`);
    if (latestQueryRun.end_time) {
      const duration = new Date(latestQueryRun.end_time) - new Date(latestQueryRun.start_time);
      console.log(`   Duration: ${duration}ms`);
    }

    // Show inputs
    if (latestQueryRun.inputs) {
      console.log(`\n📥 Query Input:`);
      console.log(`   Prompt: "${JSON.stringify(latestQueryRun.inputs).substring(0, 200)}..."`);
    }

    // Show outputs
    if (latestQueryRun.outputs) {
      console.log(`\n📤 Response Output:`);
      const output = JSON.stringify(latestQueryRun.outputs);
      console.log(`   Response: "${output.substring(0, 200)}..."`);
    }

    // Get child runs (nested traces)
    console.log(`\n🔍 Analyzing nested traces for chunk data...`);
    const childRuns = await client.listRuns({
      parentRunId: latestQueryRun.id,
      limit: 50
    });

    console.log(`   Found ${childRuns.length} nested traces`);

    // Look for vector search traces
    const vectorSearchRuns = childRuns.filter(run => 
      run.name && (run.name.includes('performVectorSearch') || run.name.includes('VectorSearch'))
    );

    if (vectorSearchRuns.length > 0) {
      console.log(`\n🎯 Vector Search Results:`);
      
      for (const searchRun of vectorSearchRuns) {
        console.log(`\n   📊 Search Trace: ${searchRun.name}`);
        console.log(`      Status: ${searchRun.status}`);
        
        if (searchRun.outputs) {
          try {
            const searchOutput = searchRun.outputs;
            console.log(`      Raw Output: ${JSON.stringify(searchOutput).substring(0, 300)}...`);
            
            // Try to parse chunk data
            if (typeof searchOutput === 'object' && searchOutput.chunks) {
              console.log(`\n      📋 Retrieved Chunks: ${searchOutput.chunks.length}`);
              searchOutput.chunks.slice(0, 3).forEach((chunk, index) => {
                console.log(`\n      📄 Chunk ${index + 1}:`);
                console.log(`         Content: "${chunk.content ? chunk.content.substring(0, 100) : 'No content'}..."`);
                console.log(`         Source: ${chunk.source || 'Unknown'}`);
                if (chunk.score) console.log(`         Score: ${chunk.score}`);
              });
            }
          } catch (parseErr) {
            console.log(`      Parse Error: ${parseErr.message}`);
          }
        }
      }
    }

    // Look for LLM generation traces
    const llmRuns = childRuns.filter(run => 
      run.name && (run.name.includes('ChatOpenAI') || run.name.includes('generateWithContext'))
    );

    if (llmRuns.length > 0) {
      console.log(`\n🤖 LLM Generation Traces:`);
      
      for (const llmRun of llmRuns) {
        console.log(`\n   🧠 LLM Trace: ${llmRun.name}`);
        console.log(`      Status: ${llmRun.status}`);
        
        if (llmRun.inputs) {
          console.log(`      Input prompt length: ${JSON.stringify(llmRun.inputs).length} characters`);
        }
        
        if (llmRun.outputs) {
          const output = JSON.stringify(llmRun.outputs);
          console.log(`      Generated response: "${output.substring(0, 150)}..."`);
        }

        // Check for token usage
        if (llmRun.extra && llmRun.extra.invocation_params) {
          console.log(`      Model: ${llmRun.extra.invocation_params.model || 'Unknown'}`);
        }
      }
    }

    console.log(`\n✅ Real-time trace analysis complete!`);
    console.log(`\n💡 To view full trace details:`);
    console.log(`   Visit: https://smith.langchain.com/o/${process.env.LANGSMITH_ORGANIZATION_NAME || 'your-org'}/projects/p/${process.env.LANGCHAIN_PROJECT || 'vibeswitch-trace'}`);
    console.log(`   Trace ID: ${latestQueryRun.id}`);

  } catch (error) {
    console.error('❌ Error analyzing trace:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check your LANGSMITH_API_KEY is valid');
    console.log('   2. Ensure you have sent a query recently');
    console.log('   3. Verify LANGSMITH_TRACING=true in your environment');
    console.log('   4. Make sure your development server is running with LangSmith enabled');
  }
}

// Export for use as module or run directly
if (require.main === module) {
  // Load environment variables if running directly
  const envPath = require('path').join(__dirname, '../../../../.env');
  try {
    require('dotenv').config({ path: envPath });
  } catch (err) {
    console.log('💡 Note: Install dotenv to auto-load .env file, or set environment variables manually');
  }
  
  analyzeLatestTrace().catch(console.error);
}

module.exports = { analyzeLatestTrace };
