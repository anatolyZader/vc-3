// verify_horizontal_scaling_deployment.js - Verify horizontal scaling is ready
'use strict';

async function verifyDeployment() {
  console.log('🔍 Verifying Horizontal Scaling Deployment');
  console.log('==========================================');
  
  const checks = [];
  
  try {
    // 1. Check RepoWorkerManager import
    console.log('📦 Checking RepoWorkerManager import...');
    const RepoWorkerManager = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/processors/repoWorkerManager');
    checks.push({ name: 'RepoWorkerManager Import', status: 'PASS', details: 'Module imported successfully' });
    
    // 2. Check repoWorker import
    console.log('📦 Checking repoWorker import...');
    const repoWorker = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/processors/repoWorker');
    checks.push({ name: 'repoWorker Import', status: 'PASS', details: 'Module imported successfully' });
    
    // 3. Check configuration import
    console.log('📦 Checking configuration import...');
    const config = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/processors/horizontalScalingConfig');
    checks.push({ name: 'Configuration Import', status: 'PASS', details: 'Configuration loaded successfully' });
    
    // 4. Check monitor import
    console.log('📦 Checking monitor import...');
    const monitor = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/processors/horizontalScalingMonitor');
    checks.push({ name: 'Monitor Import', status: 'PASS', details: 'Monitor imported successfully' });
    
    // 5. Check ContextPipeline integration
    console.log('📦 Checking ContextPipeline integration...');
    const ContextPipeline = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/contextPipeline');
    const pipeline = new ContextPipeline({
      embeddings: null, // Mock for testing
      eventBus: null,   // Mock for testing
      pineconeLimiter: null
    });
    
    // Verify WorkerManager is initialized
    if (pipeline.workerManager) {
      checks.push({ name: 'ContextPipeline Integration', status: 'PASS', details: 'WorkerManager integrated in ContextPipeline' });
    } else {
      checks.push({ name: 'ContextPipeline Integration', status: 'FAIL', details: 'WorkerManager not found in ContextPipeline' });
    }
    
    // 6. Check environment configuration
    console.log('📦 Checking environment configuration...');
    const envConfig = config.getConfig(process.env.NODE_ENV);
    if (envConfig && envConfig.workers && envConfig.thresholds) {
      checks.push({ name: 'Environment Configuration', status: 'PASS', details: 'Configuration loaded for environment' });
    } else {
      checks.push({ name: 'Environment Configuration', status: 'FAIL', details: 'Invalid configuration' });
    }
    
    // 7. Check GitHub token availability
    console.log('📦 Checking GitHub token...');
    if (process.env.GITHUB_TOKEN) {
      checks.push({ name: 'GitHub Token', status: 'PASS', details: 'GitHub token available' });
    } else {
      checks.push({ name: 'GitHub Token', status: 'WARN', details: 'GitHub token not set (may use rate-limited requests)' });
    }
    
    // 8. Test WorkerManager instantiation
    console.log('📦 Testing WorkerManager instantiation...');
    const workerManager = new RepoWorkerManager({
      maxWorkers: 2,
      maxRequestsPerMinute: 100
    });
    const status = workerManager.getStatus();
    if (status && typeof status === 'object') {
      checks.push({ name: 'WorkerManager Instantiation', status: 'PASS', details: 'WorkerManager created and status accessible' });
    } else {
      checks.push({ name: 'WorkerManager Instantiation', status: 'FAIL', details: 'WorkerManager status not accessible' });
    }
    
  } catch (error) {
    checks.push({ 
      name: 'Import Error', 
      status: 'FAIL', 
      details: error.message 
    });
  }
  
  // Display results
  console.log('\n📊 Deployment Verification Results:');
  console.log('==================================');
  
  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;
  
  checks.forEach((check, index) => {
    const icon = check.status === 'PASS' ? '✅' : check.status === 'WARN' ? '⚠️' : '❌';
    console.log(`${icon} ${index + 1}. ${check.name}: ${check.status}`);
    console.log(`   ${check.details}`);
    
    if (check.status === 'PASS') passCount++;
    else if (check.status === 'WARN') warnCount++;
    else failCount++;
  });
  
  console.log('\n📈 Summary:');
  console.log(`✅ Passed: ${passCount}`);
  console.log(`⚠️  Warnings: ${warnCount}`);
  console.log(`❌ Failed: ${failCount}`);
  
  // Overall status
  if (failCount === 0) {
    console.log('\n🎉 DEPLOYMENT VERIFICATION SUCCESSFUL!');
    console.log('🚀 Horizontal scaling is ready for production use.');
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Process a large repository (>50 files) to test scaling');
    console.log('2. Monitor logs for "HORIZONTAL SCALING" messages');
    console.log('3. Check worker performance in production');
    console.log('4. Verify Pinecone storage coordination');
    
    return true;
  } else {
    console.log('\n⚠️  DEPLOYMENT VERIFICATION INCOMPLETE');
    console.log(`❌ ${failCount} critical issues found. Please address before production use.`);
    return false;
  }
}

// Run verification
if (require.main === module) {
  verifyDeployment()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Verification failed:', error.message);
      process.exit(1);
    });
}

module.exports = { verifyDeployment };