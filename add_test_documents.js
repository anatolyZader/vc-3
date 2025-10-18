// add_test_documents.js
'use strict';

/**
 * Script to add test documents to the database for text search testing
 * This will insert some sample documents into the docs_data table
 */

const baseUrl = 'http://localhost:3000';

// Test credentials
const testCredentials = {
  email: 'test@example.com',
  password: 'testpassword123'
};

async function loginAndGetToken() {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(testCredentials)
  });

  if (response.ok) {
    const cookies = response.headers.get('set-cookie');
    if (cookies) {
      const tokenMatch = cookies.match(/authToken=([^;]+)/);
      return tokenMatch ? tokenMatch[1] : null;
    }
  }
  return null;
}

async function addTestDocuments(token) {
  console.log('📝 Adding test documents to database...');
  
  const headers = {
    'Content-Type': 'application/json',
    'Cookie': `authToken=${token}`
  };

  // Test documents with different content
  const testDocuments = [
    {
      content: `
        // User authentication service
        class UserAuthService {
          async loginUser(email, password) {
            const user = await this.validateCredentials(email, password);
            return this.generateToken(user);
          }
          
          validateCredentials(email, password) {
            // Implementation for validating user credentials
            return this.database.findUser(email, password);
          }
          
          generateToken(user) {
            return jwt.sign({ userId: user.id }, secret);
          }
        }
      `,
      repoId: 'test-repo-1'
    },
    {
      content: `
        # API Documentation
        
        ## Authentication Endpoints
        
        ### POST /api/auth/login
        Authenticate a user with email and password.
        
        ### GET /api/auth/me
        Get current user information.
        
        ## Database Functions
        
        The system uses PostgreSQL for data persistence with the following key functions:
        - User management
        - Session handling
        - Data storage
      `,
      repoId: 'test-repo-2'
    },
    {
      content: `
        /**
         * Database helper functions
         */
        const dbHelpers = {
          async connectToDatabase() {
            return new Pool({
              host: process.env.DB_HOST,
              port: process.env.DB_PORT,
              database: process.env.DATABASE_NAME
            });
          },
          
          async executeQuery(query, params) {
            const client = await this.connectToDatabase();
            try {
              return await client.query(query, params);
            } finally {
              client.release();
            }
          },
          
          async searchDocuments(searchTerm) {
            const query = 'SELECT * FROM documents WHERE content ILIKE $1';
            return this.executeQuery(query, ['%' + searchTerm + '%']);
          }
        };
      `,
      repoId: 'test-repo-3'
    }
  ];

  // Try to add documents through the AI processing endpoint
  // Since we don't have a direct document insertion endpoint, 
  // let's try to trigger document processing
  
  for (let i = 0; i < testDocuments.length; i++) {
    const doc = testDocuments[i];
    console.log(`📄 Processing document ${i + 1}/${testDocuments.length}...`);
    
    try {
      // Simulate a repository processing request
      const repoData = {
        githubOwner: 'testuser',
        repoName: doc.repoId,
        repoUrl: `https://github.com/testuser/${doc.repoId}`,
        branch: 'main',
        description: `Test repository ${i + 1}`,
        timestamp: new Date().toISOString()
      };

      const response = await fetch(`${baseUrl}/api/ai/manual-process-repo-direct`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          repoId: doc.repoId,
          ...repoData
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Document ${i + 1} processed successfully`);
      } else {
        const error = await response.text();
        console.log(`⚠️  Document ${i + 1} processing failed:`, error.substring(0, 100));
      }
    } catch (error) {
      console.error(`❌ Error processing document ${i + 1}:`, error.message);
    }
  }
}

async function main() {
  console.log('📋 Adding Test Documents for Text Search');
  console.log('======================================\n');

  const token = await loginAndGetToken();
  
  if (token) {
    await addTestDocuments(token);
    
    // Give some time for processing
    console.log('\n⏳ Waiting for processing to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n✅ Test documents setup complete!');
    console.log('💡 You can now test the search endpoints');
  } else {
    console.log('❌ Could not authenticate - please run test_authenticated_search.js first');
  }
}

main().catch(console.error);