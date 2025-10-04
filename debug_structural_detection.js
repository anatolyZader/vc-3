// debug_structural_detection.js - Debug structural file detection
"use strict";

const ChangeAnalyzer = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/processors/changeAnalyzer');

async function debugStructuralDetection() {
  console.log('🔍 DEBUGGING: Structural file detection\n');
  
  const analyzer = new ChangeAnalyzer();
  
  const testFiles = [
    'package.json',
    'package-lock.json', 
    'webpack.config.js',
    'src/config/database.js',
    'src/models/User.js',
    '.env.example',
    '.env',
    'README.md'
  ];
  
  for (const file of testFiles) {
    const isStructural = analyzer._isStructuralFile(file);
    const isConfig = analyzer._isConfigurationFile(file);
    const category = analyzer._categorizeFile(file);
    
    console.log(`File: ${file}`);
    console.log(`  - Structural: ${isStructural}`);
    console.log(`  - Configuration: ${isConfig}`);  
    console.log(`  - Category: ${category}`);
    console.log('');
  }
}

debugStructuralDetection().catch(console.error);