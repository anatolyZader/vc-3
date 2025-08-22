// promptConfig.js
"use strict";

/**
 * Prompt Configuration Settings
 * 
 * This file contains configuration options for the prompt system.
 * Easily adjust behavior without changing core logic.
 */

const PromptConfig = {
  /**
   * Default settings for prompt selection
   */
  defaults: {
    mode: 'auto', // auto, rag, standard, code, api, general, fallback
    enableContextAnalysis: true,
    enableQuestionAnalysis: true,
    logPromptSelection: true
  },

  /**
   * Keyword mappings for question analysis
   */
  keywords: {
    application: [
      'api', 'endpoint', 'database', 'function', 'method', 'class', 
      'component', 'module', 'service', 'error', 'bug', 'code', 
      'implementation', 'configuration', 'plugin', 'middleware',
      'route', 'controller', 'model', 'schema', 'repository'
    ],
    
    api: [
      'rest', 'endpoint', 'http', 'get', 'post', 'put', 'delete', 
      'patch', 'swagger', 'openapi', 'json', 'response', 'request',
      'header', 'status code', 'authentication', 'authorization',
      'rate limit', 'cors', 'webhook'
    ],
    
    code: [
      'function', 'method', 'class', 'variable', 'loop', 'condition',
      'syntax', 'debug', 'error', 'exception', 'algorithm', 'logic',
      'refactor', 'optimize', 'performance', 'memory', 'async',
      'promise', 'callback', 'testing', 'unit test'
    ],

    general: [
      'what is', 'how does', 'explain', 'tell me about', 'history of',
      'definition of', 'meaning of', 'concept of', 'theory', 'principle',
      'example of', 'difference between', 'comparison', 'pros and cons',
      'when did', 'where did', 'why does', 'how was', 'who was', 'what are',
      'who invented', 'who discovered', 'who created', 'who developed',
      'planet', 'earth', 'universe', 'science', 'physics', 'chemistry', 'biology',
      'literature', 'art', 'music', 'culture', 'society', 'psychology',
      'philosophy', 'mathematics', 'geography', 'climate', 'weather',
      'government', 'politics', 'economics', 'religion', 'mythology',
      'ancient', 'medieval', 'modern', 'civilization', 'empire', 'dynasty'
    ]
  },

  /**
   * Context source weights for prompt selection
   */
  contextWeights: {
    apiSpec: 0.3,
    rootDocumentation: 0.2,
    moduleDocumentation: 0.25,
    githubCode: 0.25
  },

  /**
   * Thresholds for automatic prompt selection
   */
  thresholds: {
    minContextForRag: 1, // Minimum context sources needed for RAG prompt
    minKeywordMatches: 2, // Minimum keyword matches for category detection
    confidenceThreshold: 0.6 // Minimum confidence for auto-selection
  },

  /**
   * Experimental features (can be toggled on/off)
   */
  experimental: {
    dynamicPromptAdjustment: false,
    conversationContextWeighting: true,
    semanticQuestionAnalysis: false,
    adaptiveTemperature: false
  },

  /**
   * Logging configuration
   */
  logging: {
    logPromptSelection: true,
    logKeywordAnalysis: false,
    logContextAnalysis: true,
    logPerformanceMetrics: false
  }
};

module.exports = PromptConfig;
