#!/usr/bin/env node

/**
 * LangSmith Workspace Information Tool
 * Retrieves detailed information about the LangSmith workspace including recent runs, projects, and traces
 */

const { Client } = require('langsmith');

async function getLangSmithInfo() {
  try {
    // Check if LangSmith is configured
    const apiKey = process.env.LANGSMITH_API_KEY;
    if (!apiKey) {
      console.log('❌ LANGSMITH_API_KEY not found in environment variables');
      console.log('   Please set your LangSmith API key in your .env file or environment');
      return;
    }

    console.log('🔍 LangSmith Workspace Information');
    console.log('=====================================\n');

    // Initialize client
    const client = new Client({
      apiKey: apiKey,
      apiUrl: process.env.LANGCHAIN_ENDPOINT || 'https://api.smith.langchain.com'
    });

    console.log('✅ LangSmith Client initialized successfully');
    console.log(`🔑 API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
    console.log(`🌐 API URL: ${process.env.LANGCHAIN_ENDPOINT || 'https://api.smith.langchain.com'}`);
    
    if (process.env.LANGSMITH_WORKSPACE_ID) {
      console.log(`🏢 Workspace ID: ${process.env.LANGSMITH_WORKSPACE_ID}`);
    }
    
    if (process.env.LANGCHAIN_PROJECT) {
      console.log(`📁 Default Project: ${process.env.LANGCHAIN_PROJECT}`);
    }
    
    console.log('\n📊 Recent Runs and Traces:');
    console.log('---------------------------');

    // Get recent runs
    try {
      const runs = await client.listRuns({
        projectName: process.env.LANGCHAIN_PROJECT || 'vibeswitch-trace',
        limit: 10,
        order: 'desc'
      });

      console.log(`\n🔍 Found ${runs.length} recent runs in project "${process.env.LANGCHAIN_PROJECT || 'vibeswitch-trace'}"`);
      
      for (let i = 0; i < Math.min(runs.length, 5); i++) {
        const run = runs[i];
        console.log(`\n📋 Run ${i + 1}:`);
        console.log(`   ID: ${run.id}`);
        console.log(`   Name: ${run.name || 'Unnamed'}`);
        console.log(`   Type: ${run.run_type}`);
        console.log(`   Status: ${run.status}`);
        console.log(`   Start Time: ${new Date(run.start_time).toLocaleString()}`);
        if (run.end_time) {
          console.log(`   End Time: ${new Date(run.end_time).toLocaleString()}`);
          console.log(`   Duration: ${(new Date(run.end_time) - new Date(run.start_time))}ms`);
        }
        if (run.inputs) {
          console.log(`   Inputs: ${JSON.stringify(run.inputs).substring(0, 100)}...`);
        }
        if (run.outputs) {
          console.log(`   Outputs: ${JSON.stringify(run.outputs).substring(0, 100)}...`);
        }
        if (run.error) {
          console.log(`   ❌ Error: ${run.error}`);
        }
      }

      // Get projects
      console.log('\n\n📁 Available Projects:');
      console.log('----------------------');
      
      try {
        const projects = await client.listProjects({ limit: 20 });
        console.log(`\n🗂️ Found ${projects.length} projects:`);
        
        for (const project of projects) {
          console.log(`\n📂 ${project.name}`);
          console.log(`   ID: ${project.id}`);
          console.log(`   Description: ${project.description || 'No description'}`);
          console.log(`   Created: ${new Date(project.created_at).toLocaleString()}`);
          console.log(`   Modified: ${new Date(project.modified_at).toLocaleString()}`);
          
          // Get run count for this project
          try {
            const projectRuns = await client.listRuns({
              projectId: project.id,
              limit: 1
            });
            // Note: This is just checking if there are any runs, not getting exact count
            console.log(`   Status: ${projectRuns.length > 0 ? 'Has runs' : 'No runs yet'}`);
          } catch (err) {
            console.log(`   Status: Unable to check runs`);
          }
        }
      } catch (projectErr) {
        console.log(`⚠️ Could not fetch projects: ${projectErr.message}`);
      }

    } catch (runsErr) {
      console.log(`⚠️ Could not fetch runs: ${runsErr.message}`);
      console.log('This might be due to permissions or project not existing yet.');
    }

    console.log('\n\n🎯 Configuration Summary:');
    console.log('-------------------------');
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Tracing Enabled: ${process.env.LANGSMITH_TRACING || 'false'}`);
    console.log(`Organization: ${process.env.LANGSMITH_ORGANIZATION_NAME || 'Not set'}`);
    
    console.log('\n✅ LangSmith workspace analysis complete!');
    console.log('\n💡 Tips:');
    console.log('   - Visit https://smith.langchain.com to view traces in the web UI');
    console.log('   - Use LANGSMITH_TRACING=true to enable tracing');
    console.log('   - Check the "vibeswitch-trace" project for your application traces');

  } catch (error) {
    console.error('❌ Error connecting to LangSmith:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check your LANGSMITH_API_KEY is valid');
    console.log('   2. Ensure you have internet connectivity');
    console.log('   3. Verify your LangSmith account is active');
    console.log('   4. Make sure the langsmith package is installed: npm install langsmith');
  }
}

// Export for use as module or run directly
if (require.main === module) {
  getLangSmithInfo().catch(console.error);
}

module.exports = { getLangSmithInfo };
