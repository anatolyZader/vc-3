// test_combined_processing.js
"use strict";

const SemanticPreprocessor = require('./rag_pipelines/SemanticPreprocessor');
const ASTCodeSplitter = require('./rag_pipelines/ASTCodeSplitter');

/**
 * Test the combination of semantic preprocessing and AST-based splitting
 */
async function testCombinedProcessing() {
  console.log('🔄 Testing Combined Semantic Preprocessing + AST Splitting\n');
  
  const preprocessor = new SemanticPreprocessor();
  const astSplitter = new ASTCodeSplitter({
    maxChunkSize: 5000, // Much larger chunks to handle complete methods
    includeComments: true,
    includeImports: true
  });
  
  // Test with a complex real-world example
  const testDocument = {
    pageContent: `
const express = require('express');
const { EventEmitter } = require('events');
const UserService = require('../domain/services/UserService');
const AuthMiddleware = require('../middleware/AuthMiddleware');

/**
 * UserController - Handles all user-related HTTP operations
 * Implements RESTful API endpoints for user management
 * @extends EventEmitter
 */
class UserController extends EventEmitter {
  constructor() {
    super();
    this.userService = new UserService();
    this.authMiddleware = new AuthMiddleware();
  }

  /**
   * Get user profile by ID
   * @route GET /api/users/:id
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<void>}
   */
  async getUserById(req, res) {
    try {
      const userId = req.params.id;
      
      // Validate user ID format
      if (!this.isValidUserId(userId)) {
        return res.status(400).json({
          error: 'Invalid user ID format',
          code: 'INVALID_USER_ID'
        });
      }

      const user = await this.userService.findById(userId);
      
      if (!user) {
        this.emit('user_not_found', { userId, ip: req.ip });
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Remove sensitive data before sending response
      const sanitizedUser = this.sanitizeUserData(user);
      
      this.emit('user_retrieved', { userId, ip: req.ip });
      res.json({
        success: true,
        data: sanitizedUser,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error retrieving user:', error);
      this.emit('user_retrieval_error', { userId: req.params.id, error: error.message });
      
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        requestId: req.id
      });
    }
  }

  /**
   * Create new user account
   * @route POST /api/users
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<void>}
   */
  async createUser(req, res) {
    try {
      const userData = req.body;
      
      // Validate required fields
      const validationError = this.validateUserData(userData);
      if (validationError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validationError,
          code: 'VALIDATION_ERROR'
        });
      }

      // Check if user already exists
      const existingUser = await this.userService.findByEmail(userData.email);
      if (existingUser) {
        return res.status(409).json({
          error: 'User already exists',
          code: 'USER_EXISTS'
        });
      }

      const newUser = await this.userService.create(userData);
      
      this.emit('user_created', { 
        userId: newUser.id, 
        email: userData.email, 
        ip: req.ip 
      });

      res.status(201).json({
        success: true,
        data: this.sanitizeUserData(newUser),
        message: 'User created successfully'
      });

    } catch (error) {
      console.error('Error creating user:', error);
      this.emit('user_creation_error', { userData: req.body, error: error.message });
      
      res.status(500).json({
        error: 'Failed to create user',
        code: 'CREATION_ERROR',
        requestId: req.id
      });
    }
  }

  /**
   * Validate user ID format
   * @private
   * @param {string} userId - User ID to validate
   * @returns {boolean} Validation result
   */
  isValidUserId(userId) {
    return userId && typeof userId === 'string' && /^[a-f0-9]{24}$/.test(userId);
  }

  /**
   * Validate user data for creation
   * @private
   * @param {Object} userData - User data to validate
   * @returns {string|null} Validation error message or null
   */
  validateUserData(userData) {
    if (!userData.email) return 'Email is required';
    if (!userData.name) return 'Name is required';
    if (!userData.password) return 'Password is required';
    
    if (!this.isValidEmail(userData.email)) {
      return 'Invalid email format';
    }
    
    if (userData.password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    
    return null;
  }

  /**
   * Validate email format
   * @private
   * @param {string} email - Email to validate
   * @returns {boolean} Validation result
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Remove sensitive data from user object
   * @private
   * @param {Object} user - User object
   * @returns {Object} Sanitized user object
   */
  sanitizeUserData(user) {
    const { password, refreshToken, ...sanitized } = user;
    return sanitized;
  }
}

module.exports = UserController;
    `,
    metadata: {
      source: 'backend/business_modules/user/input/UserController.js',
      userId: 'test-user',
      repoId: 'eventstorm',
      fileType: 'JavaScript'
    }
  };

  console.log('📥 Step 1: Applying semantic preprocessing...');
  
  // Step 1: Apply semantic preprocessing
  const semanticallyEnhanced = await preprocessor.preprocessChunk(testDocument);
  
  console.log(`✅ Semantic preprocessing complete:`);
  console.log(`   Role: ${semanticallyEnhanced.metadata.semantic_role}`);
  console.log(`   Layer: ${semanticallyEnhanced.metadata.layer}`);
  console.log(`   Module: ${semanticallyEnhanced.metadata.eventstorm_module}`);
  console.log(`   Entry Point: ${semanticallyEnhanced.metadata.is_entrypoint}`);
  console.log(`   Complexity: ${semanticallyEnhanced.metadata.complexity}`);
  
  // Step 2: Apply AST-based splitting
  console.log(`\n🌳 Step 2: Applying AST-based splitting...`);
  
  const astChunks = await astSplitter.splitCodeDocument(semanticallyEnhanced);
  
  console.log(`✅ AST splitting complete: ${astChunks.length} chunks created\n`);
  
  // Step 3: Analyze the results
  console.log(`📊 Step 3: Results Analysis`);
  console.log(`${'═'.repeat(80)}`);
  
  astChunks.forEach((chunk, index) => {
    console.log(`\n📦 Chunk ${index + 1}/${astChunks.length}:`);
    console.log(`   🏷️  Source: ${chunk.metadata.source}`);
    console.log(`   🧠 Semantic: ${chunk.metadata.semantic_role} | ${chunk.metadata.layer} | ${chunk.metadata.eventstorm_module}`);
    console.log(`   🌳 AST: ${chunk.metadata.chunk_type} | ${chunk.metadata.semantic_unit} | ${chunk.metadata.function_name}`);
    console.log(`   📏 Size: ${chunk.pageContent.length} chars | Lines: ${chunk.metadata.start_line}-${chunk.metadata.end_line}`);
    console.log(`   📚 Includes Imports: ${chunk.metadata.includes_imports}`);
    console.log(`   🎯 Entry Point: ${chunk.metadata.is_entrypoint} | Complexity: ${chunk.metadata.complexity}`);
    
    // Show enhanced content structure
    const lines = chunk.pageContent.split('\n').slice(0, 8); // First 8 lines
    console.log(`   📄 Content Preview:`);
    lines.forEach((line, idx) => {
      if (idx < 5) { // Show first 5 lines
        const trimmed = line.length > 70 ? line.substring(0, 70) + '...' : line;
        console.log(`      ${idx + 1}: ${trimmed}`);
      }
    });
    
    if (chunk.pageContent.split('\n').length > 8) {
      console.log(`      ... (${chunk.pageContent.split('\n').length - 8} more lines)`);
    }
  });
  
  // Step 4: Demonstrate search relevance improvements
  console.log(`\n🔍 Step 4: Search Relevance Simulation`);
  console.log(`${'═'.repeat(80)}`);
  
  const searchQueries = [
    "How do I create a new user?",
    "Show me user validation logic",
    "What are the private helper methods?",
    "How does error handling work in user operations?"
  ];
  
  for (const query of searchQueries) {
    console.log(`\n🔍 Query: "${query}"`);
    
    // Simulate relevance scoring based on enhanced metadata
    const relevantChunks = astChunks
      .map((chunk, index) => ({
        index: index + 1,
        chunk,
        relevanceScore: calculateRelevanceScore(query, chunk)
      }))
      .filter(item => item.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 2); // Top 2 most relevant
    
    console.log(`   📋 Most relevant chunks:`);
    relevantChunks.forEach(item => {
      console.log(`      Chunk ${item.index}: ${item.chunk.metadata.function_name} (score: ${item.relevanceScore})`);
    });
  }
}

/**
 * Calculate relevance score for a query and chunk
 */
function calculateRelevanceScore(query, chunk) {
  let score = 0;
  const queryLower = query.toLowerCase();
  const content = chunk.pageContent.toLowerCase();
  const functionName = (chunk.metadata.function_name || '').toLowerCase();
  
  // Function name relevance
  if (queryLower.includes('create') && functionName.includes('create')) score += 10;
  if (queryLower.includes('validate') && functionName.includes('valid')) score += 10;
  if (queryLower.includes('helper') && functionName.includes('valid')) score += 8;
  if (queryLower.includes('error') && content.includes('error')) score += 5;
  
  // Content relevance
  if (queryLower.includes('user') && content.includes('user')) score += 3;
  if (queryLower.includes('create') && content.includes('create')) score += 5;
  if (queryLower.includes('validate') && content.includes('validat')) score += 5;
  if (queryLower.includes('private') && content.includes('@private')) score += 7;
  
  return score;
}

/**
 * Test with a real repository file
 */
async function testWithRealFile() {
  console.log('\n🔬 Testing with Real Repository File');
  console.log(`${'═'.repeat(80)}`);
  
  const fs = require('fs');
  const path = require('path');
  
  const preprocessor = new SemanticPreprocessor();
  const astSplitter = new ASTCodeSplitter({
    maxChunkSize: 5000 // Allow larger chunks for complete methods
  });
  
  // Test with actual aiService.js file
  const realFilePath = '/home/myzader/eventstorm/backend/business_modules/ai/application/services/aiService.js';
  
  try {
    if (fs.existsSync(realFilePath)) {
      const content = await fs.promises.readFile(realFilePath, 'utf8');
      
      const realDocument = {
        pageContent: content,
        metadata: {
          source: 'backend/business_modules/ai/application/services/aiService.js',
          userId: 'test-user',
          repoId: 'eventstorm',
          fileType: 'JavaScript'
        }
      };
      
      console.log(`📄 Processing real file: ${realDocument.metadata.source}`);
      console.log(`📏 Size: ${content.length} characters`);
      
      // Apply combined processing
      const enhanced = await preprocessor.preprocessChunk(realDocument);
      const chunks = await astSplitter.splitCodeDocument(enhanced);
      
      console.log(`\n✅ Results:`);
      console.log(`   Semantic Role: ${enhanced.metadata.semantic_role}`);
      console.log(`   Architectural Layer: ${enhanced.metadata.layer}`);
      console.log(`   EventStorm Module: ${enhanced.metadata.eventstorm_module}`);
      console.log(`   AST Chunks Created: ${chunks.length}`);
      
      chunks.forEach((chunk, index) => {
        if (index < 3) { // Show first 3 chunks
          console.log(`\n   Chunk ${index + 1}: ${chunk.metadata.function_name || 'unknown'}`);
          console.log(`      Type: ${chunk.metadata.chunk_type}`);
          console.log(`      Size: ${chunk.pageContent.length} chars`);
        }
      });
      
      if (chunks.length > 3) {
        console.log(`   ... and ${chunks.length - 3} more chunks`);
      }
      
    } else {
      console.log('⚠️  Real file not found, skipping real file test');
    }
  } catch (error) {
    console.log(`❌ Error processing real file: ${error.message}`);
  }
}

// Run the tests
async function runAllTests() {
  try {
    await testCombinedProcessing();
    await testWithRealFile();
    console.log('\n✅ All combined processing tests completed successfully!');
  } catch (error) {
    console.error('❌ Combined processing tests failed:', error);
  }
}

if (require.main === module) {
  runAllTests();
}

module.exports = { testCombinedProcessing, testWithRealFile };
