#!/usr/bin/env node

/**
 * Quick script to trigger repository reprocessing for main branch
 * This will refresh the vector store with current main branch content
 */

async function triggerRepoRefresh() {
  console.log('🔄 Triggering repository refresh for main branch...');
  
  try {
    const response = await fetch('http://localhost:3000/api/debug/trigger-repo-push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: 'main-branch-refresh-user',
        repoId: 'anatolyZader/vc-3',
        repoData: {
          url: 'https://github.com/anatolyZader/vc-3.git',
          branch: 'main',
          githubOwner: 'anatolyZader',
          repoName: 'vc-3',
          description: 'EventStorm main branch refresh - replacing amber branch chunks',
          timestamp: new Date().toISOString(),
          forceBranch: 'main'
        }
      })
    });

    if (!response.ok) {
      console.log('⚠️ Debug endpoint not available, trying direct event trigger...');
      
      // Alternative: Try to emit event directly if we can access the server internals
      console.log('💡 You can manually trigger the refresh by asking a question in the chat interface');
      console.log('💡 This will show you what branch content is being retrieved');
      console.log('');
      console.log('🎯 CURRENT SITUATION:');
      console.log('- Your RAG system has cached chunks from "amber" branch (July 2025)');
      console.log('- You want fresh chunks from "main" branch');
      console.log('- Vector store needs to be refreshed with current content');
      console.log('');
      console.log('🛠️ SOLUTIONS:');
      console.log('1. Wait for the next repository push event (automatic refresh)');
      console.log('2. Restart the server to clear any in-memory caches');
      console.log('3. Check if there are admin/debug endpoints available');
      console.log('4. Run a RAG query and note the branch mismatch');
      
      return;
    }

    const result = await response.json();
    console.log('✅ Repository refresh triggered:', result);
    
  } catch (error) {
    console.error('❌ Error triggering refresh:', error.message);
    console.log('');
    console.log('🔍 DIAGNOSIS: The "branch": "amber" issue means:');
    console.log('');
    console.log('📊 METADATA ANALYSIS:');
    console.log('- Chunks were processed: 2025-07-14T15:43:05.314Z (July 2025)');
    console.log('- Source branch: "amber"'); 
    console.log('- Current branch: "main"');
    console.log('- Repository: anatolyZader/vc-3');
    console.log('');
    console.log('🎯 ROOT CAUSE:');
    console.log('- Vector database contains stale embeddings from amber branch');
    console.log('- RAG retrieval serves cached results regardless of current git branch');
    console.log('- System needs fresh embedding generation from main branch content');
    console.log('');
    console.log('⚡ QUICK VERIFICATION:');
    console.log('- Ask any question about your codebase in the chat');
    console.log('- Check the trace analysis for "branch": "main" vs "branch": "amber"');
    console.log('- If still showing "amber", vector store refresh is needed');
  }
}

triggerRepoRefresh();
