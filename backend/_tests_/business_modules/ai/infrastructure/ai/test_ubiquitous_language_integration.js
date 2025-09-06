// test_ubiquitous_language_integration.js
"use strict";

const UbiquitousLanguageProcessor = require('../../../../../business_modules/ai/infrastructure/ai/rag_pipelines/data_preparation/processors/ubiquitousLanguageProcessor');

/**
 * Test the ubiquitous language dictionary integration
 * in the DataPreparationPipeline
 */
async function testUbiquitousLanguageIntegration() {
  console.log('🧪 Testing Ubiquitous Language Dictionary Integration');
  console.log('═'.repeat(60));

  try {
    // Initialize UbiquitousLanguageProcessor directly (this should load the ubiqLangDict.json)
    console.log('📚 Step 1: Initializing UbiquitousLanguageProcessor...');
    const ubiquitousLanguageProcessor = new UbiquitousLanguageProcessor();
    
    // Check if ubiquitous language dictionary was loaded
    if (ubiquitousLanguageProcessor.ubiquitousLanguage) {
      console.log('✅ Ubiquitous Language Dictionary loaded successfully!');
      console.log(`   📊 Business Modules: ${Object.keys(ubiquitousLanguageProcessor.ubiquitousLanguage.businessModules || {}).length}`);
      console.log(`   📊 Architecture Patterns: ${(ubiquitousLanguageProcessor.ubiquitousLanguage.architecture?.patterns || []).length}`);
      console.log(`   📊 Technical Terms: ${Object.keys(ubiquitousLanguageProcessor.ubiquitousLanguage.technicalTerms || {}).length}`);
      
      // List available modules
      console.log('\n🏢 Available Business Modules:');
      Object.keys(ubiquitousLanguageProcessor.ubiquitousLanguage.businessModules || {}).forEach(module => {
        const moduleData = ubiquitousLanguageProcessor.ubiquitousLanguage.businessModules[module];
        console.log(`   • ${moduleData.name}: ${moduleData.description}`);
      });
      
    } else {
      console.log('❌ Ubiquitous Language Dictionary failed to load!');
    }

    // Test document enhancement with sample documents
    console.log('\n📝 Step 2: Testing document enhancement...');
    
    const testDocuments = [
      {
        pageContent: `
class ChatService {
  async addMessage(conversationId, message) {
    return this.messageRepository.save(conversationId, message);
  }
}`,
        metadata: {
          source: 'backend/business_modules/chat/application/services/chatService.js'
        }
      },
      {
        pageContent: `
class Repository {
  constructor(id, name, url) {
    this.id = id;
    this.name = name; 
    this.url = url;
  }
}`,
        metadata: {
          source: 'backend/business_modules/git/domain/entities/repository.js'
        }
      },
      {
        pageContent: `
export class UserAuthController {
  async authenticateUser(credentials) {
    const user = await this.authService.validate(credentials);
    return this.jwtService.generateToken(user);
  }
}`,
        metadata: {
          source: 'backend/aop_modules/auth/input/userAuthController.js'
        }
      }
    ];

    for (let i = 0; i < testDocuments.length; i++) {
      const doc = testDocuments[i];
      console.log(`\n   📄 Testing document ${i + 1}: ${doc.metadata.source}`);
      
      const enhanced = ubiquitousLanguageProcessor.enhanceWithUbiquitousLanguage(doc);
      
      console.log(`      🔍 Original source: ${doc.metadata.source}`);
      console.log(`      🔍 Detected module: ${enhanced.metadata.ubiq_business_module || 'Unknown'}`);
      console.log(`      🔍 Domain context: ${enhanced.metadata.ubiq_domain_context || 'None'}`);
      console.log(`      🔍 Business terms: ${enhanced.metadata.ubiq_business_terms ? enhanced.metadata.ubiq_business_terms.length : 0} terms`);
      
      if (enhanced.metadata.ubiq_business_terms && enhanced.metadata.ubiq_business_terms.length > 0) {
        console.log(`      📚 Terms found: ${enhanced.metadata.ubiq_business_terms.slice(0, 3).join(', ')}${enhanced.metadata.ubiq_business_terms.length > 3 ? '...' : ''}`);
      }
      
      // Check if content was enhanced
      if (enhanced.pageContent !== doc.pageContent) {
        console.log(`      ✨ Content was enhanced with domain context`);
      } else {
        console.log(`      📝 Content unchanged (no enhancement needed)`);
      }
    }

    console.log('\n🎯 Step 3: Testing business module detection...');
    
    const testSources = [
      'backend/business_modules/chat/application/chatService.js',
      'backend/business_modules/ai/infrastructure/aiService.js',
      'backend/business_modules/git/domain/repository.js',
      'backend/aop_modules/auth/application/authService.js',
      'backend/business_modules/docs/input/docsController.js'
    ];
    
    testSources.forEach(source => {
      const detectedModule = ubiquitousLanguageProcessor.detectBusinessModule('', source);
      console.log(`   📁 ${source} → ${detectedModule || 'Unknown'}`);
    });
    
    console.log('\n✅ Ubiquitous Language Integration Test Completed Successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

if (require.main === module) {
  testUbiquitousLanguageIntegration();
}

module.exports = { testUbiquitousLanguageIntegration };
