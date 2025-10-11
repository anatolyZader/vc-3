// UbiquitousLanguageEnhancer.js
"use strict";

const path = require('path');
const fs = require('fs');

class UbiquitousLanguageEnhancer {
  constructor(options = {}) {
    this.ubiquitousLanguage = null;
    this.architectureCatalog = null;
    this.infrastructureCatalog = null;
    this.workflowsCatalog = null;
    this.catalogsPromise = null;
    this.options = {
      relevanceThreshold: 0.1,
      entityWeight: 0.3,
      eventWeight: 0.25,
      behaviorWeight: 0.2,
      valueObjectWeight: 0.2,
      ...options
    };
  }

  /**
   * Get catalogs (load asynchronously if not already loaded)
   */
  async getCatalogs() {
    if (this.ubiquitousLanguage && this.architectureCatalog && this.infrastructureCatalog && this.workflowsCatalog) {
      return {
        ubiquitousLanguage: this.ubiquitousLanguage,
        architectureCatalog: this.architectureCatalog,
        infrastructureCatalog: this.infrastructureCatalog,
        workflowsCatalog: this.workflowsCatalog
      };
    }

    if (this.catalogsPromise === null) {
      this.catalogsPromise = this.loadAllCatalogs();
    }

    const catalogs = await this.catalogsPromise;
    this.ubiquitousLanguage = catalogs.ubiquitousLanguage;
    this.architectureCatalog = catalogs.architectureCatalog;
    this.infrastructureCatalog = catalogs.infrastructureCatalog;
    this.workflowsCatalog = catalogs.workflowsCatalog;
    
    return catalogs;
  }

  /**
   * Get dictionary (legacy method for backward compatibility)
   */
  async getDictionary() {
    const catalogs = await this.getCatalogs();
    return catalogs.ubiquitousLanguage;
  }

  /**
   * Load all EventStorm.me catalogs asynchronously
   */
  async loadAllCatalogs() {
    const fs = require('fs').promises;
    
    const catalogFiles = {
      ubiquitousLanguage: 'ubiq-language.json',
      architectureCatalog: 'arch-catalog.json', 
      infrastructureCatalog: 'infra-catalog.json',
      workflowsCatalog: 'workflows.json'
    };
    
    const catalogs = {};
    let loadedCount = 0;
    
    for (const [catalogName, fileName] of Object.entries(catalogFiles)) {
      try {
        const catalogPath = path.join(__dirname, fileName);
        
        try {
          await fs.access(catalogPath);
        } catch (error) {
          console.warn(`[${new Date().toISOString()}] ⚠️ ${catalogName} catalog not found at ${catalogPath}, using empty fallback`);
          catalogs[catalogName] = this.getEmptyCatalog(catalogName);
          continue;
        }

        const catalogContent = await fs.readFile(catalogPath, 'utf8');
        const catalog = JSON.parse(catalogContent);
        
        // Normalize schema for consistent access
        if (catalogName === 'ubiquitousLanguage') {
          catalogs[catalogName] = this.normalizeDictionary(catalog);
        } else {
          catalogs[catalogName] = catalog;
        }
        
        loadedCount++;
        
      } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Error loading ${catalogName} catalog:`, error.message);
        catalogs[catalogName] = this.getEmptyCatalog(catalogName);
      }
    }
    
    console.log(`[${new Date().toISOString()}] 📚 Loaded ${loadedCount}/4 catalogs successfully`);
    if (catalogs.ubiquitousLanguage?.businessModules) {
      console.log(`[${new Date().toISOString()}] 🎯 Ubiquitous language contains ${Object.keys(catalogs.ubiquitousLanguage.businessModules).length} business modules`);
    }
    
    return catalogs;
  }

  /**
   * Load EventStorm.me ubiquitous language dictionary asynchronously (legacy method)
   */
  async loadUbiquitousLanguage() {
    const catalogs = await this.loadAllCatalogs();
    return catalogs.ubiquitousLanguage;
  }

  /**
   * Get empty dictionary fallback (legacy method)
   */
  getEmptyDictionary() {
    return { businessModules: {}, businessTerms: {}, technicalTerms: {}, domainEvents: {} };
  }

  /**
   * Get empty catalog fallback based on catalog type
   */
  getEmptyCatalog(catalogType) {
    switch (catalogType) {
      case 'ubiquitousLanguage':
        return { businessModules: {}, businessTerms: {}, technicalTerms: {}, domainEvents: {} };
      case 'architectureCatalog':
        return { architecture: { patterns: [], layers: [] }, ports: { inbound: [], outbound: [] } };
      case 'infrastructureCatalog':
        return { infrastructure: { cloud: { services: [] }, databases: {} }, technicalDependencies: {} };
      case 'workflowsCatalog':
        return { workflows: {}, cross_cutting_workflows: {}, integration_patterns: {} };
      default:
        return {};
    }
  }

  /**
   * Normalize dictionary schema to handle inconsistencies
   */
  normalizeDictionary(dictionary) {
    const normalized = { ...dictionary };

    // Normalize businessTerms to consistent structure
    if (normalized.businessTerms) {
      for (const [key, value] of Object.entries(normalized.businessTerms)) {
        if (typeof value === 'string') {
          normalized.businessTerms[key] = { name: value, description: value };
        } else if (!value.name) {
          normalized.businessTerms[key] = { ...value, name: key };
        }
      }
    }

    // Normalize technicalTerms to consistent structure
    if (normalized.technicalTerms) {
      for (const [key, value] of Object.entries(normalized.technicalTerms)) {
        if (typeof value === 'string') {
          normalized.technicalTerms[key] = { name: value, description: value };
        } else if (!value.name) {
          normalized.technicalTerms[key] = { ...value, name: key };
        }
      }
    }

    // Normalize domainEvents to arrays of strings
    if (normalized.domainEvents) {
      for (const [moduleName, events] of Object.entries(normalized.domainEvents)) {
        if (Array.isArray(events)) {
          normalized.domainEvents[moduleName] = events.map(event => 
            typeof event === 'string' ? event : event.name || event.toString()
          );
        }
      }
    }

    return normalized;
  }

  /**
   * Enhance document with ubiquitous language context
   */
  async enhanceWithUbiquitousLanguage(document) {
    if (!document?.pageContent) return document;

    // Idempotency guard: skip if already enhanced
    if (document.metadata?.ubiq_enhanced === true) {
      console.log(`[${new Date().toISOString()}] ⏭️ Skipping already enhanced document: ${document.metadata?.source || 'unknown'}`);
      return document;
    }

    // Ensure all catalogs are loaded
    const catalogs = await this.getCatalogs();
    this.ubiquitousLanguage = catalogs.ubiquitousLanguage;

    const content = document.pageContent.toLowerCase();
    const source = document.metadata?.source || '';
    
    // Detect business module from file path or content
    const businessModule = this.detectBusinessModule(content, source);
    
    // Get relevant domain context
    const boundedContext = this.getBoundedContext(businessModule);
    const relevantEvents = this.getRelevantDomainEvents(businessModule);
    const relevantTerms = this.extractRelevantTerms(content);
    
    // Generate contextual annotation (store in metadata only)
    const contextualAnnotation = this.generateContextualAnnotation(businessModule, content);
    
    // Enhanced document with ubiquitous language metadata
    const enhancedDocument = {
      ...document,
      // DO NOT pollute pageContent - keep original for RAG quality
      pageContent: document.pageContent,
      metadata: {
        ...document.metadata,
        ubiq_business_module: businessModule,
        ubiq_bounded_context: boundedContext,
        ubiq_domain_events: relevantEvents,
        ubiq_terminology: relevantTerms,
        ubiq_annotation: contextualAnnotation, // Store annotation in metadata
        ubiq_enhanced: true,
        ubiq_enhancement_timestamp: new Date().toISOString()
      }
    };

    // Safely handle commitInfo - only add if it exists and is valid
    if (document.metadata?.commitInfo && typeof document.metadata.commitInfo === 'object') {
      enhancedDocument.metadata.commitInfo = document.metadata.commitInfo;
    }

    return enhancedDocument;
  }

  /**
   * Detect EventStorm business module from file content and path
   */
  detectBusinessModule(content, source) {
    // Generate path patterns from ubiquitous language catalog if available
    const moduleNames = this.ubiquitousLanguage?.businessModules 
      ? Object.keys(this.ubiquitousLanguage.businessModules)
      : ['auth', 'chat', 'docs', 'api', 'reqs', 'git'];
    
    // Check file path for module indicators using normalized paths
    const normalizedSource = source.replace(/\\/g, '/'); // Normalize path separators
    for (const module of moduleNames) {
      if (normalizedSource.includes(`/${module}/`)) {
        return module;
      }
    }
    
    // If we have business modules defined in ubiquitous language catalog, check content against them
    if (this.ubiquitousLanguage?.businessModules) {
      let bestMatch = 'unknown';
      let highestScore = 0;
      
      for (const [moduleName, moduleData] of Object.entries(this.ubiquitousLanguage.businessModules)) {
        const score = this.calculateModuleRelevanceScore(content, moduleData);
        if (score > highestScore) {
          highestScore = score;
          bestMatch = moduleName;
        }
      }
      
      if (highestScore > this.options.relevanceThreshold) { // Threshold for relevance
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
          return module;
        }
      }
    }
    
    return 'unknown';
  }

  /**
   * Check if a term exists in content using word boundaries to prevent false positives
   */
  hasWordBoundaryMatch(content, term) {
    if (!term || !content) return false;
    
    // Create regex with word boundaries and case-insensitive flag
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedTerm}\\b`, 'i');
    return regex.test(content);
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
        if (this.hasWordBoundaryMatch(content, entity.name)) {
          score += this.options.entityWeight;
        }
        if (entity.behaviors) {
          entity.behaviors.forEach(behavior => {
            totalTerms++;
            if (this.hasWordBoundaryMatch(content, behavior)) {
              score += this.options.behaviorWeight;
            }
          });
        }
      });
    }

    // Check domain events
    if (moduleData.domainEvents) {
      moduleData.domainEvents.forEach(event => {
        totalTerms++;
        const eventName = event.name || event;
        // Remove 'Event' suffix for matching
        const baseName = eventName.replace(/Event$/i, '');
        if (this.hasWordBoundaryMatch(content, baseName)) {
          score += this.options.eventWeight;
        }
      });
    }

    // Check value objects
    if (moduleData.valueObjects) {
      moduleData.valueObjects.forEach(vo => {
        totalTerms++;
        if (this.hasWordBoundaryMatch(content, vo.name)) {
          score += this.options.valueObjectWeight;
        }
      });
    }

    return totalTerms > 0 ? score / totalTerms : 0;
  }

  /**
   * Get bounded context for a business module
   */
  getBoundedContext(moduleName) {
    const moduleData = this.ubiquitousLanguage?.businessModules?.[moduleName];
    return moduleData ? moduleData.boundedContext : 'Unknown Context';
  }

  /**
   * Get relevant domain events for a business module
   */
  getRelevantDomainEvents(moduleName) {
    const events = this.ubiquitousLanguage?.domainEvents?.[moduleName];
    return events || [];
  }

  /**
   * Extract relevant business terms from content
   */
  extractRelevantTerms(content) {
    const relevantTerms = [];
    
    // Check business terms from ubiquitous language catalog
    for (const [term, definition] of Object.entries(this.ubiquitousLanguage?.businessTerms || {})) {
      if (this.hasWordBoundaryMatch(content, term) || this.hasWordBoundaryMatch(content, definition.name)) {
        relevantTerms.push(term);
      }
    }
    
    // Check technical terms - these are now in the infrastructure catalog
    if (this.infrastructureCatalog?.technicalDependencies) {
      for (const [category, dependencies] of Object.entries(this.infrastructureCatalog.technicalDependencies)) {
        for (const [term, definition] of Object.entries(dependencies)) {
          if (this.hasWordBoundaryMatch(content, term) || this.hasWordBoundaryMatch(content, definition.name)) {
            relevantTerms.push(term);
          }
        }
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

    const moduleData = this.ubiquitousLanguage?.businessModules?.[moduleName];
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
    const relevantEvents = this.ubiquitousLanguage?.domainEvents?.[moduleName]?.filter(event =>
      content.toLowerCase().includes(event.toLowerCase().replace('event', ''))
    );
    if (relevantEvents && relevantEvents.length > 0) {
      annotation += `// DOMAIN EVENTS: ${relevantEvents.join(', ')}\n`;
    }

    annotation += '//\n';
    return annotation;
  }

  /**
   * Get architecture catalog (for accessing patterns, layers, ports/adapters)
   */
  async getArchitectureCatalog() {
    const catalogs = await this.getCatalogs();
    return catalogs.architectureCatalog;
  }

  /**
   * Get infrastructure catalog (for accessing cloud services, databases, technical deps)
   */
  async getInfrastructureCatalog() {
    const catalogs = await this.getCatalogs();
    return catalogs.infrastructureCatalog;
  }

  /**
   * Get workflows catalog (for accessing business processes and integration patterns)
   */
  async getWorkflowsCatalog() {
    const catalogs = await this.getCatalogs();
    return catalogs.workflowsCatalog;
  }

  /**
   * Check if a specific catalog is available
   */
  async isCatalogAvailable(catalogName) {
    try {
      const catalogs = await this.getCatalogs();
      const catalog = catalogs[catalogName];
      return catalog && Object.keys(catalog).length > 0;
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ Error checking availability of ${catalogName}:`, error.message);
      return false;
    }
  }

  /**
   * Get status of all catalogs (for debugging/monitoring)
   */
  async getCatalogStatus() {
    const fs = require('fs').promises;
    const status = {};
    
    const catalogFiles = {
      ubiquitousLanguage: 'ubiq-language.json',
      architectureCatalog: 'arch-catalog.json', 
      infrastructureCatalog: 'infra-catalog.json',
      workflowsCatalog: 'workflows.json'
    };

    for (const [catalogName, fileName] of Object.entries(catalogFiles)) {
      try {
        const catalogPath = path.join(__dirname, fileName);
        await fs.access(catalogPath);
        const stats = await fs.stat(catalogPath);
        status[catalogName] = {
          available: true,
          file: fileName,
          size: stats.size,
          modified: stats.mtime
        };
      } catch (error) {
        status[catalogName] = {
          available: false,
          file: fileName,
          error: error.message
        };
      }
    }

    return status;
  }
}

module.exports = UbiquitousLanguageEnhancer;
