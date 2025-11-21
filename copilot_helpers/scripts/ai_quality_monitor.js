// AI Response Quality Monitor
class AIQualityMonitor {
  constructor() {
    this.metrics = {
      totalResponses: 0,
      hallucinationCount: 0,
      genericResponseCount: 0,
      contextUtilizationRate: 0,
      avgResponseTime: 0,
      errorRate: 0
    };
    
    this.recentIssues = [];
    this.maxIssueHistory = 100;
  }

  /**
   * Monitor a single AI response for quality issues
   */
  monitorResponse(responseData) {
    const {
      response,
      contextData,
      retrievedDocuments,
      responseTime,
      prompt,
      userId,
      conversationId
    } = responseData;

    this.metrics.totalResponses++;
    
    // Detect issues using HallucinationDetector
    const detector = new HallucinationDetector();
    const detectionResult = detector.detect(response, contextData, retrievedDocuments);
    
    // Update metrics
    if (detectionResult.hasIssues) {
      const highSeverityIssues = detectionResult.issues.filter(i => i.severity === 'high');
      if (highSeverityIssues.length > 0) {
        this.metrics.hallucinationCount++;
      }
      
      // Log and store the issue
      this.logQualityIssue({
        timestamp: new Date().toISOString(),
        userId,
        conversationId,
        prompt: prompt.substring(0, 200),
        issues: detectionResult.issues,
        severity: detectionResult.severity,
        contextSize: contextData.sourceAnalysis.total,
        recommendations: detectionResult.recommendations
      });
    }
    
    // Update running averages
    this.updateMetrics(responseTime, contextData, detectionResult);
    
    return detectionResult;
  }

  /**
   * Log quality issues for analysis
   */
  logQualityIssue(issueData) {
    console.warn(`[${new Date().toISOString()}] 🚨 AI QUALITY ISSUE DETECTED:`);
    console.warn(`[${new Date().toISOString()}] 📊 Severity: ${issueData.severity}`);
    console.warn(`[${new Date().toISOString()}] 👤 User: ${issueData.userId}`);
    console.warn(`[${new Date().toISOString()}] 💬 Prompt: "${issueData.prompt}..."`);
    console.warn(`[${new Date().toISOString()}] 🔍 Issues: ${issueData.issues.length}`);
    
    issueData.issues.forEach((issue, index) => {
      console.warn(`[${new Date().toISOString()}]   ${index + 1}. ${issue.type}: ${issue.description}`);
    });
    
    console.warn(`[${new Date().toISOString()}] 💡 Recommendations:`);
    issueData.recommendations.forEach((rec, index) => {
      console.warn(`[${new Date().toISOString()}]   ${index + 1}. ${rec}`);
    });
    
    // Store for dashboard
    this.recentIssues.unshift(issueData);
    if (this.recentIssues.length > this.maxIssueHistory) {
      this.recentIssues.pop();
    }
  }

  /**
   * Update running metrics
   */
  updateMetrics(responseTime, contextData, detectionResult) {
    // Context utilization rate
    const hasGoodContext = contextData.sourceAnalysis.total > 5;
    const usedContextWell = !detectionResult.hasIssues || detectionResult.severity !== 'high';
    
    if (hasGoodContext && usedContextWell) {
      this.metrics.contextUtilizationRate = 
        (this.metrics.contextUtilizationRate * (this.metrics.totalResponses - 1) + 1) / this.metrics.totalResponses;
    }
    
    // Average response time
    this.metrics.avgResponseTime = 
      (this.metrics.avgResponseTime * (this.metrics.totalResponses - 1) + responseTime) / this.metrics.totalResponses;
    
    // Error rate
    if (detectionResult.hasIssues && detectionResult.severity === 'high') {
      this.metrics.errorRate = this.metrics.hallucinationCount / this.metrics.totalResponses;
    }
  }

  /**
   * Get current quality metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      hallucinationRate: this.metrics.hallucinationCount / this.metrics.totalResponses,
      recentIssuesCount: this.recentIssues.length,
      lastIssue: this.recentIssues[0] || null
    };
  }

  /**
   * Get quality report
   */
  getQualityReport() {
    const metrics = this.getMetrics();
    
    return {
      summary: {
        overallQuality: metrics.hallucinationRate < 0.1 ? 'good' : 
                       metrics.hallucinationRate < 0.3 ? 'fair' : 'poor',
        totalResponses: metrics.totalResponses,
        issueRate: `${(metrics.hallucinationRate * 100).toFixed(1)}%`,
        avgResponseTime: `${metrics.avgResponseTime}ms`
      },
      issues: {
        recent: this.recentIssues.slice(0, 10),
        patterns: this.analyzeIssuePatterns()
      },
      recommendations: this.generateSystemRecommendations()
    };
  }

  /**
   * Analyze patterns in quality issues
   */
  analyzeIssuePatterns() {
    const patterns = {};
    
    this.recentIssues.forEach(issue => {
      issue.issues.forEach(subIssue => {
        patterns[subIssue.type] = (patterns[subIssue.type] || 0) + 1;
      });
    });
    
    return Object.entries(patterns)
      .sort(([,a], [,b]) => b - a)
      .map(([type, count]) => ({ type, count, percentage: (count / this.recentIssues.length * 100).toFixed(1) }));
  }

  /**
   * Generate system-level recommendations
   */
  generateSystemRecommendations() {
    const patterns = this.analyzeIssuePatterns();
    const recommendations = [];
    
    patterns.forEach(pattern => {
      if (pattern.type === 'fake_path' && pattern.count > 5) {
        recommendations.push('Critical: Update system prompts to prevent file path hallucination');
      }
      
      if (pattern.type === 'generic_response' && pattern.count > 3) {
        recommendations.push('Important: Improve context utilization in prompts');
      }
      
      if (pattern.type === 'tech_mismatch' && pattern.count > 2) {
        recommendations.push('Update: Refresh system knowledge about project technology stack');
      }
    });
    
    if (recommendations.length === 0) {
      recommendations.push('Quality appears stable - continue monitoring');
    }
    
    return recommendations;
  }
}

module.exports = AIQualityMonitor;