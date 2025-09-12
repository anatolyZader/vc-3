// enhanced_chunking_monitor.js
"use strict";

const ChunkingImprovementPipeline = require('./business_modules/ai/infrastructure/ai/rag_pipelines/data_preparation/processors/ChunkingImprovementPipeline');
const fs = require('fs').promises;
const path = require('path');

/**
 * Production monitoring service for enhanced chunking quality
 * Automatically analyzes chunk quality and provides improvement recommendations
 */
class EnhancedChunkingMonitor {
  constructor() {
    this.improvementPipeline = new ChunkingImprovementPipeline();
    this.qualityThreshold = 80; // Alert if quality drops below this
    this.monitoringInterval = 60 * 60 * 1000; // Check every hour
    this.alertsEnabled = true;
    
    console.log(`[${new Date().toISOString()}] 🔄 MONITORING: Enhanced chunking quality monitor initialized`);
  }

  /**
   * Start continuous quality monitoring
   */
  async startMonitoring() {
    console.log(`[${new Date().toISOString()}] 📊 MONITOR: Starting continuous quality monitoring (threshold: ${this.qualityThreshold}/100)`);
    
    // Initial quality check
    await this.checkQualityStatus();
    
    // Set up periodic monitoring
    setInterval(async () => {
      try {
        await this.checkQualityStatus();
      } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ MONITOR: Error during quality check:`, error.message);
      }
    }, this.monitoringInterval);
    
    console.log(`[${new Date().toISOString()}] ✅ MONITOR: Continuous monitoring active (checking every ${this.monitoringInterval/1000/60} minutes)`);
  }

  /**
   * Check current chunking quality and generate alerts if needed
   */
  async checkQualityStatus() {
    try {
      console.log(`[${new Date().toISOString()}] 🔍 MONITOR: Checking chunking quality status...`);
      
      // Run improvement pipeline analysis
      const analysisResult = await this.improvementPipeline.runImprovementPipeline();
      
      if (analysisResult.overallQualityScore) {
        const qualityScore = analysisResult.overallQualityScore;
        
        console.log(`[${new Date().toISOString()}] 📊 QUALITY STATUS: Current score ${qualityScore}/100`);
        
        if (qualityScore < this.qualityThreshold) {
          await this.triggerQualityAlert(qualityScore, analysisResult);
        } else {
          console.log(`[${new Date().toISOString()}] ✅ QUALITY: Above threshold (${qualityScore}/${this.qualityThreshold})`);
        }
        
        // Log quality metrics for trend analysis
        await this.logQualityMetrics(qualityScore, analysisResult);
      }
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ MONITOR: Quality check failed:`, error.message);
    }
  }

  /**
   * Trigger quality degradation alert
   */
  async triggerQualityAlert(currentScore, analysisData) {
    if (!this.alertsEnabled) return;
    
    const alertMessage = {
      timestamp: new Date().toISOString(),
      alertType: 'QUALITY_DEGRADATION',
      currentScore: currentScore,
      threshold: this.qualityThreshold,
      degradation: this.qualityThreshold - currentScore,
      recommendations: analysisData.recommendations || [],
      tracesAnalyzed: analysisData.tracesAnalyzed || 0
    };
    
    console.log(`[${new Date().toISOString()}] 🚨 QUALITY ALERT: Score dropped to ${currentScore}/100 (threshold: ${this.qualityThreshold})`);
    console.log(`[${new Date().toISOString()}] 💡 TOP RECOMMENDATIONS:`);
    
    if (analysisData.recommendations) {
      analysisData.recommendations.slice(0, 3).forEach((rec, i) => {
        console.log(`[${new Date().toISOString()}]    ${i+1}. ${rec}`);
      });
    }
    
    // Save alert to file for external monitoring
    await this.saveAlert(alertMessage);
  }

  /**
   * Log quality metrics for trend analysis
   */
  async logQualityMetrics(score, analysisData) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      qualityScore: score,
      tracesAnalyzed: analysisData.tracesAnalyzed || 0,
      issuesFound: analysisData.issues?.length || 0,
      recommendationsCount: analysisData.recommendations?.length || 0
    };
    
    const logFile = path.join(__dirname, 'chunking_quality_log.json');
    
    try {
      let existingLogs = [];
      try {
        const data = await fs.readFile(logFile, 'utf8');
        existingLogs = JSON.parse(data);
      } catch (e) {
        // File doesn't exist yet
      }
      
      existingLogs.push(logEntry);
      
      // Keep only last 100 entries
      if (existingLogs.length > 100) {
        existingLogs = existingLogs.slice(-100);
      }
      
      await fs.writeFile(logFile, JSON.stringify(existingLogs, null, 2));
      
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ MONITOR: Could not save quality log:`, error.message);
    }
  }

  /**
   * Save quality alert to file
   */
  async saveAlert(alertData) {
    const alertFile = path.join(__dirname, 'chunking_quality_alerts.json');
    
    try {
      let existingAlerts = [];
      try {
        const data = await fs.readFile(alertFile, 'utf8');
        existingAlerts = JSON.parse(data);
      } catch (e) {
        // File doesn't exist yet
      }
      
      existingAlerts.push(alertData);
      
      // Keep only last 50 alerts
      if (existingAlerts.length > 50) {
        existingAlerts = existingAlerts.slice(-50);
      }
      
      await fs.writeFile(alertFile, JSON.stringify(existingAlerts, null, 2));
      
      console.log(`[${new Date().toISOString()}] 💾 ALERT: Saved to ${alertFile}`);
      
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ MONITOR: Could not save alert:`, error.message);
    }
  }

  /**
   * Get quality trend summary
   */
  async getQualityTrend() {
    const logFile = path.join(__dirname, 'chunking_quality_log.json');
    
    try {
      const data = await fs.readFile(logFile, 'utf8');
      const logs = JSON.parse(data);
      
      if (logs.length === 0) {
        return { message: 'No quality data available yet' };
      }
      
      const recent = logs.slice(-10); // Last 10 entries
      const avgScore = recent.reduce((sum, entry) => sum + entry.qualityScore, 0) / recent.length;
      const trend = recent.length > 1 
        ? recent[recent.length - 1].qualityScore - recent[0].qualityScore
        : 0;
      
      return {
        averageScore: Math.round(avgScore),
        trend: Math.round(trend * 10) / 10,
        entriesAnalyzed: recent.length,
        lastUpdate: recent[recent.length - 1].timestamp
      };
      
    } catch (error) {
      return { error: 'Could not read quality trend data' };
    }
  }

  /**
   * Manual quality check trigger
   */
  async runManualQualityCheck() {
    console.log(`[${new Date().toISOString()}] 🔍 MANUAL: Running manual quality check...`);
    await this.checkQualityStatus();
    
    const trend = await this.getQualityTrend();
    console.log(`[${new Date().toISOString()}] 📈 TREND: ${JSON.stringify(trend, null, 2)}`);
  }
}

// Export for use in production
module.exports = EnhancedChunkingMonitor;

// Command line usage
if (require.main === module) {
  const monitor = new EnhancedChunkingMonitor();
  
  if (process.argv[2] === 'start') {
    monitor.startMonitoring();
  } else if (process.argv[2] === 'check') {
    monitor.runManualQualityCheck();
  } else {
    console.log('Usage: node enhanced_chunking_monitor.js [start|check]');
    console.log('  start - Start continuous monitoring');
    console.log('  check - Run manual quality check');
  }
}
