// UbiquitousLanguageEnhancer.js
"use strict";

const path = require('path');
const fs = require('fs');

class UbiquitousLanguageEnhancer {
  constructor() {
    this.ubiquitousLanguage = this.loadUbiquitousLanguage();
  }

  /**
   * Load EventStorm.me ubiquitous language dictionary
   */
  loadUbiquitousLanguage() {
    try {
      const dictPath = path.join(__dirname, '../ubiqLangDict.json');
      if (fs.existsSync(dictPath)) {
        const dictContent = fs.readFileSync(dictPath, 'utf8');
        const dictionary = JSON.parse(dictContent);
        console.log(`[${new Date().toISOString()}] 📚 Loaded ubiquitous language dictionary with ${Object.keys(dictionary.businessModules || {}).length} business modules`);
        return dictionary;
      } else {
        console.warn(`[${new Date().toISOString()}] ⚠️ Ubiquitous language dictionary not found at ${dictPath}, using empty dictionary`);
        return { businessModules: {}, businessTerms: {}, technicalTerms: {}, domainEvents: {} };
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error loading ubiquitous language dictionary:`, error.message);
      return { businessModules: {}, businessTerms: {}, technicalTerms: {}, domainEvents: {} };
    }
  }

  /**
   * Enhance document with ubiquitous language context
   */
  enhanceWithUbiquitousLanguage(document) {
    if (!document || !document.pageContent) return document;

    const content = document.pageContent.toLowerCase();
    const source = document.metadata?.source || '';
    
    // Detect business module from file path or content
    const businessModule = this.detectBusinessModule(content, source);
    
    // Get relevant domain context
    const boundedContext = this.getBoundedContext(businessModule);
    const relevantEvents = this.getRelevantDomainEvents(businessModule);
    const relevantTerms = this.extractRelevantTerms(content);
    
    // Generate contextual annotation
    const contextualAnnotation = this.generateContextualAnnotation(businessModule, content);
    
    // Enhanced document with ubiquitous language metadata
    return {
      ...document,
      pageContent: contextualAnnotation + document.pageContent,
      metadata: {
        ...document.metadata,
        ubiq_business_module: businessModule,
        ubiq_bounded_context: boundedContext,
        ubiq_domain_events: relevantEvents,
        ubiq_terminology: relevantTerms,
        ubiq_enhanced: true,
        ubiq_enhancement_timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Detect EventStorm business module from file content and path
   */
  detectBusinessModule(content, source) {
    console.log(`[${new Date().toISOString()}] 🔍 Detecting business module for: ${source}`);
    
    // Check file path for module indicators
    const pathModules = ['auth', 'chat', 'docs', 'api', 'reqs', 'git', 'wiki'];
    for (const module of pathModules) {
      if (source.includes(`/${module}/`) || source.includes(`\\${module}\\`)) {
        console.log(`[${new Date().toISOString()}] 📂 Detected module from path: ${module}`);
        return module;
      }
    }
    
    // If we have business modules defined, check content against them
    if (this.ubiquitousLanguage.businessModules) {
      let bestMatch = 'unknown';
      let highestScore = 0;
      
      for (const [moduleName, moduleData] of Object.entries(this.ubiquitousLanguage.businessModules)) {
        const score = this.calculateModuleRelevanceScore(content, moduleData);
        if (score > highestScore) {
          highestScore = score;
          bestMatch = moduleName;
        }
      }
      
      if (highestScore > 0.1) { // Threshold for relevance
        console.log(`[${new Date().toISOString()}] 🎯 Detected module from content analysis: ${bestMatch} (score: ${highestScore.toFixed(3)})`);
        return bestMatch;
      }
    }
    
    // Fallback: simple keyword matching
    const keywordModules = {
      auth: ['authentication', 'login', 'user', 'session', 'token', 'oauth', 'jwt'],
      chat: ['message', 'conversation', 'chat', 'websocket', 'socket.io'],
      docs: ['documentation', 'markdown', 'readme', 'wiki', 'spec'],
      api: ['endpoint', 'route', 'controller', 'api', 'rest', 'graphql'],
      reqs: ['requirement', 'specification', 'feature', 'story'],
      git: ['repository', 'commit', 'branch', 'github', 'git']
    };
    
    for (const [module, keywords] of Object.entries(keywordModules)) {
      for (const keyword of keywords) {
        if (content.includes(keyword)) {
          console.log(`[${new Date().toISOString()}] 🔤 Detected module from keyword '${keyword}': ${module}`);
          return module;
        }
      }
    }
    
    console.log(`[${new Date().toISOString()}] ❓ No specific module detected, defaulting to 'unknown'`);
    return 'unknown';
  }

  /**
   * Calculate relevance score for a business module
   */
  calculateModuleRelevanceScore(content, moduleData) {
    let score = 0;
    let totalTerms = 0;

    // Check entities
    if (moduleData.entities) {
      moduleData.entities.forEach(entity => {
        totalTerms++;
        if (content.includes(entity.name.toLowerCase())) {
          score += 0.3;
        }
        if (entity.behaviors) {
          entity.behaviors.forEach(behavior => {
            totalTerms++;
            if (content.includes(behavior.toLowerCase())) {
              score += 0.2;
            }
          });
        }
      });
    }

    // Check domain events
    if (moduleData.domainEvents) {
      moduleData.domainEvents.forEach(event => {
        totalTerms++;
        if (content.includes(event.name.toLowerCase().replace('event', ''))) {
          score += 0.25;
        }
      });
    }

    // Check value objects
    if (moduleData.valueObjects) {
      moduleData.valueObjects.forEach(vo => {
        totalTerms++;
        if (content.includes(vo.name.toLowerCase())) {
          score += 0.2;
        }
      });
    }

    return totalTerms > 0 ? score / totalTerms : 0;
  }

  /**
   * Get bounded context for a business module
   */
  getBoundedContext(moduleName) {
    const moduleData = this.ubiquitousLanguage.businessModules[moduleName];
    return moduleData ? moduleData.boundedContext : 'Unknown Context';
  }

  /**
   * Get relevant domain events for a business module
   */
  getRelevantDomainEvents(moduleName) {
    const events = this.ubiquitousLanguage.domainEvents[moduleName];
    return events ? events : [];
  }

  /**
   * Extract relevant business terms from content
   */
  extractRelevantTerms(content) {
    const relevantTerms = [];
    
    // Check business terms
    for (const [term, definition] of Object.entries(this.ubiquitousLanguage.businessTerms || {})) {
      if (content.includes(term.toLowerCase()) || content.includes(definition.name.toLowerCase())) {
        relevantTerms.push(term);
      }
    }
    
    // Check technical terms
    for (const [term, definition] of Object.entries(this.ubiquitousLanguage.technicalTerms || {})) {
      if (content.includes(term.toLowerCase()) || content.includes(definition.name.toLowerCase())) {
        relevantTerms.push(term);
      }
    }
    
    return relevantTerms;
  }

  /**
   * Generate contextual annotation based on detected module and content
   */
  generateContextualAnnotation(moduleName, content) {
    if (moduleName === 'unknown') {
      return '// UBIQUITOUS LANGUAGE CONTEXT: Unknown module\n';
    }

    const moduleData = this.ubiquitousLanguage.businessModules[moduleName];
    if (!moduleData) {
      return '// UBIQUITOUS LANGUAGE CONTEXT: Unknown module\n';
    }

    let annotation = `// UBIQUITOUS LANGUAGE CONTEXT: ${moduleData.name.toUpperCase()}\n`;
    annotation += `// BOUNDED CONTEXT: ${moduleData.boundedContext}\n`;
    annotation += `// DOMAIN ROLE: ${moduleData.role}\n`;
    
    if (moduleData.type) {
      annotation += `// MODULE TYPE: ${moduleData.type}\n`;
    }
    
    // Add relevant entities if found in content
    const relevantEntities = moduleData.entities?.filter(entity => 
      content.toLowerCase().includes(entity.name.toLowerCase())
    );
    if (relevantEntities && relevantEntities.length > 0) {
      annotation += `// RELEVANT ENTITIES: ${relevantEntities.map(e => e.name).join(', ')}\n`;
    }

    // Add relevant domain events if applicable
    const relevantEvents = this.ubiquitousLanguage.domainEvents[moduleName]?.filter(event =>
      content.toLowerCase().includes(event.toLowerCase().replace('event', ''))
    );
    if (relevantEvents && relevantEvents.length > 0) {
      annotation += `// DOMAIN EVENTS: ${relevantEvents.join(', ')}\n`;
    }

    annotation += '//\n';
    return annotation;
  }
}

module.exports = UbiquitousLanguageEnhancer;
