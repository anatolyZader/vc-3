// Integration example for your existing responseGenerator.js
const HallucinationDetector = require('../../../../hallucination_detector');
const AIQualityMonitor = require('../../../../ai_quality_monitor');

// Add to your ResponseGenerator class
class ResponseGeneratorWithDetection {
  constructor() {
    this.hallucinationDetector = new HallucinationDetector({
      knownDirectories: [
        'backend/',
        'client/', 
        'backend/business_modules/',
        'backend/infrastructure/',
        'backend/plugins/'
      ]
    });
    
    this.qualityMonitor = new AIQualityMonitor();
  }

  async generateResponse(prompt, contextData, conversationHistory, llm) {
    const startTime = Date.now();
    
    try {
      // Your existing response generation logic
      const response = await llm.invoke(messages);
      const responseTime = Date.now() - startTime;
      
      // Quality monitoring
      const detectionResult = this.qualityMonitor.monitorResponse({
        response: response.content,
        contextData,
        retrievedDocuments: contextData.retrievedDocuments || [],
        responseTime,
        prompt,
        userId: contextData.userId,
        conversationId: contextData.conversationId
      });
      
      // Enhanced logging based on detection
      if (detectionResult.hasIssues) {
        if (detectionResult.severity === 'high') {
          console.error(`[${new Date().toISOString()}] 🚨 HIGH SEVERITY AI ISSUE DETECTED`);
          console.error(`[${new Date().toISOString()}] 📊 Issues: ${detectionResult.issues.length}`);
          
          // Optionally trigger alerts, save to database, etc.
          this.triggerQualityAlert(detectionResult, contextData);
        } else {
          console.warn(`[${new Date().toISOString()}] ⚠️ Minor AI quality issues detected`);
        }
      } else {
        console.log(`[${new Date().toISOString()}] ✅ AI response quality validation passed`);
      }
      
      return {
        success: true,
        response: response.content,
        qualityCheck: detectionResult,
        metrics: this.qualityMonitor.getMetrics()
      };
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Response generation failed:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  triggerQualityAlert(detectionResult, contextData) {
    // Send to monitoring system, database, or notification service
    console.error(`[${new Date().toISOString()}] 🚨 QUALITY ALERT: ${detectionResult.severity} severity issues detected`);
    
    // Example: Send to your event bus
    if (this.eventBus) {
      this.eventBus.emit('aiQualityAlert', {
        severity: detectionResult.severity,
        issues: detectionResult.issues,
        userId: contextData.userId,
        timestamp: new Date().toISOString()
      });
    }
  }

  getQualityDashboard() {
    return this.qualityMonitor.getQualityReport();
  }
}

module.exports = ResponseGeneratorWithDetection;