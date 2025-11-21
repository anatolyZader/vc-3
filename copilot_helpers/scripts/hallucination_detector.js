// Enhanced Hallucination Detection System
class HallucinationDetector {
  constructor(projectStructure = {}) {
    this.projectStructure = projectStructure;
    this.knownDirectories = [
      'backend/',
      'client/',
      'backend/business_modules/',
      'backend/infrastructure/',
      'backend/plugins/'
    ];
    
    this.nonExistentPaths = [
      'src/core/di',
      'src/components',
      'lib/utils',
      'modules/di',
      'core/dependency-injection'
    ];
  }

  /**
   * Detect hallucinated file paths in AI response
   */
  detectFilePathHallucinations(response, retrievedDocuments = []) {
    const issues = [];
    const responseLower = response.toLowerCase();
    
    // Extract actual file paths from retrieved documents
    const actualPaths = retrievedDocuments
      .map(doc => doc.metadata?.source)
      .filter(Boolean)
      .map(path => path.toLowerCase());
    
    // Check for non-existent paths
    this.nonExistentPaths.forEach(fakePath => {
      if (responseLower.includes(fakePath.toLowerCase())) {
        issues.push({
          type: 'fake_path',
          path: fakePath,
          severity: 'high',
          description: `AI mentioned non-existent path: ${fakePath}`
        });
      }
    });
    
    // Check for paths not in retrieved context
    const pathPattern = /(?:src\/|backend\/|client\/|lib\/|core\/)[a-zA-Z0-9\/\-_.]+/g;
    const mentionedPaths = response.match(pathPattern) || [];
    
    mentionedPaths.forEach(path => {
      const pathLower = path.toLowerCase();
      const foundInContext = actualPaths.some(actualPath => 
        actualPath.includes(pathLower) || pathLower.includes(actualPath)
      );
      
      if (!foundInContext) {
        issues.push({
          type: 'unverified_path',
          path: path,
          severity: 'medium',
          description: `AI mentioned path not found in retrieved context: ${path}`
        });
      }
    });
    
    return issues;
  }

  /**
   * Detect generic responses when specific context is available
   */
  detectGenericResponses(response, contextData) {
    const issues = [];
    const responseLower = response.toLowerCase();
    const hasRichContext = contextData.sourceAnalysis.total > 5;
    
    const genericPhrases = [
      "i don't have enough information",
      "i don't have access to",
      "cannot provide specific details",
      "would need more information",
      "details are not available in the context"
    ];
    
    if (hasRichContext) {
      genericPhrases.forEach(phrase => {
        if (responseLower.includes(phrase)) {
          issues.push({
            type: 'generic_response',
            phrase: phrase,
            severity: 'high',
            description: `Generic response despite having ${contextData.sourceAnalysis.total} documents`,
            context: `GitHub:${contextData.sourceAnalysis.githubRepo}, Docs:${contextData.sourceAnalysis.moduleDocumentation}`
          });
        }
      });
    }
    
    return issues;
  }

  /**
   * Detect inconsistencies with project structure
   */
  detectStructuralInconsistencies(response, actualStructure) {
    const issues = [];
    const responseLower = response.toLowerCase();
    
    // Technology stack mismatches
    const techMismatches = [
      { mentioned: 'react', actual: 'vanilla js', pattern: /react|jsx|tsx/ },
      { mentioned: 'webpack', actual: 'vite', pattern: /webpack\.config/ },
      { mentioned: 'jest', actual: 'vitest', pattern: /jest\.config/ }
    ];
    
    techMismatches.forEach(({ mentioned, actual, pattern }) => {
      if (pattern.test(responseLower)) {
        issues.push({
          type: 'tech_mismatch',
          mentioned,
          actual,
          severity: 'medium',
          description: `AI mentioned ${mentioned} but project uses ${actual}`
        });
      }
    });
    
    return issues;
  }

  /**
   * Main detection method
   */
  detect(response, contextData, retrievedDocuments = []) {
    const issues = [
      ...this.detectFilePathHallucinations(response, retrievedDocuments),
      ...this.detectGenericResponses(response, contextData),
      ...this.detectStructuralInconsistencies(response, this.projectStructure)
    ];
    
    return {
      hasIssues: issues.length > 0,
      issues,
      severity: this.calculateOverallSeverity(issues),
      recommendations: this.generateRecommendations(issues)
    };
  }

  calculateOverallSeverity(issues) {
    if (issues.some(i => i.severity === 'high')) return 'high';
    if (issues.some(i => i.severity === 'medium')) return 'medium';
    return 'low';
  }

  generateRecommendations(issues) {
    const recommendations = [];
    
    if (issues.some(i => i.type === 'fake_path')) {
      recommendations.push('Improve prompts to emphasize using only paths from provided context');
      recommendations.push('Add explicit instruction to avoid inventing file paths');
    }
    
    if (issues.some(i => i.type === 'generic_response')) {
      recommendations.push('Enhance prompts to encourage specific answers when context is available');
      recommendations.push('Add context utilization validation to prompts');
    }
    
    if (issues.some(i => i.type === 'tech_mismatch')) {
      recommendations.push('Update system prompts with accurate technology stack information');
    }
    
    return recommendations;
  }
}

module.exports = HallucinationDetector;