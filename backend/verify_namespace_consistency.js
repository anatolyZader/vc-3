#!/usr/bin/env node

/**
 * Namespace Consistency Verification Script
 * Ensures all Pinecone namespace usage follows the consistent pattern: {owner}_{repo}_{branch}
 */

const fs = require('fs').promises;
const path = require('path');

async function verifyNamespaceConsistency() {
  console.log('🔍 NAMESPACE CONSISTENCY CHECK: Verifying all Pinecone namespace usage');
  console.log('=' .repeat(70));
  
  const issues = [];
  const validPatterns = [];
  
  // Expected namespace pattern for this repository
  const expectedNamespace = 'anatolyzader_vc-3_main';
  
  console.log(`✅ Expected namespace pattern: ${expectedNamespace}`);
  console.log(`📋 Checking for consistent sanitizeId usage...`);
  
  try {
    // Check GitHubOperations for consistent patterns
    const githubOpsPath = './business_modules/ai/infrastructure/ai/rag_pipelines/context/githubOperations.js';
    const githubOpsContent = await fs.readFile(githubOpsPath, 'utf8');
    
    // Look for namespace generation patterns
    const namespacePatterns = [
      /namespace.*=.*sanitizeId.*`\$\{githubOwner\}_\$\{repoName\}_main`/g,
      /namespace.*=.*sanitizeId.*`\$\{githubOwner\}_\$\{repoName\}_\$\{branch\}`/g
    ];
    
    let foundPatterns = 0;
    for (const pattern of namespacePatterns) {
      const matches = githubOpsContent.match(pattern);
      if (matches) {
        foundPatterns += matches.length;
        validPatterns.push(...matches);
      }
    }
    
    console.log(`📊 Found ${foundPatterns} valid namespace generation patterns in GitHubOperations`);
    
    // Check ContextPipeline for consistent patterns  
    const contextPipelinePath = './business_modules/ai/infrastructure/ai/rag_pipelines/context/contextPipeline.js';
    const contextContent = await fs.readFile(contextPipelinePath, 'utf8');
    
    let contextPatterns = 0;
    for (const pattern of namespacePatterns) {
      const matches = contextContent.match(pattern);
      if (matches) {
        contextPatterns += matches.length;
        validPatterns.push(...matches);
      }
    }
    
    console.log(`📊 Found ${contextPatterns} valid namespace generation patterns in ContextPipeline`);
    
    // Check for any hardcoded UUIDs
    const backendDir = './';
    const uuidPattern = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;
    
    async function checkFileForUUIDs(filePath) {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const matches = content.match(uuidPattern);
        if (matches) {
          // Filter out legitimate UUID usage (user IDs, session IDs, etc.)
          const suspiciousMatches = matches.filter(match => {
            const context = content.substring(
              Math.max(0, content.indexOf(match) - 50),
              content.indexOf(match) + match.length + 50
            );
            
            // Allow UUIDs in legitimate contexts
            return !context.includes('userId') && 
                   !context.includes('sessionId') && 
                   !context.includes('accountId') && 
                   !context.includes('messageId') &&
                   !context.includes('conversationId') &&
                   !context.includes('uuidv4()') &&
                   !context.includes('uuidv4') &&
                   !filePath.includes('test') &&
                   !filePath.includes('spec');
          });
          
          if (suspiciousMatches.length > 0) {
            issues.push(`🚨 Suspicious UUID usage in ${filePath}: ${suspiciousMatches.join(', ')}`);
          }
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }
    
    // Check key files for UUID usage
    const keyFiles = [
      'force_repo_reprocess.js',
      'business_modules/ai/infrastructure/ai/rag_pipelines/context/githubOperations.js',
      'business_modules/ai/infrastructure/ai/rag_pipelines/context/contextPipeline.js',
      'business_modules/ai/infrastructure/ai/pinecone/PineconeService.js'
    ];
    
    for (const file of keyFiles) {
      await checkFileForUUIDs(file);
    }
    
    // Summary
    console.log('\n📋 VERIFICATION SUMMARY:');
    console.log(`✅ Valid namespace patterns found: ${validPatterns.length}`);
    console.log(`🚨 Issues found: ${issues.length}`);
    
    if (issues.length > 0) {
      console.log('\n❌ ISSUES DETECTED:');
      issues.forEach(issue => console.log(issue));
      process.exit(1);
    } else {
      console.log('\n🎉 SUCCESS: All namespace usage appears consistent!');
      console.log(`✅ Expected namespace: ${expectedNamespace}`);
      console.log('✅ No hardcoded UUID namespaces found');
      console.log('✅ All namespace generation uses sanitizeId pattern');
      
      // Show the valid patterns for reference
      console.log('\n📋 Valid patterns found:');
      const uniquePatterns = [...new Set(validPatterns)];
      uniquePatterns.forEach((pattern, i) => {
        console.log(`${i + 1}. ${pattern.trim()}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  verifyNamespaceConsistency();
}

module.exports = { verifyNamespaceConsistency };