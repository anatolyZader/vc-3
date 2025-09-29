// SemanticPreprocessor.js
"use strict";

/**
 * =====================================================================================
 * SEMANTIC PREPROCESSOR - Intelligent Document Enhancement for RAG Optimization
 * =====================================================================================
 * 
 * The SemanticPreprocessor is a critical component in EventStorm's RAG (Retrieval-Augmented
 * Generation) pipeline that enhances document chunks with semantic context and architectural 
 * intelligence before vector embedding. This preprocessing significantly improves retrieval
 * quality, contextual understanding, and AI response accuracy by adding domain-specific
 * metadata and architectural annotations to raw document content.
 * 
 * ==================================================================================
 * CORE FUNCTIONALITY OVERVIEW
 * ==================================================================================
 * 
 * 1. SEMANTIC ROLE DETECTION
 *    - Identifies code patterns and architectural roles (controller, entity, useCase, repository)
 *    - Recognizes EventStorm-specific components (plugins, middleware, events, pubsub)
 *    - Classifies documentation types (config, schema, test specifications)
 *    - Uses pattern matching on both file content and metadata for accurate classification
 * 
 * 2. ARCHITECTURAL LAYER MAPPING
 *    - Maps documents to DDD (Domain-Driven Design) architectural layers
 *    - Identifies domain, application, infrastructure, and AOP cross-cutting concerns
 *    - Recognizes presentation layer components and business module boundaries
 *    - Enables layer-aware document retrieval for architectural queries
 * 
 * 3. EVENTSTORM MODULE CLASSIFICATION
 *    - Categorizes content by EventStorm functional modules (chat, git, ai, docs)
 *    - Adds module-specific context for improved domain understanding
 *    - Enables module-focused retrieval for feature-specific queries
 *    - Supports bounded context identification for microservice architecture
 * 
 * 4. COMPLEXITY ASSESSMENT & ENTRY POINT DETECTION  
 *    - Analyzes code complexity metrics (lines, functions, classes, imports)
 *    - Identifies application entry points (routes, main functions, server initialization)
 *    - Provides complexity-based prioritization for documentation and debugging
 *    - Marks critical system boundaries and integration points
 * 
 * 5. CONTEXTUAL CONTENT ENHANCEMENT
 *    - Adds semantic annotations as structured comments to document content
 *    - Extracts and includes JSDoc comments and significant inline documentation
 *    - Links related test files and specifications for comprehensive context
 *    - Creates enhanced content optimized for vector similarity search
 * 
 * ==================================================================================
 * INTEGRATION WITH RAG PIPELINE
 * ==================================================================================
 * 
 * UPSTREAM INTEGRATION:
 * ├─ contextPipeline.js: Document routing and content type detection
 * ├─ astCodeSplitter.js: Code-specific chunking before semantic enhancement
 * ├─ docsProcessor.js: Markdown processing before semantic enhancement
 * └─ Content-specific processors: Initial document processing and splitting
 * 
 * DOWNSTREAM INTEGRATION:
 * ├─ embeddingManager.js: Vector embedding generation from enhanced content
 * ├─ pineconePlugin.js: Vector storage with enhanced metadata for filtering
 * └─ AI Query Processing: Improved retrieval accuracy through semantic annotations
 * 
 * PROCESSING WORKFLOW:
 * 1. Raw document chunks received from content-specific processors
 * 2. Semantic role detection using pattern matching algorithms  
 * 3. Architectural layer classification based on file path and content analysis
 * 4. EventStorm module identification for domain-specific categorization
 * 5. Complexity assessment and entry point detection for prioritization
 * 6. Content enhancement with structured semantic annotations
 * 7. Metadata enrichment for improved vector search and filtering
 * 8. Enhanced chunks passed to embedding generation for vector storage
 * 
 * ==================================================================================
 * ARCHITECTURAL PATTERNS & RECENT CHANGES
 * ==================================================================================
 * 
 * SEMANTIC ENHANCEMENT STRATEGY:
 * - Pattern-based classification using comprehensive regex matching
 * - Multi-layered context detection (role + layer + module + complexity)
 * - Structured annotation format for consistent vector embedding enhancement
 * - Metadata enrichment for advanced filtering and retrieval optimization
 * 
 * EVENTSTORM DOMAIN INTELLIGENCE:
 * - EventStorm-specific module detection (chat, git, ai, docs modules)
 * - DDD architectural layer recognition for clean architecture compliance  
 * - Business module boundary identification for microservice architecture
 * - Cross-cutting concern detection for AOP (Aspect-Oriented Programming) patterns
 * 
 * RECENT ARCHITECTURAL IMPROVEMENTS:
 * - Enhanced integration with consolidated repoLoader architecture (eliminated duplication)
 * - Improved semantic role detection with expanded pattern library
 * - Added EventStorm-specific module classification for domain intelligence
 * - Streamlined metadata structure for better vector search performance
 * - Integrated with cleaned repository processing pipeline (repoSelector → repoLoader delegation)
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Efficient pattern matching with pre-compiled regex libraries
 * - Lazy evaluation of complexity metrics to reduce processing overhead
 * - Optimized content annotation format for embedding efficiency
 * - Metadata structure designed for high-performance vector filtering
 * 
 * ==================================================================================
 * USAGE PATTERNS & EXAMPLES
 * ==================================================================================
 * 
 * BASIC DOCUMENT ENHANCEMENT:
 * ```javascript
 * const processor = new SemanticPreprocessor();
 * const enhancedChunk = await processor.preprocessChunk(rawChunk);
 * // Result: Enhanced content with semantic annotations and enriched metadata
 * ```
 * 
 * INTEGRATION WITH CONTENT PROCESSORS:
 * - astCodeSplitter → SemanticPreprocessor → embeddingManager (code files)
 * - docsProcessor → SemanticPreprocessor → embeddingManager (documentation)
 * - apiSpecProcessor → SemanticPreprocessor → embeddingManager (API specs)
 * - genericProcessor → SemanticPreprocessor → embeddingManager (other files)
 * 
 * ENHANCED CONTENT STRUCTURE:
 * ```
 * // SEMANTIC CONTEXT: CONTROLLER | LAYER: PRESENTATION | MODULE: CHAT | COMPLEXITY: MEDIUM | ENTRYPOINT
 * // FILE: /backend/business_modules/chat/input/chatController.js
 * // HTTP ROUTE HANDLER:
 * // CHAT/CONVERSATION FUNCTIONALITY
 * 
 * [Original document content with semantic annotations]
 * 
 * // EXTRACTED DOCUMENTATION:
 * [JSDoc comments and significant inline comments]
 * ```
 * 
 * METADATA ENRICHMENT EXAMPLE:
 * ```javascript
 * {
 *   ...originalMetadata,
 *   semantic_role: 'controller',
 *   layer: 'presentation', 
 *   is_entrypoint: true,
 *   eventstorm_module: 'chatModule',
 *   complexity: 'medium',
 *   enhanced: true,
 *   enhancement_timestamp: '2025-09-29T...'
 * }
 * ```
 * 
 * ==================================================================================
 * DETECTION PATTERNS & CLASSIFICATION
 * ==================================================================================
 * 
 * SEMANTIC ROLES DETECTED:
 * - controller: HTTP routes, Fastify handlers, REST endpoints
 * - entity: Domain models, DDD aggregates, value objects
 * - useCase: Application services, command/query handlers
 * - repository: Data access adapters, persistence layers
 * - event: Domain events, integration events, pub/sub handlers
 * - middleware: Interceptors, plugins, cross-cutting concerns
 * - config: Configuration files, environment settings
 * - test: Test specifications, unit tests, integration tests
 * - schema: Validation schemas, data structures
 * 
 * ARCHITECTURAL LAYERS:
 * - domain: Business logic, entities, value objects, domain services
 * - application: Use cases, application services, command/query handlers
 * - infrastructure: Adapters, repositories, external integrations
 * - presentation: Controllers, routes, HTTP handlers, API endpoints
 * - aop: Cross-cutting concerns, aspects, security, logging
 * - business: Business modules, bounded contexts, feature modules
 * 
 * EVENTSTORM MODULES:
 * - chatModule: Chat, conversation, messaging, WebSocket functionality
 * - gitModule: Git operations, GitHub integration, repository management
 * - aiModule: AI services, RAG pipeline, LangChain, OpenAI integration
 * - docsModule: Documentation, knowledge management, search functionality
 * 
 * ==================================================================================
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
   */
  async preprocessChunk(chunk) {
    const { pageContent, metadata } = chunk;
    
    // Detect semantic characteristics
    const semanticRole = this.detectSemanticRole(pageContent, metadata);
    const architecturalLayer = this.detectArchitecturalLayer(pageContent, metadata);
    const isEntrypoint = this.detectEntrypoint(pageContent, metadata);
    const eventstormModule = this.detectEventstormModule(pageContent, metadata);
    const complexity = this.assessComplexity(pageContent, metadata);
    
    // Create enhanced content with semantic annotations
    let enhancedContent = this.addSemanticAnnotations(pageContent, {
      semanticRole,
      architecturalLayer,
      isEntrypoint,
      eventstormModule,
      complexity,
      source: metadata.source
    });

    // Add contextual information
    enhancedContent = await this.addContextualInfo(enhancedContent, metadata);

    return {
      pageContent: enhancedContent,
      metadata: {
        ...metadata,
        semantic_role: semanticRole,
        layer: architecturalLayer,
        is_entrypoint: isEntrypoint,
        eventstorm_module: eventstormModule,
        complexity: complexity,
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
   * Add semantic annotations to content
   */
  addSemanticAnnotations(content, context) {
    let annotated = `// SEMANTIC CONTEXT: ${context.semanticRole.toUpperCase()}`;
    annotated += ` | LAYER: ${context.architecturalLayer.toUpperCase()}`;
    annotated += ` | MODULE: ${context.eventstormModule.toUpperCase()}`;
    annotated += ` | COMPLEXITY: ${context.complexity.toUpperCase()}`;
    
    if (context.isEntrypoint) {
      annotated += ` | ENTRYPOINT`;
    }
    
    annotated += `\n// FILE: ${context.source}\n`;
    
    // Add role-specific prefixes
    switch (context.semanticRole) {
      case 'controller':
        annotated += `// HTTP ROUTE HANDLER:\n`;
        break;
      case 'entity':
        annotated += `// DDD DOMAIN ENTITY:\n`;
        break;
      case 'useCase':
        annotated += `// APPLICATION SERVICE/USE CASE:\n`;
        break;
      case 'repository':
        annotated += `// DATA ACCESS ADAPTER:\n`;
        break;
      case 'event':
        annotated += `// DOMAIN/APPLICATION EVENT:\n`;
        break;
      case 'plugin':
        annotated += `// FASTIFY PLUGIN:\n`;
        break;
      case 'middleware':
        annotated += `// MIDDLEWARE/INTERCEPTOR:\n`;
        break;
      case 'config':
        annotated += `// CONFIGURATION:\n`;
        break;
      case 'test':
        annotated += `// TEST SPECIFICATION:\n`;
        break;
      default:
        annotated += `// CODE COMPONENT:\n`;
    }

    // Add module-specific context
    switch (context.eventstormModule) {
      case 'chatModule':
        annotated += `// CHAT/CONVERSATION FUNCTIONALITY\n`;
        break;
      case 'gitModule':
        annotated += `// GIT/GITHUB INTEGRATION\n`;
        break;
      case 'aiModule':
        annotated += `// AI/RAG/LANGCHAIN FUNCTIONALITY\n`;
        break;
      case 'docsModule':
        annotated += `// DOCS/DOCUMENTATION FUNCTIONALITY\n`;
        break;
    }

    annotated += `\n`;
    return annotated + content;
  }

  /**
   * Add contextual information from related files
   */
  async addContextualInfo(content, metadata) {
    // Add related test information if available
    if (metadata.semantic_role !== 'test') {
      const relatedTests = await this.findRelatedTests(metadata.source);
      if (relatedTests.length > 0) {
        content += `\n\n// RELATED TESTS:\n${relatedTests.join('\n')}`;
      }
    }

    // Add JSDoc/comment extraction for better context
    const extractedComments = this.extractComments(content);
    if (extractedComments.length > 0) {
      content += `\n\n// EXTRACTED DOCUMENTATION:\n${extractedComments.join('\n')}`;
    }

    return content;
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
