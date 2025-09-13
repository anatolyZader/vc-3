// test_semantic_large_chunk_splitting.js
"use strict";

const EnhancedASTCodeSplitter = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/data_preparation/processors/EnhancedASTCodeSplitter');

/**
 * Test the enhanced semantic-aware large chunk splitting
 * Demonstrates the fix for naive midpoint splitting that breaks semantic boundaries
 */
async function testSemanticLargeChunkSplitting() {
  console.log('🧪 Testing Semantic-Aware Large Chunk Splitting...\n');

  const splitter = new EnhancedASTCodeSplitter({
    maxChunkSize: 800,  // Small size to force splitting
    minChunkSize: 200,
    chunkOverlap: 100
  });

  // Test case: Large code file that would be broken by naive midpoint splitting
  const largeCodeChunk = {
    pageContent: `
// User authentication and authorization module
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

/**
 * User class for handling user operations
 * This class encapsulates all user-related functionality
 */
class UserManager {
  constructor(database) {
    this.db = database;
    this.saltRounds = 12;
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret';
  }

  /**
   * Create a new user account
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Created user object
   */
  async createUser(userData) {
    const { email, password, name } = userData;
    
    // Validate input
    if (!email || !password || !name) {
      throw new Error('Missing required fields');
    }

    // Check if user already exists
    const existingUser = await this.db.findUserByEmail(email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, this.saltRounds);

    // Create user record
    const newUser = await this.db.createUser({
      email,
      password: hashedPassword,
      name,
      createdAt: new Date(),
      isActive: true
    });

    return this.sanitizeUser(newUser);
  }

  /**
   * Authenticate user login
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Authentication result with token
   */
  async authenticateUser(email, password) {
    // Find user
    const user = await this.db.findUserByEmail(email);
    if (!user || !user.isActive) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        name: user.name
      },
      this.jwtSecret,
      { expiresIn: '24h' }
    );

    return {
      user: this.sanitizeUser(user),
      token,
      expiresIn: '24h'
    };
  }

  /**
   * Validate JWT token
   * @param {string} token - JWT token to validate
   * @returns {Promise<Object>} Decoded user data
   */
  async validateToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      const user = await this.db.findUserById(decoded.userId);
      
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      return this.sanitizeUser(user);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Remove sensitive data from user object
   * @param {Object} user - User object
   * @returns {Object} Sanitized user object
   */
  sanitizeUser(user) {
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated user object
   */
  async updateUserProfile(userId, updateData) {
    const allowedFields = ['name', 'email'];
    const filteredData = {};
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    }

    if (Object.keys(filteredData).length === 0) {
      throw new Error('No valid fields to update');
    }

    const updatedUser = await this.db.updateUser(userId, filteredData);
    return this.sanitizeUser(updatedUser);
  }
}

// Helper functions for user validation
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password) {
  // At least 8 characters, one uppercase, one lowercase, one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}

module.exports = { UserManager, validateEmail, validatePassword };
    `,
    metadata: {
      source: 'user-manager.js',
      type: 'javascript',
      originalChunkSize: 'large'
    }
  };

  console.log(`📏 Original Chunk Size: ${largeCodeChunk.pageContent.length} characters`);
  console.log(`📏 Max Chunk Size Setting: ${splitter.maxChunkSize} characters`);
  console.log(`📏 Split Required: ${largeCodeChunk.pageContent.length > splitter.maxChunkSize ? 'YES' : 'NO'}\n`);

  try {
    console.log('🔪 Testing semantic-aware large chunk splitting...');
    const splitResult = await splitter.splitLargeChunk(largeCodeChunk);
    
    console.log(`✅ Split Result: ${splitResult.length} chunks created\n`);

    // Analyze each chunk
    splitResult.forEach((chunk, index) => {
      console.log(`📋 Chunk ${index + 1}/${splitResult.length}:`);
      console.log(`   Size: ${chunk.pageContent.length} characters`);
      console.log(`   Split Method: ${chunk.metadata.split_method || 'unknown'}`);
      console.log(`   Lines: ${chunk.metadata.split_lines || 'unknown'}`);
      
      // Check for semantic integrity
      const hasCompleteClass = chunk.pageContent.includes('class ') && 
                               chunk.pageContent.includes('}');
      const hasCompleteFunctions = !chunk.pageContent.includes('function ') || 
                                   chunk.pageContent.split('function ').length <= chunk.pageContent.split('}').length;
      
      console.log(`   Has Complete Class: ${hasCompleteClass ? '✅' : '❌'}`);
      console.log(`   Functions Intact: ${hasCompleteFunctions ? '✅' : '❌'}`);
      
      // Show first few lines to demonstrate split quality
      const firstLines = chunk.pageContent.split('\n').slice(0, 3);
      console.log(`   Starts With: "${firstLines.join(' | ')}..."`);
      console.log('');
    });

    // Compare with naive midpoint splitting
    console.log('🔍 Comparison with Naive Midpoint Splitting:');
    const lines = largeCodeChunk.pageContent.split('\n');
    const midPoint = Math.floor(lines.length / 2);
    const naiveSplit1 = lines.slice(0, midPoint).join('\n');
    const naiveSplit2 = lines.slice(midPoint).join('\n');
    
    console.log(`   Naive Split 1 Size: ${naiveSplit1.length} chars`);
    console.log(`   Naive Split 2 Size: ${naiveSplit2.length} chars`);
    
    // Check what naive splitting would break
    const naiveBreaksClass = naiveSplit1.includes('class ') && !naiveSplit1.trim().endsWith('}');
    const naiveBreaksFunction = naiveSplit1.split('function ').length > naiveSplit1.split('}').length;
    
    console.log(`   Naive Would Break Class: ${naiveBreaksClass ? '❌ YES' : '✅ NO'}`);
    console.log(`   Naive Would Break Function: ${naiveBreaksFunction ? '❌ YES' : '✅ NO'}`);
    
    // Show where naive splitting would cut
    const cutLine = lines[midPoint - 1];
    console.log(`   Naive Cut Location: "${cutLine.trim()}"`);
    console.log(`   Cut Quality: ${cutLine.trim() === '' || cutLine.includes('}') ? '✅ Good' : '❌ Bad'}`);

  } catch (error) {
    console.error(`❌ Test Failed: ${error.message}`);
    console.error(error.stack);
  }

  console.log('\n🎉 Semantic Large Chunk Splitting Test Complete!');
}

// Test different scenarios
async function testMultipleScenarios() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 Testing Multiple Splitting Scenarios...\n');

  const splitter = new EnhancedASTCodeSplitter({
    maxChunkSize: 600,
    minChunkSize: 150,
    chunkOverlap: 80
  });

  const scenarios = [
    {
      name: 'Class with Multiple Methods',
      content: `
class Calculator {
  constructor() { this.history = []; }
  add(a, b) { return a + b; }
  subtract(a, b) { return a - b; }
  multiply(a, b) { return a * b; }
  divide(a, b) { if (b === 0) throw new Error('Division by zero'); return a / b; }
  getHistory() { return this.history; }
}`.repeat(3), // Make it large enough to require splitting
      expectedMethod: 'splitBySemanticUnits'
    },
    {
      name: 'Multiple Independent Functions',
      content: `
function processData(data) {
  return data.map(item => item.value * 2);
}

function validateInput(input) {
  if (!input) throw new Error('Invalid input');
  return true;
}

function formatOutput(output) {
  return JSON.stringify(output, null, 2);
}

function handleError(error) {
  console.error('Error occurred:', error.message);
  return { error: true, message: error.message };
}`.repeat(2),
      expectedMethod: 'splitByASTBoundaries'
    }
  ];

  for (const scenario of scenarios) {
    console.log(`📋 Scenario: ${scenario.name}`);
    console.log(`   Content Length: ${scenario.content.length} chars`);

    try {
      const testChunk = {
        pageContent: scenario.content,
        metadata: { source: 'test.js', scenario: scenario.name }
      };

      const result = await splitter.splitLargeChunk(testChunk);
      
      console.log(`   Chunks Created: ${result.length}`);
      console.log(`   Split Method: ${result[0]?.metadata?.split_method || 'unknown'}`);
      console.log(`   Expected Method: ${scenario.expectedMethod}`);
      
      // Check if semantic boundaries are preserved
      const semanticIntegrity = result.every(chunk => {
        const content = chunk.pageContent;
        const openBraces = (content.match(/{/g) || []).length;
        const closeBraces = (content.match(/}/g) || []).length;
        return Math.abs(openBraces - closeBraces) <= 1; // Allow some tolerance
      });
      
      console.log(`   Semantic Integrity: ${semanticIntegrity ? '✅' : '❌'}`);
      console.log('');

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}\n`);
    }
  }
}

// Run all tests
if (require.main === module) {
  async function runAllTests() {
    await testSemanticLargeChunkSplitting();
    await testMultipleScenarios();
  }
  
  runAllTests().catch(console.error);
}

module.exports = { testSemanticLargeChunkSplitting, testMultipleScenarios };
