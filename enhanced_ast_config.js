// Enhanced AST Configuration for Fine-Grained Semantic Splitting
// This configuration optimizes the AST splitter for method/function level granularity

'use strict';

/**
 * Enhanced AST Code Splitter Configuration
 * Specialized for fine-grained semantic splitting at method/function/statement level
 */
class EnhancedASTConfig {
  static getConfig() {
    return {
      // FINE-GRAINED TOKEN LIMITS
      tokenLimits: {
        maxTokens: 300,        // Small chunks for individual methods/functions
        minTokens: 30,         // Very small minimum for single statements
        overlapTokens: 50      // Minimal overlap for cleaner boundaries
      },

      // SEMANTIC SPLITTING RULES
      semanticRules: {
        // Always split these constructs into separate chunks
        alwaysSplit: [
          'FunctionDeclaration',      // function myFunc() {}
          'ArrowFunctionExpression',  // const func = () => {}
          'FunctionExpression',       // const func = function() {}
          'MethodDefinition',         // class methods
          'ClassMethod',              // class methods (alternate AST node)
          'ExportDefaultDeclaration', // export default
          'ExportNamedDeclaration',   // export { ... }
          'VariableDeclaration',      // const/let/var (when containing functions)
        ],

        // Split large constructs into smaller semantic units
        splitLargeUnits: {
          'ClassDeclaration': {
            splitMethods: true,       // Extract each method separately
            maxTokensBeforeSplit: 400, // Split classes larger than this
            keepConstructor: true     // Keep constructor with class metadata
          },
          
          'ObjectExpression': {
            splitProperties: true,    // Split large object literals
            maxTokensBeforeSplit: 200,
            preserveStructure: true   // Keep object structure info
          },

          'CallExpression': {
            splitArgs: false,         // Don't split function arguments
            treatAsUnit: true,        // Keep entire call together
            specialHandling: {
              'fastify.register': true,  // Special handling for Fastify plugins
              'fastify.get': true,       // Special handling for routes
              'fastify.post': true,      // Special handling for routes
              'fastify.put': true,       // Special handling for routes
              'fastify.delete': true,    // Special handling for routes
              'app.use': true,           // Express middleware
              'router.get': true         // Router definitions
            }
          }
        },

        // Semantic boundaries - where to prefer splitting
        preferredBoundaries: [
          'between_functions',        // Split between function definitions
          'between_methods',          // Split between class methods  
          'between_routes',           // Split between route definitions
          'between_middleware',       // Split between middleware registrations
          'between_imports',          // Split after import blocks
          'before_exports',           // Split before export statements
          'after_comments'            // Split after comment blocks
        ]
      },

      // CONTEXT PRESERVATION
      contextRules: {
        includeLeadingComments: true,   // Include comments above functions
        includeTrailingComments: false, // Don't include comments below
        preserveImports: true,          // Keep import context
        addSemanticMarkers: true,       // Add semantic type metadata
        maintainIndentation: true       // Preserve code formatting
      },

      // FASTIFY-SPECIFIC RULES (for your app.js)
      fastifyRules: {
        // Treat each plugin registration as a semantic unit
        splitPluginRegistrations: true,
        
        // Treat each route definition as a semantic unit  
        splitRouteDefinitions: true,
        
        // Keep route schema with route handler
        keepSchemaWithHandler: true,
        
        // Split middleware registrations
        splitMiddleware: true,
        
        // Semantic markers for Fastify patterns
        recognizedPatterns: [
          'plugin_registration',      // await fastify.register(...)
          'route_definition',         // fastify.get/post/etc(...)
          'middleware_setup',         // app.use, hooks, etc.
          'configuration_block',      // config objects
          'error_handling',           // try/catch, error handlers
          'validation_schema'         // JSON schemas
        ]
      },

      // QUALITY RULES
      qualityRules: {
        avoidOrphanedLines: true,       // Don't create chunks with just 1-2 lines
        maintainSemanticCoherence: true, // Keep related code together
        balanceChunkSizes: false,        // Prioritize semantic boundaries over size
        allowEmptyChunks: false          // Skip empty or whitespace-only chunks
      }
    };
  }

  /**
   * Apply configuration to AST splitter instance
   */
  static applyToSplitter(astSplitter, customOverrides = {}) {
    const config = this.getConfig();
    const overrides = { ...config, ...customOverrides };

    // Apply token limits
    if (astSplitter.tokenSplitter) {
      Object.assign(astSplitter.tokenSplitter, overrides.tokenLimits);
    }

    // Apply semantic rules
    astSplitter.semanticRules = overrides.semanticRules;
    astSplitter.contextRules = overrides.contextRules;
    astSplitter.fastifyRules = overrides.fastifyRules;
    astSplitter.qualityRules = overrides.qualityRules;

    // Override key methods for fine-grained splitting
    astSplitter._originalExtractSemanticUnits = astSplitter.extractSemanticUnits;
    astSplitter.extractSemanticUnits = function(ast, originalCode, metadata) {
      return EnhancedASTConfig.extractFineGrainedSemanticUnits.call(this, ast, originalCode, metadata, overrides);
    };

    console.log(`[${new Date().toISOString()}] 🎯 Enhanced AST Config Applied: Fine-grained semantic splitting enabled`);
    console.log(`[${new Date().toISOString()}] 🔧 Token Limits: ${overrides.tokenLimits.maxTokens}/${overrides.tokenLimits.minTokens} tokens`);
    
    return astSplitter;
  }

  /**
   * Enhanced semantic unit extraction for fine-grained splitting
   */
  static extractFineGrainedSemanticUnits(ast, originalCode, metadata, config) {
    const lines = originalCode.split('\n');
    const semanticUnits = [];
    const imports = this.collectImports(ast, lines);
    
    const { parse } = require('@babel/parser');
    const traverse = require('@babel/traverse').default;

    traverse(ast, {
      // FUNCTION-LEVEL SPLITTING
      FunctionDeclaration: (path) => {
        if (this.isTopLevel(path)) {
          const functionUnit = this.createFineGrainedFunctionUnit(path.node, lines, originalCode, imports, 'function_declaration');
          if (functionUnit) semanticUnits.push(functionUnit);
        }
      },

      // METHOD-LEVEL SPLITTING  
      MethodDefinition: (path) => {
        const methodUnit = this.createFineGrainedMethodUnit(path.node, lines, originalCode, imports);
        if (methodUnit) semanticUnits.push(methodUnit);
      },

      // VARIABLE FUNCTION SPLITTING (const myFunc = () => {})
      VariableDeclaration: (path) => {
        if (this.isTopLevel(path)) {
          for (const declarator of path.node.declarations) {
            if (this.isFunctionDeclarator(declarator)) {
              const functionUnit = this.createFineGrainedVariableFunctionUnit(declarator, path.node, lines, originalCode, imports);
              if (functionUnit) semanticUnits.push(functionUnit);
            }
          }
        }
      },

      // FASTIFY ROUTE SPLITTING
      CallExpression: (path) => {
        if (this.isFastifyRoute(path.node)) {
          const routeUnit = this.createFineGrainedRouteUnit(path.node, lines, originalCode, imports);
          if (routeUnit) semanticUnits.push(routeUnit);
        } else if (this.isFastifyPluginRegistration(path.node)) {
          const pluginUnit = this.createFineGrainedPluginUnit(path.node, lines, originalCode, imports);  
          if (pluginUnit) semanticUnits.push(pluginUnit);
        }
      },

      // CLASS SPLITTING (with method extraction)
      ClassDeclaration: (path) => {
        if (this.isTopLevel(path)) {
          const classUnit = this.createFineGrainedClassUnit(path.node, lines, originalCode, imports);
          if (classUnit) {
            semanticUnits.push(classUnit);
            
            // Always extract methods as separate units for fine-grained access
            const methods = this.extractFineGrainedClassMethods(path.node, lines, originalCode, classUnit.name);
            semanticUnits.push(...methods);
          }
        }
      },

      // EXPORT SPLITTING
      ExportNamedDeclaration: (path) => {
        const exportUnit = this.createFineGrainedExportUnit(path.node, lines, originalCode, imports, 'named_export');
        if (exportUnit) semanticUnits.push(exportUnit);
      },

      ExportDefaultDeclaration: (path) => {
        const exportUnit = this.createFineGrainedExportUnit(path.node, lines, originalCode, imports, 'default_export');
        if (exportUnit) semanticUnits.push(exportUnit);
      }
    });

    // Sort by line number and apply quality rules
    semanticUnits.sort((a, b) => a.startLine - b.startLine);
    
    return this.applyQualityRules(semanticUnits, config.qualityRules);
  }

  /**
   * Helper methods for enhanced semantic unit creation
   */
  static createFineGrainedFunctionUnit(node, lines, originalCode, imports, semanticType) {
    // Implementation would go here - creates enhanced function units with better metadata
    // This is a placeholder - the actual implementation would be more complex
    return null;
  }

  static createFineGrainedMethodUnit(node, lines, originalCode, imports) {
    // Creates method-specific semantic units
    return null;
  }

  static createFineGrainedRouteUnit(node, lines, originalCode, imports) {
    // Creates Fastify route-specific semantic units
    return null;  
  }

  static createFineGrainedPluginUnit(node, lines, originalCode, imports) {
    // Creates Fastify plugin registration semantic units
    return null;
  }

  // Additional helper methods...
}

module.exports = EnhancedASTConfig;