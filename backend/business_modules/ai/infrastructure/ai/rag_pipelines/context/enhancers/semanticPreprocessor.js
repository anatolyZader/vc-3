// SemanticPreprocessor.js
"use strict";

/**
 * SemanticPreprocessor - Enhances document chunks with semantic context
 * 
 * This class adds semantic annotations and metadata to document chunks before
 * embedding to improve retrieval quality and contextual understanding.
 * 
 * Features:
 * - Detects semantic roles (controller, entity, useCase, repository, etc.)
 * - Identifies architectural layers (domain, application, infrastructure, aop)
 * - Marks entry points for better debugging and navigation
 * - Adds contextual annotations and metadata
 * - Supports DDD (Domain-Driven Design) patterns
 */
class SemanticPreprocessor {
  constructor() {
    // Define semantic role patterns for your EventStorm architecture
    this.semanticPatterns = {
      controller: [
        /class.*Controller/,
        /\.route\(/,
        /fastify\.register/,
        /\.get\(/,
        /\.post\(/,
        /\.put\(/,
        /\.delete\(/,
        /\.patch\(/,
        /handler.*:/,
        /async.*handler/
      ],
      entity: [
        /class.*Entity/,
        /@Entity/,
        /domain.*models/,
        /class.*[A-Z][a-zA-Z]*(?:Entity|Model|Aggregate)/,
        /aggregate/i,
        /value.*object/i,
        /domain.*object/i
      ],
      useCase: [
        /class.*UseCase/,
        /class.*Service/,
        /execute\(/,
        /class.*Command/,
        /class.*Query/,
        /application.*service/i,
        /use.*case/i
      ],
      repository: [
        /class.*Repository/,
        /class.*Adapter/,
        /@Repository/,
        /data.*access/i,
        /persistence/i,
        /infrastructure.*repository/i
      ],
      event: [
        /class.*Event/,
        /Event$/,
        /eventBus\.emit/,
        /publish.*event/i,
        /domain.*event/i,
        /integration.*event/i,
        /\.emit\(/,
        /EventDispatcher/
      ],
      pubsub: [
        /\.subscribe\(/,
        /\.publish\(/,
        /pubsub/,
        /message.*handler/i,
        /topic.*handler/i,
        /subscription/i
      ],
      middleware: [
        /middleware/,
        /\.use\(/,
        /plugin/,
        /interceptor/i,
        /cors.*plugin/i,
        /auth.*plugin/i,
        /validation.*plugin/i
      ],
      config: [
        /config/,
        /\.env/,
        /process\.env/,
        /settings/i,
        /configuration/i,
        /setup/i
      ],
      test: [
        /\.test\./,
        /\.spec\./,
        /describe\(/,
        /it\(/,
        /test\(/,
        /expect\(/,
        /__tests__/,
        /test.*file/i
      ],
      schema: [
        /schema/i,
        /validation/i,
        /joi\./,
        /yup\./,
        /ajv/,
        /json.*schema/i
      ],
      plugin: [
        /plugin/i,
        /fastify.*plugin/i,
        /register.*plugin/i,
        /\.register\(/
      ]
    };

    this.architecturalLayers = {
      domain: [
        /\/domain\//,
        /domain/,
        /entities/,
        /value-objects/,
        /aggregates/,
        /domain.*models/,
        /business.*rules/
      ],
      application: [
        /\/application\//,
        /application/,
        /use-cases/,
        /services/,
        /commands/,
        /queries/,
        /handlers/
      ],
      infrastructure: [
        /\/infrastructure\//,
        /infrastructure/,
        /adapters/,
        /repositories/,
        /persistence/,
        /external/,
        /integrations/
      ],
      aop: [
        /\/aop\//,
        /aop_modules/,
        /aspects/,
        /interceptors/,
        /cross.*cutting/,
        /auth/,
        /logging/,
        /security/
      ],
      presentation: [
        /\/input\//,
        /controllers/,
        /routes/,
        /handlers/,
        /api/,
        /rest/,
        /graphql/,
        /web/
      ],
      business: [
        /business_modules/,
        /modules/,
        /features/,
        /bounded.*context/
      ]
    };

    // EventStorm specific patterns
    this.eventstormPatterns = {
      chatModule: [
        /chat/i,
        /conversation/i,
        /message/i,
        /websocket/i
      ],
      gitModule: [
        /git/i,
        /repository/i,
        /github/i,
        /pull.*request/i,
        /commit/i
      ],
      aiModule: [
        /ai/i,
        /langchain/i,
        /openai/i,
        /embedding/i,
        /vector/i,
        /rag/i
      ],
      docsModule: [
        /docs/i,
        /documentation/i,
        /knowledge/i,
        /search/i
      ]
    };
  }

  /**
   * Enhance chunks with semantic context before embedding
   * ✅ PURE EMBEDDINGS: All annotations stored in metadata only
   */
  async preprocessChunk(chunk) {
    const { pageContent, metadata } = chunk;
    
    // Detect semantic characteristics
    const semanticRole = this.detectSemanticRole(pageContent, metadata);
    const architecturalLayer = this.detectArchitecturalLayer(pageContent, metadata);
    const isEntrypoint = this.detectEntrypoint(pageContent, metadata);
    const eventstormModule = this.detectEventstormModule(pageContent, metadata);
    const complexity = this.assessComplexity(pageContent, metadata);
    
    // Generate semantic annotations for metadata (NOT pageContent)
    const semanticAnnotation = this.generateSemanticAnnotation({
      semanticRole,
      architecturalLayer,
      isEntrypoint,
      eventstormModule,
      complexity,
      source: metadata.source
    });

    // Extract contextual info for metadata (NOT pageContent)
    const contextualInfo = await this.extractContextualInfoForMetadata(pageContent, metadata);

    return {
      pageContent: pageContent, // ✅ KEEP ORIGINAL CONTENT PURE
      metadata: {
        ...metadata,
        semantic_role: semanticRole,
        layer: architecturalLayer,
        is_entrypoint: isEntrypoint,
        eventstorm_module: eventstormModule,
        complexity: complexity,
        semantic_annotation: semanticAnnotation, // ✅ ANNOTATION IN METADATA
        related_tests: contextualInfo.relatedTests,
        extracted_comments: contextualInfo.extractedComments,
        enhanced: true,
        enhancement_timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Detect the semantic role of the code/content
   */
  detectSemanticRole(content, metadata) {
    const source = metadata.source || '';
    const contentLower = content.toLowerCase();

    for (const [role, patterns] of Object.entries(this.semanticPatterns)) {
      if (patterns.some(pattern => {
        if (typeof pattern === 'string') {
          return contentLower.includes(pattern.toLowerCase()) || 
                 source.toLowerCase().includes(pattern.toLowerCase());
        }
        return pattern.test(content) || pattern.test(source);
      })) {
        return role;
      }
    }

    // Fallback based on file extension
    const fileExtension = this.getFileExtension(source);
    switch (fileExtension) {
      case '.md':
        return 'documentation';
      case '.json':
        return 'config';
      case '.yaml':
      case '.yml':
        return 'config';
      case '.sql':
        return 'database';
      default:
        return 'unknown';
    }
  }

  /**
   * Detect the architectural layer
   */
  detectArchitecturalLayer(content, metadata) {
    const source = metadata.source || '';
    
    for (const [layer, patterns] of Object.entries(this.architecturalLayers)) {
      if (patterns.some(pattern => pattern.test(source.toLowerCase()))) {
        return layer;
      }
    }

    return 'unknown';
  }

  /**
   * Detect if this is an entry point
   */
  detectEntrypoint(content, metadata) {
    const entrypointPatterns = [
      /fastify\.register/,
      /\.route\(/,
      /app\.listen/,
      /process\.argv/,
      /cron\.schedule/,
      /\.subscribe\(/,
      /main\(/,
      /index\.js/,
      /server\.js/,
      /app\.js/
    ];

    const source = metadata.source || '';
    return entrypointPatterns.some(pattern => 
      pattern.test(content) || pattern.test(source)
    );
  }

  /**
   * Detect EventStorm specific module
   */
  detectEventstormModule(content, metadata) {
    const source = metadata.source || '';
    const contentLower = content.toLowerCase();

    for (const [module, patterns] of Object.entries(this.eventstormPatterns)) {
      if (patterns.some(pattern => {
        if (typeof pattern === 'string') {
          return contentLower.includes(pattern.toLowerCase()) || 
                 source.toLowerCase().includes(pattern.toLowerCase());
        }
        return pattern.test(content) || pattern.test(source);
      })) {
        return module;
      }
    }

    return 'unknown';
  }

  /**
   * Assess code complexity
   */
  assessComplexity(content, metadata) {
    const lines = content.split('\n').length;
    const functions = (content.match(/function|async|=>/g) || []).length;
    const classes = (content.match(/class\s+\w+/g) || []).length;
    const imports = (content.match(/require\(|import\s+/g) || []).length;
    
    if (lines > 200 || functions > 10 || classes > 3) {
      return 'high';
    } else if (lines > 50 || functions > 3 || classes > 1) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Generate semantic annotation for metadata (NOT pageContent)
   * ✅ PURE EMBEDDINGS: Keeps semantic context in metadata only
   */
  generateSemanticAnnotation(context) {
    let annotation = `SEMANTIC CONTEXT: ${context.semanticRole.toUpperCase()}`;
    annotation += ` | LAYER: ${context.architecturalLayer.toUpperCase()}`;
    annotation += ` | MODULE: ${context.eventstormModule.toUpperCase()}`;
    annotation += ` | COMPLEXITY: ${context.complexity.toUpperCase()}`;
    
    if (context.isEntrypoint) {
      annotation += ` | ENTRYPOINT`;
    }
    
    annotation += ` | FILE: ${context.source}`;
    
    // Add role-specific context
    let roleDescription = '';
    switch (context.semanticRole) {
      case 'controller':
        roleDescription = 'HTTP ROUTE HANDLER';
        break;
      case 'entity':
        roleDescription = 'DDD DOMAIN ENTITY';
        break;
      case 'useCase':
        roleDescription = 'APPLICATION SERVICE/USE CASE';
        break;
      case 'repository':
        roleDescription = 'DATA ACCESS ADAPTER';
        break;
      case 'event':
        roleDescription = 'DOMAIN/APPLICATION EVENT';
        break;
      case 'plugin':
        roleDescription = 'FASTIFY PLUGIN';
        break;
      case 'middleware':
        roleDescription = 'MIDDLEWARE/INTERCEPTOR';
        break;
      case 'config':
        roleDescription = 'CONFIGURATION';
        break;
      case 'test':
        roleDescription = 'TEST SPECIFICATION';
        break;
      default:
        roleDescription = 'CODE COMPONENT';
    }
    
    // Add module-specific functionality
    let moduleDescription = '';
    switch (context.eventstormModule) {
      case 'chatModule':
        moduleDescription = 'CHAT/CONVERSATION FUNCTIONALITY';
        break;
      case 'gitModule':
        moduleDescription = 'GIT/GITHUB INTEGRATION';
        break;
      case 'aiModule':
        moduleDescription = 'AI/RAG/LANGCHAIN FUNCTIONALITY';
        break;
      case 'docsModule':
        moduleDescription = 'DOCS/DOCUMENTATION FUNCTIONALITY';
        break;
    }

    return {
      summary: annotation,
      role_description: roleDescription,
      module_description: moduleDescription
    };
  }

  /**
   * Extract contextual information for metadata (NOT pageContent)
   * ✅ PURE EMBEDDINGS: Contextual info stored in metadata only
   */
  async extractContextualInfoForMetadata(content, metadata) {
    const contextualInfo = {
      relatedTests: [],
      extractedComments: []
    };

    // Find related test information if available
    if (metadata.semantic_role !== 'test') {
      const relatedTests = await this.findRelatedTests(metadata.source);
      if (relatedTests.length > 0) {
        contextualInfo.relatedTests = relatedTests;
      }
    }

    // Extract JSDoc/comment information for metadata
    const extractedComments = this.extractComments(content);
    if (extractedComments.length > 0) {
      contextualInfo.extractedComments = extractedComments;
    }

    return contextualInfo;
  }

  /**
   * Find related test files (placeholder implementation)
   */
  async findRelatedTests(sourceFile) {
    // This could scan for .test.js or .spec.js files with similar names
    // For now, return empty array - can be enhanced later
    return [];
  }

  /**
   * Extract meaningful comments and JSDoc
   */
  extractComments(content) {
    const comments = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Extract JSDoc comments
      if (line.startsWith('/**')) {
        let jsDoc = line;
        i++;
        while (i < lines.length && !lines[i].includes('*/')) {
          jsDoc += '\n' + lines[i].trim();
          i++;
        }
        if (i < lines.length) {
          jsDoc += '\n' + lines[i].trim();
        }
        comments.push(jsDoc);
      }
      
      // Extract significant single-line comments
      if (line.startsWith('//') && line.length > 20) {
        comments.push(line);
      }
    }
    
    return comments;
  }

  /**
   * Get file extension from filename
   */
  getFileExtension(filename) {
    if (!filename) return '';
    return filename.substring(filename.lastIndexOf('.'));
  }
}

module.exports = SemanticPreprocessor;
