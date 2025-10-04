// test_change_analyzer.js - Test the Smart Processing Decision System
"use strict";

const ChangeAnalyzer = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/processors/changeAnalyzer');

/**
 * Test the ChangeAnalyzer with various scenarios
 */
async function testChangeAnalyzer() {
  console.log(`[${new Date().toISOString()}] 🧪 TESTING: ChangeAnalyzer Smart Processing Decisions\n`);
  
  // Initialize the analyzer
  const analyzer = new ChangeAnalyzer({
    maxFilesForIncremental: 20,
    maxStructuralChangesForIncremental: 3,
    minConfidenceForIncremental: 0.7
  });

  // Test scenarios
  const testCases = [
    {
      name: "Documentation Only Changes",
      description: "Only README and documentation files changed",
      changedFiles: [
        "README.md",
        "docs/api.md", 
        "CHANGELOG.md"
      ],
      expectedStrategy: "skip",
      repoCharacteristics: { type: 'backend', primaryLanguage: 'JavaScript', estimatedSize: 5000 }
    },
    {
      name: "Small Code Changes", 
      description: "Few JavaScript files modified, no structural changes",
      changedFiles: [
        "src/components/Header.js",
        "src/utils/helpers.js",
        "src/styles/main.css"
      ],
      expectedStrategy: "incremental",
      repoCharacteristics: { type: 'frontend', primaryLanguage: 'JavaScript', estimatedSize: 2000 }
    },
    {
      name: "Structural Changes",
      description: "Package.json and configuration files changed",
      changedFiles: [
        "package.json",
        "package-lock.json",
        "src/config/database.js",
        "src/models/User.js",
        "webpack.config.js"
      ],
      expectedStrategy: "full",
      repoCharacteristics: { type: 'backend', primaryLanguage: 'JavaScript', estimatedSize: 8000 }
    },
    {
      name: "Large Changeset",
      description: "Many files changed across the codebase",
      changedFiles: Array.from({ length: 35 }, (_, i) => `src/modules/module_${i + 1}.js`),
      expectedStrategy: "full",
      repoCharacteristics: { type: 'backend', primaryLanguage: 'JavaScript', estimatedSize: 15000 }
    },
    {
      name: "Mixed Changes with Config",
      description: "Code and configuration changes combined",
      changedFiles: [
        "backend/app.js",
        "backend/config/infraConfig.json",
        "backend/models/Repository.js",
        "backend/services/AIService.js",
        ".env.example",
        "README.md"
      ],
      expectedStrategy: "full",
      repoCharacteristics: { type: 'backend', primaryLanguage: 'JavaScript', estimatedSize: 12000 }
    }
  ];

  // Run tests
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TEST ${i + 1}: ${testCase.name}`);
    console.log(`Description: ${testCase.description}`);
    console.log(`Changed Files (${testCase.changedFiles.length}):`, testCase.changedFiles.slice(0, 5).join(', ') + (testCase.changedFiles.length > 5 ? '...' : ''));
    console.log(`Expected Strategy: ${testCase.expectedStrategy.toUpperCase()}`);
    console.log(`${'='.repeat(60)}`);

    try {
      const recommendation = await analyzer.analyzeChangesAndRecommendStrategy({
        oldCommitHash: 'abc12345',
        newCommitHash: 'def67890',
        changedFiles: testCase.changedFiles,
        githubOwner: 'testOwner',
        repoName: 'testRepo',
        repoCharacteristics: testCase.repoCharacteristics
      });

      console.log(`\n📊 ANALYSIS RESULTS:`);
      console.log(`   Strategy: ${recommendation.strategy.toUpperCase()}`);
      console.log(`   Confidence: ${(recommendation.confidence * 100).toFixed(1)}%`);
      console.log(`   Reasoning: ${recommendation.reasoning}`);
      
      // Check if recommendation matches expectation
      const matches = recommendation.strategy === testCase.expectedStrategy;
      console.log(`   Expected: ${testCase.expectedStrategy.toUpperCase()}`);
      console.log(`   Result: ${matches ? '✅ MATCH' : '❌ MISMATCH'}`);

      if (recommendation.details) {
        console.log(`\n📋 DETAILED ANALYSIS:`);
        if (recommendation.details.changeAnalysis) {
          const analysis = recommendation.details.changeAnalysis;
          console.log(`   Total Files: ${analysis.totalFiles}`);
          console.log(`   Code Files: ${analysis.filesByType.code?.length || 0}`);
          console.log(`   Structural Files: ${analysis.filesByType.structural?.length || 0}`);
          console.log(`   Documentation Files: ${analysis.filesByType.documentation?.length || 0}`);
          console.log(`   Change Complexity: ${analysis.changeComplexity?.toFixed(2) || 'N/A'}`);
          console.log(`   Has Structural Changes: ${analysis.hasStructuralChanges ? 'Yes' : 'No'}`);
          console.log(`   Has Config Changes: ${analysis.hasConfigurationChanges ? 'Yes' : 'No'}`);
        }
        
        if (recommendation.details.impactAnalysis) {
          const impact = recommendation.details.impactAnalysis;
          console.log(`   Processing Load: ${impact.processingLoad?.toFixed(2) || 'N/A'}`);
          console.log(`   Resource Requirements: ${impact.resourceRequirements || 'N/A'}`);
          console.log(`   Risk Factors: ${impact.riskFactors?.join(', ') || 'None'}`);
          console.log(`   Benefits: ${impact.benefits?.join(', ') || 'None'}`);
        }
      }

    } catch (error) {
      console.error(`❌ TEST ERROR:`, error.message);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎯 TESTING COMPLETE`);
  console.log(`${'='.repeat(60)}\n`);
}

// Run the test if this file is executed directly
if (require.main === module) {
  testChangeAnalyzer().catch(console.error);
}

module.exports = { testChangeAnalyzer };