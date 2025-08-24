// test_ast_splitting.js
"use strict";

const ASTCodeSplitter = require('./rag_pipelines/ASTCodeSplitter');

/**
 * Test AST-based code splitting functionality
 */
async function testASTSplitting() {
  console.log('🌳 Testing AST-Based Code Splitting\n');
  
  const splitter = new ASTCodeSplitter({
    maxChunkSize: 2000,
    includeComments: true,
    includeImments: true
  });
  
  // Test cases with different code structures
  const testCases = [
    {
      name: "Complex Controller with Multiple Methods",
      content: `
const express = require('express');
const UserService = require('../services/UserService');

/**
 * UserController - Handles user-related HTTP requests
 * @class UserController
 */
class UserController {
  constructor() {
    this.userService = new UserService();
  }

  /**
   * Get user by ID
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getUserById(req, res) {
    try {
      const userId = req.params.id;
      const user = await this.userService.findById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Create new user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async createUser(req, res) {
    try {
      const userData = req.body;
      const newUser = await this.userService.create(userData);
      res.status(201).json(newUser);
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  }

  /**
   * Update user
   * @param {Request} req - Express request object  
   * @param {Response} res - Express response object
   */
  async updateUser(req, res) {
    try {
      const userId = req.params.id;
      const updateData = req.body;
      const updatedUser = await this.userService.update(userId, updateData);
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
}

module.exports = UserController;
      `,
      metadata: {
        source: 'controllers/UserController.js',
        userId: 'test-user',
        repoId: 'test-repo'
      }
    },
    {
      name: "Multiple Functions and Exports",
      content: `
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Generate a random token
 * @param {number} length - Token length
 * @returns {string} Random token
 */
function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Verify password against hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} Verification result
 */
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Validation result
 */
const validateEmail = (email) => {
  return EMAIL_REGEX.test(email);
};

/**
 * Generate JWT payload
 * @param {Object} user - User object
 * @returns {Object} JWT payload
 */
const createJWTPayload = (user) => ({
  sub: user.id,
  email: user.email,
  role: user.role,
  iat: Math.floor(Date.now() / 1000)
});

module.exports = {
  generateToken,
  hashPassword,
  verifyPassword,
  validateEmail,
  createJWTPayload
};
      `,
      metadata: {
        source: 'utils/auth.js',
        userId: 'test-user',
        repoId: 'test-repo'
      }
    },
    {
      name: "Modern JavaScript with Arrow Functions",
      content: `
import { EventEmitter } from 'events';
import WebSocket from 'ws';

/**
 * WebSocket Chat Handler
 */
export class ChatHandler extends EventEmitter {
  constructor(options = {}) {
    super();
    this.clients = new Map();
    this.rooms = new Map();
    this.maxClients = options.maxClients || 1000;
  }

  /**
   * Handle new WebSocket connection
   */
  handleConnection = (ws, request) => {
    const clientId = this.generateClientId();
    
    this.clients.set(clientId, {
      ws,
      rooms: new Set(),
      metadata: {
        ip: request.socket.remoteAddress,
        connectedAt: new Date()
      }
    });

    ws.on('message', (data) => this.handleMessage(clientId, data));
    ws.on('close', () => this.handleDisconnect(clientId));
    ws.on('error', (error) => this.handleError(clientId, error));

    this.emit('client_connected', { clientId, clientCount: this.clients.size });
  };

  /**
   * Handle incoming messages
   */
  handleMessage = async (clientId, rawData) => {
    try {
      const message = JSON.parse(rawData);
      
      switch (message.type) {
        case 'join_room':
          await this.joinRoom(clientId, message.room);
          break;
        case 'leave_room':
          await this.leaveRoom(clientId, message.room);
          break;
        case 'chat_message':
          await this.broadcastMessage(clientId, message);
          break;
        default:
          console.warn(\`Unknown message type: \${message.type}\`);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  };

  /**
   * Generate unique client ID
   */
  generateClientId = () => {
    return \`client_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;
  };
}

export default ChatHandler;
      `,
      metadata: {
        source: 'handlers/ChatHandler.js',
        userId: 'test-user',
        repoId: 'test-repo'
      }
    }
  ];
  
  // Test each case
  for (const testCase of testCases) {
    console.log(`📄 Testing: ${testCase.name}`);
    console.log(`${'─'.repeat(60)}`);
    
    const mockDocument = {
      pageContent: testCase.content,
      metadata: testCase.metadata
    };
    
    try {
      const chunks = await splitter.splitCodeDocument(mockDocument);
      
      console.log(`✅ Success: Split into ${chunks.length} chunks`);
      
      chunks.forEach((chunk, index) => {
        console.log(`\n📦 Chunk ${index + 1}:`);
        console.log(`   Type: ${chunk.metadata.chunk_type || 'regular'}`);
        console.log(`   Semantic Unit: ${chunk.metadata.semantic_unit || 'n/a'}`);
        console.log(`   Function Name: ${chunk.metadata.function_name || 'n/a'}`);
        console.log(`   Lines: ${chunk.metadata.start_line || '?'}-${chunk.metadata.end_line || '?'}`);
        console.log(`   Size: ${chunk.pageContent.length} chars`);
        console.log(`   Includes Imports: ${chunk.metadata.includes_imports || false}`);
        
        // Show first 200 chars of content
        const preview = chunk.pageContent.substring(0, 200).replace(/\n/g, '\\n');
        console.log(`   Preview: ${preview}${chunk.pageContent.length > 200 ? '...' : ''}`);
      });
      
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }
    
    console.log(`\n${'═'.repeat(60)}\n`);
  }
}

/**
 * Test edge cases and error handling
 */
async function testEdgeCases() {
  console.log('🔍 Testing AST Splitting Edge Cases\n');
  
  const splitter = new ASTCodeSplitter();
  
  const edgeCases = [
    {
      name: "Invalid JavaScript Syntax",
      content: "function broken( { console.log('missing closing'); ",
      metadata: { source: 'broken.js' }
    },
    {
      name: "Empty File",
      content: "",
      metadata: { source: 'empty.js' }
    },
    {
      name: "Only Comments",
      content: `
        // This file only contains comments
        /* No actual code here */
        // Just comments everywhere
      `,
      metadata: { source: 'comments.js' }
    },
    {
      name: "Non-JavaScript File",
      content: "This is plain text, not JavaScript",
      metadata: { source: 'readme.txt' }
    },
    {
      name: "Minified Code",
      content: "function a(){return b(c)}const d=e=>f(g,h);module.exports={a,d};",
      metadata: { source: 'minified.min.js' }
    }
  ];
  
  for (const testCase of edgeCases) {
    console.log(`🔍 Testing: ${testCase.name}`);
    
    const mockDocument = {
      pageContent: testCase.content,
      metadata: testCase.metadata
    };
    
    try {
      const chunks = await splitter.splitCodeDocument(mockDocument);
      console.log(`✅ Handled gracefully: ${chunks.length} chunks returned`);
      
      if (chunks[0] && chunks[0].metadata) {
        console.log(`   Fallback reason: ${chunks[0].metadata.fallback_reason || 'none'}`);
        console.log(`   Chunk type: ${chunks[0].metadata.chunk_type || 'regular'}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log('');
  }
}

/**
 * Performance test with large code files
 */
async function testPerformance() {
  console.log('⚡ Testing AST Splitting Performance\n');
  
  const splitter = new ASTCodeSplitter();
  
  // Generate a large code file
  const generateLargeCodeFile = () => {
    let content = `
const express = require('express');
const router = express.Router();

`;
    
    for (let i = 0; i < 50; i++) {
      content += `
/**
 * Handler function ${i}
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
async function handler${i}(req, res) {
  try {
    const data = await processRequest${i}(req.body);
    const result = await validateData${i}(data);
    const output = await transformResult${i}(result);
    
    if (!output) {
      return res.status(400).json({ error: 'Invalid data for handler ${i}' });
    }
    
    res.json({
      success: true,
      data: output,
      timestamp: new Date().toISOString(),
      handler: 'handler${i}'
    });
  } catch (error) {
    console.error('Error in handler${i}:', error);
    res.status(500).json({ 
      error: 'Internal server error in handler ${i}',
      timestamp: new Date().toISOString()
    });
  }
}

router.post('/api/endpoint${i}', handler${i});
`;
    }
    
    content += '\nmodule.exports = router;';
    return content;
  };
  
  const largeContent = generateLargeCodeFile();
  console.log(`📏 Generated test file: ${largeContent.length} characters, ${largeContent.split('\n').length} lines`);
  
  const mockDocument = {
    pageContent: largeContent,
    metadata: {
      source: 'large-router.js',
      userId: 'test-user',
      repoId: 'test-repo'
    }
  };
  
  const startTime = Date.now();
  
  try {
    const chunks = await splitter.splitCodeDocument(mockDocument);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ Performance test completed:`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Input size: ${largeContent.length} chars`);
    console.log(`   Output chunks: ${chunks.length}`);
    console.log(`   Average chunk size: ${Math.round(chunks.reduce((sum, c) => sum + c.pageContent.length, 0) / chunks.length)} chars`);
    console.log(`   Processing rate: ${Math.round(largeContent.length / duration * 1000)} chars/second`);
    
  } catch (error) {
    console.log(`❌ Performance test failed: ${error.message}`);
  }
}

// Run all tests
async function runAllTests() {
  try {
    await testASTSplitting();
    await testEdgeCases();
    await testPerformance();
    console.log('✅ All AST splitting tests completed!');
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

if (require.main === module) {
  runAllTests();
}

module.exports = { testASTSplitting, testEdgeCases, testPerformance };
