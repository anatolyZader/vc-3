// Monitoring and Analytics for Production RAG Pipeline
'use strict';

class RAGAnalytics {
  constructor({ eventBus, aiPersistAdapter }) {
    this.eventBus = eventBus;
    this.aiPersistAdapter = aiPersistAdapter;
    this.metrics = new Map();
    this.performanceData = [];
    this.errorPatterns = new Map();
  }

  // 1. Performance Monitoring
  startOperation(operationId, type, metadata = {}) {
    const operation = {
      id: operationId,
      type: type, // 'query_processing', 'retrieval', 'generation', 'full_pipeline'
      startTime: Date.now(),
      metadata: metadata,
      status: 'in_progress'
    };
    
    this.metrics.set(operationId, operation);
    console.log(`📊 ANALYTICS: Started ${type} operation ${operationId}`);
    
    return operation;
  }

  endOperation(operationId, result = {}) {
    const operation = this.metrics.get(operationId);
    if (!operation) {
      console.warn(`📊 ANALYTICS: Operation ${operationId} not found`);
      return;
    }

    operation.endTime = Date.now();
    operation.duration = operation.endTime - operation.startTime;
    operation.status = result.success !== false ? 'success' : 'failed';
    operation.result = result;

    this.performanceData.push({ ...operation });
    console.log(`📊 ANALYTICS: Completed ${operation.type} operation ${operationId} in ${operation.duration}ms`);

    // Clean up old metrics (keep only recent ones in memory)
    if (this.performanceData.length > 1000) {
      this.performanceData = this.performanceData.slice(-500);
    }

    this.emitPerformanceMetric(operation);
    return operation;
  }

  // 2. Quality Metrics Tracking
  trackQueryMetrics(processedQuery, retrievalResults, responseResult) {
    const metrics = {
      timestamp: new Date().toISOString(),
      userId: processedQuery.userId,
      conversationId: processedQuery.conversationId,
      
      // Query Analysis
      query: {
        originalQuery: processedQuery.originalQuery,
        queryLength: processedQuery.originalQuery.length,
        category: processedQuery.classification?.primary_category,
        technicalLevel: processedQuery.classification?.technical_level,
        expandedQueries: processedQuery.expansion?.searchQueries?.length || 0
      },
      
      // Retrieval Metrics
      retrieval: {
        totalDocumentsSearched: retrievalResults?.totalSearched || 0,
        documentsRetrieved: retrievalResults?.documents?.length || 0,
        averageRelevanceScore: this.calculateAverageScore(retrievalResults?.documents),
        sourceTypeDistribution: this.analyzeSourceDistribution(retrievalResults?.documents),
        searchLatency: retrievalResults?.searchLatency || 0
      },
      
      // Response Metrics
      response: {
        responseLength: responseResult?.response?.length || 0,
        generationLatency: responseResult?.generationLatency || 0,
        qualityScore: responseResult?.responseMetadata?.qualityScore || 0,
        sourceCitations: responseResult?.responseMetadata?.sourcesReferenced || 0,
        success: responseResult?.success || false
      },
      
      // Context Metrics
      context: {
        contextSize: responseResult?.contextUsed?.estimatedTokens || 0,
        selectedDocuments: responseResult?.contextUsed?.selectedDocuments || 0,
        contextStrategy: responseResult?.contextUsed?.contextStrategy || 'unknown'
      }
    };

    this.recordMetrics('query_pipeline', metrics);
    return metrics;
  }

  // 3. Error Pattern Analysis
  trackError(error, context = {}) {
    const errorSignature = this.createErrorSignature(error);
    const existingPattern = this.errorPatterns.get(errorSignature) || {
      signature: errorSignature,
      count: 0,
      firstSeen: new Date(),
      lastSeen: new Date(),
      contexts: [],
      errorMessage: error.message
    };

    existingPattern.count++;
    existingPattern.lastSeen = new Date();
    existingPattern.contexts.push({
      timestamp: new Date(),
      ...context
    });

    // Keep only recent contexts to avoid memory bloat
    if (existingPattern.contexts.length > 10) {
      existingPattern.contexts = existingPattern.contexts.slice(-5);
    }

    this.errorPatterns.set(errorSignature, existingPattern);
    
    console.log(`🚨 ANALYTICS: Error pattern ${errorSignature} occurred (count: ${existingPattern.count})`);
    
    // Alert on recurring errors
    if (existingPattern.count === 5 || existingPattern.count % 20 === 0) {
      this.emitErrorAlert(existingPattern);
    }

    return existingPattern;
  }

  // 4. User Satisfaction Tracking
  async trackUserFeedback(conversationId, feedback) {
    const feedbackData = {
      conversationId,
      timestamp: new Date().toISOString(),
      feedback: feedback, // { helpful: boolean, rating: number, comment: string }
      context: await this.getConversationContext(conversationId)
    };

    this.recordMetrics('user_feedback', feedbackData);
    
    // Update satisfaction trends
    this.updateSatisfactionTrends(feedback);
    
    console.log(`👍 ANALYTICS: User feedback recorded for conversation ${conversationId}`);
    return feedbackData;
  }

  // 5. Source Effectiveness Analysis
  analyzeSourceEffectiveness(timeWindow = 24 * 60 * 60 * 1000) { // 24 hours default
    const cutoffTime = Date.now() - timeWindow;
    const recentPerformance = this.performanceData.filter(op => op.startTime > cutoffTime);
    
    const sourceStats = new Map();
    
    recentPerformance.forEach(operation => {
      if (operation.result?.contextUsed?.selectedDocuments) {
        operation.result.contextUsed.selectedDocuments.forEach(doc => {
          const sourceType = doc.metadata?.type || 'unknown';
          const source = doc.metadata?.source || 'unknown';
          
          const key = `${sourceType}:${source}`;
          const stats = sourceStats.get(key) || {
            sourceType,
            source,
            usageCount: 0,
            totalRelevanceScore: 0,
            successfulResponses: 0,
            avgResponseQuality: 0
          };
          
          stats.usageCount++;
          stats.totalRelevanceScore += (doc.relevanceScore || 0);
          
          if (operation.result?.success) {
            stats.successfulResponses++;
          }
          
          if (operation.result?.responseMetadata?.qualityScore) {
            stats.avgResponseQuality += operation.result.responseMetadata.qualityScore;
          }
          
          sourceStats.set(key, stats);
        });
      }
    });

    // Calculate final statistics
    const effectiveness = Array.from(sourceStats.values()).map(stats => ({
      ...stats,
      avgRelevanceScore: stats.totalRelevanceScore / stats.usageCount,
      successRate: stats.successfulResponses / stats.usageCount,
      avgResponseQuality: stats.avgResponseQuality / stats.usageCount,
      effectivenessScore: (stats.avgRelevanceScore * 0.4) + 
                         (stats.successRate * 0.4) + 
                         (stats.avgResponseQuality * 0.2)
    })).sort((a, b) => b.effectivenessScore - a.effectivenessScore);

    console.log(`📈 ANALYTICS: Source effectiveness analysis complete (${effectiveness.length} sources analyzed)`);
    return effectiveness;
  }

  // 6. Performance Trend Analysis
  getPerformanceTrends(timeWindow = 7 * 24 * 60 * 60 * 1000) { // 7 days default
    const cutoffTime = Date.now() - timeWindow;
    const recentData = this.performanceData.filter(op => op.startTime > cutoffTime);
    
    const trends = {
      totalOperations: recentData.length,
      successRate: recentData.filter(op => op.status === 'success').length / recentData.length,
      averageLatency: recentData.reduce((sum, op) => sum + op.duration, 0) / recentData.length,
      
      // Breakdown by operation type
      operationTypes: this.groupByOperationType(recentData),
      
      // Daily trends
      dailyTrends: this.calculateDailyTrends(recentData),
      
      // Quality trends
      qualityTrends: this.calculateQualityTrends(recentData)
    };

    console.log(`📊 ANALYTICS: Performance trends calculated over ${timeWindow / (24 * 60 * 60 * 1000)} days`);
    return trends;
  }

  // 7. Real-time Health Monitoring
  getSystemHealth() {
    const recentOps = this.performanceData.slice(-50); // Last 50 operations
    const errorRate = recentOps.filter(op => op.status === 'failed').length / Math.max(recentOps.length, 1);
    const avgLatency = recentOps.reduce((sum, op) => sum + op.duration, 0) / Math.max(recentOps.length, 1);
    
    const health = {
      status: this.determineHealthStatus(errorRate, avgLatency),
      metrics: {
        errorRate: errorRate,
        averageLatency: Math.round(avgLatency),
        recentOperations: recentOps.length,
        activeErrors: this.errorPatterns.size
      },
      recommendations: this.generateHealthRecommendations(errorRate, avgLatency),
      timestamp: new Date().toISOString()
    };

    return health;
  }

  // Helper Methods
  calculateAverageScore(documents) {
    if (!documents || documents.length === 0) return 0;
    const total = documents.reduce((sum, doc) => sum + (doc.relevanceScore || doc.score || 0), 0);
    return total / documents.length;
  }

  analyzeSourceDistribution(documents) {
    if (!documents) return {};
    
    const distribution = {};
    documents.forEach(doc => {
      const type = doc.metadata?.type || 'unknown';
      distribution[type] = (distribution[type] || 0) + 1;
    });
    
    return distribution;
  }

  createErrorSignature(error) {
    // Create a signature that groups similar errors
    const message = error.message || 'Unknown error';
    const stack = error.stack || '';
    
    // Extract the main error pattern
    let signature = message.replace(/\d+/g, 'N'); // Replace numbers with N
    signature = signature.replace(/['"]/g, "'"); // Normalize quotes
    signature = signature.substring(0, 100); // Limit length
    
    // Add stack trace context if available
    const stackLines = stack.split('\n').slice(0, 3);
    if (stackLines.length > 0) {
      signature += '|' + stackLines[0].substring(0, 50);
    }
    
    return signature;
  }

  async getConversationContext(conversationId) {
    if (!this.aiPersistAdapter) return {};
    
    try {
      const history = await this.aiPersistAdapter.getConversationHistory(conversationId, 3);
      return {
        messageCount: history.length,
        topics: this.extractTopics(history),
        lastActivity: history.length > 0 ? history[history.length - 1].timestamp : null
      };
    } catch (error) {
      console.warn('Failed to get conversation context:', error.message);
      return {};
    }
  }

  extractTopics(history) {
    // Simple topic extraction from conversation history
    const allText = history.map(h => h.prompt + ' ' + h.response).join(' ');
    const words = allText.toLowerCase().match(/\b\w{4,}\b/g) || [];
    
    const wordCount = new Map();
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });
    
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  updateSatisfactionTrends(feedback) {
    // Implementation would store and analyze satisfaction trends over time
    // This is a simplified version
    const key = 'satisfaction_trend';
    const existing = this.metrics.get(key) || { ratings: [], helpful: [], total: 0 };
    
    existing.total++;
    if (feedback.rating !== undefined) existing.ratings.push(feedback.rating);
    if (feedback.helpful !== undefined) existing.helpful.push(feedback.helpful);
    
    // Keep only recent feedback (last 100)
    existing.ratings = existing.ratings.slice(-100);
    existing.helpful = existing.helpful.slice(-100);
    
    this.metrics.set(key, existing);
  }

  groupByOperationType(operations) {
    const groups = {};
    operations.forEach(op => {
      const type = op.type;
      if (!groups[type]) {
        groups[type] = { count: 0, totalDuration: 0, successCount: 0 };
      }
      
      groups[type].count++;
      groups[type].totalDuration += op.duration;
      if (op.status === 'success') groups[type].successCount++;
    });
    
    // Calculate averages
    Object.values(groups).forEach(group => {
      group.avgDuration = group.totalDuration / group.count;
      group.successRate = group.successCount / group.count;
    });
    
    return groups;
  }

  calculateDailyTrends(operations) {
    const dailyData = new Map();
    
    operations.forEach(op => {
      const date = new Date(op.startTime).toISOString().split('T')[0];
      const data = dailyData.get(date) || { count: 0, successCount: 0, totalDuration: 0 };
      
      data.count++;
      data.totalDuration += op.duration;
      if (op.status === 'success') data.successCount++;
      
      dailyData.set(date, data);
    });
    
    return Array.from(dailyData.entries()).map(([date, data]) => ({
      date,
      operationsCount: data.count,
      successRate: data.successCount / data.count,
      avgDuration: data.totalDuration / data.count
    }));
  }

  calculateQualityTrends(operations) {
    const qualityData = operations
      .filter(op => op.result?.responseMetadata?.qualityScore !== undefined)
      .map(op => ({
        timestamp: op.startTime,
        qualityScore: op.result.responseMetadata.qualityScore,
        category: op.result?.responseMetadata?.category
      }));

    if (qualityData.length === 0) return { avgQuality: 0, trend: 'stable', byCategory: {} };
    
    const avgQuality = qualityData.reduce((sum, d) => sum + d.qualityScore, 0) / qualityData.length;
    
    // Simple trend calculation (comparing first half vs second half)
    const midPoint = Math.floor(qualityData.length / 2);
    const firstHalf = qualityData.slice(0, midPoint);
    const secondHalf = qualityData.slice(midPoint);
    
    const firstHalfAvg = firstHalf.reduce((sum, d) => sum + d.qualityScore, 0) / Math.max(firstHalf.length, 1);
    const secondHalfAvg = secondHalf.reduce((sum, d) => sum + d.qualityScore, 0) / Math.max(secondHalf.length, 1);
    
    let trend = 'stable';
    if (secondHalfAvg > firstHalfAvg + 0.1) trend = 'improving';
    else if (secondHalfAvg < firstHalfAvg - 0.1) trend = 'declining';
    
    // Quality by category
    const byCategory = {};
    qualityData.forEach(d => {
      const cat = d.category || 'unknown';
      if (!byCategory[cat]) byCategory[cat] = { total: 0, count: 0 };
      byCategory[cat].total += d.qualityScore;
      byCategory[cat].count++;
    });
    
    Object.keys(byCategory).forEach(cat => {
      byCategory[cat].average = byCategory[cat].total / byCategory[cat].count;
    });
    
    return { avgQuality, trend, byCategory };
  }

  determineHealthStatus(errorRate, avgLatency) {
    if (errorRate > 0.2 || avgLatency > 10000) return 'critical';
    if (errorRate > 0.1 || avgLatency > 5000) return 'warning';
    if (errorRate > 0.05 || avgLatency > 3000) return 'degraded';
    return 'healthy';
  }

  generateHealthRecommendations(errorRate, avgLatency) {
    const recommendations = [];
    
    if (errorRate > 0.1) {
      recommendations.push('High error rate detected. Check error patterns and logs.');
    }
    
    if (avgLatency > 5000) {
      recommendations.push('High latency detected. Consider optimizing context processing or vector search.');
    }
    
    if (errorRate > 0.05 && avgLatency > 3000) {
      recommendations.push('Both errors and latency are elevated. Check system resources and dependencies.');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('System operating within normal parameters.');
    }
    
    return recommendations;
  }

  recordMetrics(type, data) {
    // This could be extended to send to external monitoring systems
    if (this.eventBus) {
      this.eventBus.emit('ragMetrics', { type, data, timestamp: new Date().toISOString() });
    }
    
    console.log(`📊 ANALYTICS: Recorded ${type} metrics`);
  }

  emitPerformanceMetric(operation) {
    if (this.eventBus) {
      this.eventBus.emit('ragPerformance', operation);
    }
  }

  emitErrorAlert(errorPattern) {
    if (this.eventBus) {
      this.eventBus.emit('ragErrorAlert', {
        type: 'recurring_error',
        pattern: errorPattern,
        severity: errorPattern.count > 50 ? 'high' : 'medium',
        timestamp: new Date().toISOString()
      });
    }
    
    console.warn(`🚨 ANALYTICS: Recurring error alert - ${errorPattern.signature} (${errorPattern.count} occurrences)`);
  }

  // 8. Generate Analytics Report
  generateAnalyticsReport(timeWindow = 24 * 60 * 60 * 1000) {
    const performance = this.getPerformanceTrends(timeWindow);
    const sourceEffectiveness = this.analyzeSourceEffectiveness(timeWindow);
    const health = this.getSystemHealth();
    
    const report = {
      generatedAt: new Date().toISOString(),
      timeWindow: `${timeWindow / (60 * 60 * 1000)} hours`,
      
      summary: {
        totalOperations: performance.totalOperations,
        overallSuccessRate: performance.successRate,
        averageLatency: Math.round(performance.averageLatency),
        systemHealth: health.status
      },
      
      performance,
      sourceEffectiveness: sourceEffectiveness.slice(0, 10), // Top 10 sources
      health,
      
      topErrors: Array.from(this.errorPatterns.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
        
      recommendations: [
        ...health.recommendations,
        ...this.generateOptimizationRecommendations(sourceEffectiveness, performance)
      ]
    };
    
    console.log(`📊 ANALYTICS: Generated comprehensive analytics report`);
    return report;
  }

  generateOptimizationRecommendations(sourceEffectiveness, performance) {
    const recommendations = [];
    
    // Source optimization
    const lowEffectiveSources = sourceEffectiveness.filter(s => s.effectivenessScore < 0.5);
    if (lowEffectiveSources.length > 0) {
      recommendations.push(`Consider reviewing ${lowEffectiveSources.length} low-performing sources for content quality`);
    }
    
    // Performance optimization
    if (performance.averageLatency > 3000) {
      recommendations.push('Consider implementing caching or optimizing vector search parameters');
    }
    
    // Query pattern optimization
    const apiUsageOps = performance.operationTypes['full_pipeline'] || {};
    if (apiUsageOps.avgDuration > 5000) {
      recommendations.push('API usage queries taking longer than expected - consider query optimization');
    }
    
    return recommendations;
  }
}

module.exports = RAGAnalytics;
