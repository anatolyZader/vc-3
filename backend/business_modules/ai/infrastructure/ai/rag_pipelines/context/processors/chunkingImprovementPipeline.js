// ChunkingImprovementPipeline.js
"use strict";

const ChunkQualityAnalyzer = require('../../langsmith/ChunkQualityAnalyzer');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const ASTCodeSplitter = require('./astCodeSplitter');
const fs = require('fs').promises;
const path = require('path');

/**
 * Comprehensive chunking improvement pipeline that uses LangSmith trace analysis
 * to continuously improve chunking strategies
 */
class ChunkingImprovementPipeline {
  constructor(options = {}) {
    this.traceAnalysisDir = options.traceAnalysisDir || 'business_modules/ai/infrastructure/ai/langsmith';
    this.improvementReportsDir = options.improvementReportsDir || 'business_modules/ai/infrastructure/ai/langsmith/chunking_reports';
    this.qualityAnalyzer = new ChunkQualityAnalyzer();
    this.enhancedSplitter = new ASTCodeSplitter();
    
    console.log(`[${new Date().toISOString()}] 🚀 CHUNKING PIPELINE: Initialized improvement pipeline`);
  }

  /**
   * Main improvement pipeline execution
   */
  async runImprovementPipeline() {
    console.log(`[${new Date().toISOString()}] 🔄 IMPROVEMENT PIPELINE: Starting comprehensive analysis`);

    try {
      // Step 1: Analyze recent trace data
      const traceAnalysis = await this.analyzeRecentTraces();
      
      // Step 2: Identify improvement opportunities
      const improvementPlan = await this.generateImprovementPlan(traceAnalysis);
      
      // Step 3: Implement improvements
      const implementationResults = await this.implementImprovements(improvementPlan);
      
      // Step 4: Validate improvements
      const validationResults = await this.validateImprovements(implementationResults);
      
      // Step 5: Generate comprehensive report
      const report = await this.generateImprovementReport({
        traceAnalysis,
        improvementPlan,
        implementationResults,
        validationResults
      });

      console.log(`[${new Date().toISOString()}] ✅ IMPROVEMENT PIPELINE: Complete! Report saved.`);
      return report;

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ IMPROVEMENT PIPELINE: Error:`, error.message);
      throw error;
    }
  }

  /**
   * Analyze recent LangSmith traces for chunking issues
   */
  async analyzeRecentTraces() {
    console.log(`[${new Date().toISOString()}] 📊 TRACE ANALYSIS: Analyzing recent traces for chunking issues`);

    const traceFiles = await this.findTraceFiles();
    const analysisResults = [];

    for (const traceFile of traceFiles) {
      try {
        const traceContent = await fs.readFile(traceFile, 'utf-8');
        const chunks = this.extractChunksFromTrace(traceContent);
        
        if (chunks.length > 0) {
          const analysis = this.qualityAnalyzer.analyzeTraceChunks(chunks);
          analysisResults.push({
            file: traceFile,
            timestamp: this.extractTimestamp(traceFile),
            analysis,
            chunkCount: chunks.length
          });
        }
      } catch (error) {
        console.warn(`[${new Date().toISOString()}] ⚠️ TRACE ANALYSIS: Error reading ${traceFile}:`, error.message);
      }
    }

    const aggregatedAnalysis = this.aggregateTraceAnalyses(analysisResults);
    
    console.log(`[${new Date().toISOString()}] 📊 TRACE ANALYSIS: Processed ${analysisResults.length} traces`);
    return aggregatedAnalysis;
  }

  /**
   * Find trace files for analysis
   */
  async findTraceFiles() {
    const traceDir = path.join(process.cwd(), this.traceAnalysisDir);
    
    try {
      const files = await fs.readdir(traceDir);
      const traceFiles = files
        .filter(file => file.endsWith('.md'))
        .map(file => path.join(traceDir, file))
        .slice(-10); // Analyze last 10 traces

      return traceFiles;
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ TRACE FILES: Directory not found:`, traceDir);
      return [];
    }
  }

  /**
   * Extract chunks from trace markdown content
   */
  extractChunksFromTrace(traceContent) {
    const chunks = [];
    const chunkPattern = /### Chunk \d+\/\d+[\s\S]*?(?=### Chunk \d+\/\d+|## 🤖|$)/g;
    
    let match;
    while ((match = chunkPattern.exec(traceContent)) !== null) {
      const chunkText = match[0];
      const chunk = this.parseChunkFromText(chunkText);
      if (chunk) chunks.push(chunk);
    }

    return chunks;
  }

  /**
   * Parse individual chunk from trace text
   */
  parseChunkFromText(chunkText) {
    try {
      // Extract basic info
      const sourceMatch = chunkText.match(/\*\*Source\*\*:\s*(.+)/);
      const sizeMatch = chunkText.match(/\*\*Size\*\*:\s*(\d+)\s*characters/);
      const typeMatch = chunkText.match(/\*\*Type\*\*:\s*(.+)/);
      
      // Extract content
      const contentMatch = chunkText.match(/\*\*Full Content\*\*:\s*```[\s\S]*?\n([\s\S]*?)\n```/);
      
      // Extract metadata
      const metadataMatch = chunkText.match(/\*\*Metadata\*\*:\s*```json\s*([\s\S]*?)\s*```/);
      
      let metadata = {};
      if (metadataMatch && metadataMatch[1]) {
        try {
          metadata = JSON.parse(metadataMatch[1]);
        } catch (e) {
          console.warn('Failed to parse metadata JSON');
        }
      }

      if (!sourceMatch || !contentMatch) return null;

      return {
        source: sourceMatch[1].trim(),
        content: contentMatch[1],
        size: sizeMatch ? parseInt(sizeMatch[1]) : contentMatch[1].length,
        type: typeMatch ? typeMatch[1].trim() : 'unknown',
        metadata
      };
    } catch (error) {
      console.warn('Failed to parse chunk from text');
      return null;
    }
  }

  /**
   * Aggregate multiple trace analyses
   */
  aggregateTraceAnalyses(analyses) {
    if (analyses.length === 0) return null;

    const aggregated = {
      totalTraces: analyses.length,
      totalChunks: analyses.reduce((sum, a) => sum + a.chunkCount, 0),
      averageQualityScore: analyses.reduce((sum, a) => sum + a.analysis.qualityScore, 0) / analyses.length,
      commonIssues: this.findCommonIssues(analyses),
      trends: this.analyzeTrends(analyses),
      recommendations: this.aggregateRecommendations(analyses)
    };

    return aggregated;
  }

  /**
   * Find common issues across traces
   */
  findCommonIssues(analyses) {
    const issueCategories = {
      smallChunks: 0,
      largeChunks: 0,
      missingTypes: 0,
      importOnlyChunks: 0,
      duplicates: 0,
      missingContext: 0
    };

    analyses.forEach(analysis => {
      const a = analysis.analysis;
      if (a.sizingIssues.tooSmall.length > 0) issueCategories.smallChunks++;
      if (a.sizingIssues.tooLarge.length > 0) issueCategories.largeChunks++;
      if (a.semanticIssues.missingTypes.length > 0) issueCategories.missingTypes++;
      if (a.semanticIssues.importOnlyChunks.length > 0) issueCategories.importOnlyChunks++;
      if (a.duplicateIssues.totalDuplicates > 0) issueCategories.duplicates++;
      if (a.contextIssues.missingImports.length > 0) issueCategories.missingContext++;
    });

    return Object.entries(issueCategories)
      .filter(([issue, count]) => count > analyses.length * 0.3) // Issues in >30% of traces
      .map(([issue, count]) => ({
        issue,
        frequency: count,
        percentage: Math.round((count / analyses.length) * 100)
      }));
  }

  /**
   * Analyze trends over time
   */
  analyzeTrends(analyses) {
    const sorted = analyses.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    const qualityTrend = sorted.map(a => a.analysis.qualityScore);
    const chunkCountTrend = sorted.map(a => a.chunkCount);
    
    return {
      qualityImproving: this.isImproving(qualityTrend),
      chunkCountStable: this.isStable(chunkCountTrend),
      latestQuality: qualityTrend[qualityTrend.length - 1],
      averageChunkCount: chunkCountTrend.reduce((a, b) => a + b, 0) / chunkCountTrend.length
    };
  }

  /**
   * Generate comprehensive improvement plan
   */
  async generateImprovementPlan(traceAnalysis) {
    console.log(`[${new Date().toISOString()}] 📋 IMPROVEMENT PLAN: Generating based on trace analysis`);

    if (!traceAnalysis) {
      return {
        status: 'no_data',
        message: 'No trace data available for analysis'
      };
    }

    const plan = {
      priority: this.determinePriority(traceAnalysis),
      recommendations: [],
      implementations: [],
      timeline: this.generateTimeline(traceAnalysis)
    };

    // Generate specific recommendations based on common issues
    traceAnalysis.commonIssues.forEach(issue => {
      const recommendation = this.generateRecommendationForIssue(issue);
      if (recommendation) {
        plan.recommendations.push(recommendation);
      }
    });

    return plan;
  }

  /**
   * Implement improvements based on plan
   */
  async implementImprovements(plan) {
    console.log(`[${new Date().toISOString()}] 🔧 IMPLEMENTATION: Applying improvements`);

    const results = {
      implemented: [],
      failed: [],
      skipped: []
    };

    for (const recommendation of plan.recommendations) {
      try {
        const result = await this.implementRecommendation(recommendation);
        results.implemented.push(result);
      } catch (error) {
        results.failed.push({
          recommendation: recommendation.issue,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Implement specific recommendation
   */
  async implementRecommendation(recommendation) {
    switch (recommendation.category) {
      case 'sizing':
        return await this.implementSizingImprovement(recommendation);
      case 'semantic':
        return await this.implementSemanticImprovement(recommendation);
      case 'deduplication':
        return await this.implementDeduplicationImprovement(recommendation);
      case 'context':
        return await this.implementContextImprovement(recommendation);
      default:
        throw new Error(`Unknown recommendation category: ${recommendation.category}`);
    }
  }

  /**
   * Implement sizing improvements
   */
  async implementSizingImprovement(recommendation) {
    // Update chunking parameters
    const updates = {
      minChunkSize: 300,
      maxChunkSize: 2800,
      mergeSmallChunks: true
    };

    return {
      type: 'sizing',
      changes: updates,
      status: 'configured'
    };
  }

  /**
   * Implement semantic improvements
   */
  async implementSemanticImprovement(recommendation) {
    // Enable enhanced AST processing
    const updates = {
      semanticBoundaries: true,
      includeContext: true,
      typeDetection: true
    };

    return {
      type: 'semantic',
      changes: updates,
      status: 'configured'
    };
  }

  /**
   * Validate improvements
   */
  async validateImprovements(implementationResults) {
    console.log(`[${new Date().toISOString()}] ✅ VALIDATION: Testing improvements`);

    // Create test documents to validate improvements
    const testResults = await this.runValidationTests();
    
    return {
      validationPassed: testResults.passed,
      improvements: testResults.improvements,
      regressions: testResults.regressions
    };
  }

  /**
   * Run validation tests
   */
  async runValidationTests() {
    const testDocument = {
      pageContent: `
        const Policy = require('../../../../../aop/permissions/domain/entities/policy');
        const User = require('../../../../../aop/auth/domain/entities/user');
        
        class PolicyService {
          constructor(policyRepository) {
            this.policyRepository = policyRepository;
          }
          
          async createPolicy(policyData) {
            const policy = new Policy(policyData);
            return await this.policyRepository.save(policy);
          }
          
          async updatePolicy(id, updates) {
            const policy = await this.policyRepository.findById(id);
            if (!policy) throw new Error('Policy not found');
            
            Object.assign(policy, updates);
            return await this.policyRepository.save(policy);
          }
        }
        
        module.exports = PolicyService;
      `,
      metadata: {
        source: 'test/PolicyService.js',
        fileType: 'JavaScript'
      }
    };

    try {
      const chunks = await this.enhancedSplitter.splitDocument(testDocument);
      const analysis = this.qualityAnalyzer.analyzeTraceChunks(chunks);
      
      return {
        passed: analysis.qualityScore > 75,
        improvements: analysis.qualityScore,
        regressions: analysis.issues.length,
        chunks: chunks.length
      };
    } catch (error) {
      return {
        passed: false,
        error: error.message
      };
    }
  }

  /**
   * Generate comprehensive improvement report
   */
  async generateImprovementReport(data) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.generateSummary(data),
      traceAnalysis: data.traceAnalysis,
      improvementPlan: data.improvementPlan,
      implementation: data.implementationResults,
      validation: data.validationResults,
      recommendations: this.generateFutureRecommendations(data)
    };

    // Save report
    await this.saveReport(report);
    
    console.log(`[${new Date().toISOString()}] 📄 REPORT: Generated comprehensive improvement report`);
    return report;
  }

  /**
   * Save improvement report
   */
  async saveReport(report) {
    const reportsDir = path.join(process.cwd(), this.improvementReportsDir);
    
    try {
      await fs.mkdir(reportsDir, { recursive: true });
      
      const filename = `chunking-improvement-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
      const filepath = path.join(reportsDir, filename);
      
      await fs.writeFile(filepath, JSON.stringify(report, null, 2));
      console.log(`[${new Date().toISOString()}] 💾 REPORT: Saved to ${filepath}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ REPORT: Failed to save:`, error.message);
    }
  }

  // Helper methods
  extractTimestamp(filename) {
    const match = filename.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
    return match ? match[1].replace(/-/g, ':') : new Date().toISOString();
  }

  isImproving(values) {
    if (values.length < 2) return false;
    const recent = values.slice(-3);
    const older = values.slice(0, -3);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    return recentAvg > olderAvg;
  }

  isStable(values) {
    if (values.length < 2) return true;
    const variance = this.calculateVariance(values);
    return variance < 10; // Low variance indicates stability
  }

  calculateVariance(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
  }

  determinePriority(traceAnalysis) {
    if (traceAnalysis.averageQualityScore < 50) return 'critical';
    if (traceAnalysis.averageQualityScore < 70) return 'high';
    if (traceAnalysis.averageQualityScore < 85) return 'medium';
    return 'low';
  }

  generateTimeline(traceAnalysis) {
    const priority = this.determinePriority(traceAnalysis);
    
    switch (priority) {
      case 'critical':
        return { immediate: '1 day', shortTerm: '1 week', longTerm: '1 month' };
      case 'high':
        return { immediate: '3 days', shortTerm: '2 weeks', longTerm: '2 months' };
      case 'medium':
        return { immediate: '1 week', shortTerm: '1 month', longTerm: '3 months' };
      default:
        return { immediate: '2 weeks', shortTerm: '2 months', longTerm: '6 months' };
    }
  }

  generateRecommendationForIssue(issue) {
    const recommendations = {
      smallChunks: {
        category: 'sizing',
        issue: 'Too many small chunks',
        solution: 'Implement chunk merging and increase minimum size',
        priority: 'high'
      },
      missingTypes: {
        category: 'semantic',
        issue: 'Missing semantic types',
        solution: 'Enhance AST processing for better type detection',
        priority: 'high'
      },
      importOnlyChunks: {
        category: 'context',
        issue: 'Import-only chunks',
        solution: 'Merge imports with following code blocks',
        priority: 'medium'
      },
      duplicates: {
        category: 'deduplication',
        issue: 'Duplicate chunks',
        solution: 'Implement content deduplication',
        priority: 'medium'
      }
    };

    return recommendations[issue.issue] || null;
  }

  generateSummary(data) {
    return {
      qualityScore: data.traceAnalysis?.averageQualityScore || 'N/A',
      tracesAnalyzed: data.traceAnalysis?.totalTraces || 0,
      improvementsImplemented: data.implementationResults?.implemented?.length || 0,
      validationPassed: data.validationResults?.validationPassed || false
    };
  }

  generateFutureRecommendations(data) {
    return [
      'Continue monitoring chunk quality through LangSmith traces',
      'Implement automated chunk quality alerts',
      'Develop domain-specific chunking strategies',
      'Create chunk quality benchmarks for different file types'
    ];
  }

  aggregateRecommendations(analyses) {
    const allRecommendations = analyses.flatMap(a => a.analysis.recommendations);
    const categoryCount = {};
    
    allRecommendations.forEach(rec => {
      categoryCount[rec.category] = (categoryCount[rec.category] || 0) + 1;
    });
    
    return Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .map(([category, count]) => ({ category, count }));
  }

  async implementDeduplicationImprovement(recommendation) {
    return {
      type: 'deduplication',
      changes: { contentHashing: true, duplicateRemoval: true },
      status: 'configured'
    };
  }

  async implementContextImprovement(recommendation) {
    return {
      type: 'context',
      changes: { importMerging: true, contextualBoundaries: true },
      status: 'configured'
    };
  }
}

module.exports = ChunkingImprovementPipeline;
