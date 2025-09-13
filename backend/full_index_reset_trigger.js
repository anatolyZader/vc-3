#!/usr/bin/env node

/**
 * Post-Index Reset: Force Full Re-indexing
 * After deleting Pinecone index, trigger complete rebuild from main branch
 */

async function triggerFullReindex() {
  console.log('🔥 FULL INDEX RESET - POST-DELETION REINDEX');
  console.log('============================================');
  console.log('');
  console.log('🎯 ASSUMPTION: You have already deleted the Pinecone index');
  console.log('🎯 GOAL: Force complete rebuild from current main branch');
  console.log('');
  
  // Make a dummy commit to trigger repository processing
  const { execSync } = require('child_process');
  
  try {
    // Check current status
    const currentBranch = execSync('git branch --show-current', { 
      cwd: process.cwd(), 
      encoding: 'utf8' 
    }).trim();
    
    const commitHash = execSync('git rev-parse HEAD', { 
      cwd: process.cwd(), 
      encoding: 'utf8' 
    }).trim();

    console.log(`📋 Current branch: ${currentBranch}`);
    console.log(`🔑 Current commit: ${commitHash.substring(0, 8)}`);
    console.log('');
    
    if (currentBranch !== 'main') {
      console.log(`⚠️  Switch to main branch first: git checkout main`);
      return;
    }
    
    console.log('🔄 TRIGGERING FULL RE-INDEX...');
    console.log('');
    
    // Method 1: Create a trigger file to force processing
    const triggerContent = `# Vector Store Reset Trigger
Generated: ${new Date().toISOString()}
Branch: main
Commit: ${commitHash}
Purpose: Force full re-indexing after Pinecone index deletion

This file triggers repository reprocessing with fresh main branch content.
All new embeddings will have "branch": "main" metadata.
`;
    
    require('fs').writeFileSync('.vector-reset-trigger', triggerContent);
    console.log('✅ Created trigger file: .vector-reset-trigger');
    
    // Method 2: Add to git and commit
    execSync('git add .vector-reset-trigger', { cwd: process.cwd() });
    execSync('git commit -m "trigger: vector store reset for main branch re-indexing"', { 
      cwd: process.cwd() 
    });
    console.log('✅ Committed trigger file');
    
    // Method 3: Push to trigger webhook (if configured)
    try {
      execSync('git push origin main', { cwd: process.cwd() });
      console.log('✅ Pushed to origin - should trigger auto-reprocessing');
    } catch (pushError) {
      console.log('⚠️  Push failed - you may need to push manually');
      console.log('💡 Run: git push origin main');
    }
    
    console.log('');
    console.log('🔄 ALTERNATIVE TRIGGERS:');
    
    // Method 4: Try local API call
    console.log('4. Attempting local API trigger...');
    
    try {
      const response = await fetch('http://localhost:3000/api/ai/manual-process-repo-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer development-bypass'
        },
        body: JSON.stringify({
          repoId: 'anatolyZader/vc-3',
          branch: 'main',
          githubOwner: 'anatolyZader',
          repoName: 'vc-3',
          repoUrl: 'https://github.com/anatolyZader/vc-3.git',
          forceFullReindex: true
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ API trigger successful:', result);
      } else {
        console.log('⚠️  API trigger failed - auth required');
      }
    } catch (apiError) {
      console.log('⚠️  API trigger not available');
    }
    
    console.log('');
    console.log('📊 MONITORING RE-INDEX PROGRESS:');
    console.log('1. Check EventStorm server logs for processing activity');
    console.log('2. Monitor Pinecone console for new vector creation');
    console.log('3. Test with chat question after processing completes');
    console.log('4. Verify trace shows "branch": "main" and recent timestamps');
    console.log('');
    console.log('⏱️  EXPECTED TIMELINE:');
    console.log('- Index creation: 1-2 minutes');
    console.log('- Repository processing: 5-15 minutes');
    console.log('- Vector embedding: 10-30 minutes');
    console.log('- Full availability: 15-45 minutes');
    
  } catch (error) {
    console.error('❌ Error during reindex trigger:', error.message);
    console.log('');
    console.log('🛠️  MANUAL STEPS IF SCRIPT FAILS:');
    console.log('1. Delete Pinecone index (if not done)');
    console.log('2. Make any small commit: echo "# refresh" >> README.md');
    console.log('3. Commit: git add . && git commit -m "trigger reindex"');
    console.log('4. Push: git push origin main');
    console.log('5. Wait for system to rebuild index from main branch');
  }
}

triggerFullReindex();
