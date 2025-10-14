// test_semantic_purity.js
"use strict";

/**
 * Test to verify SemanticPreprocessor metadata-only approach for embedding purity
 */

const SemanticPreprocessor = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/enhancers/semanticPreprocessor');

async function testSemanticPurity() {
  console.log('🔬 Testing Semantic Preprocessing - Embedding Purity Test\n');
  console.log('='.repeat(60));
  console.log('=== Before/After Comparison for pageContent Purity ===');
  console.log('='.repeat(60) + '\n');

  const preprocessor = new SemanticPreprocessor();

  // Test with a realistic code chunk
  const testChunk = {
    pageContent: `
class ChatService {
  constructor(chatRepository, eventBus) {
    this.chatRepository = chatRepository;
    this.eventBus = eventBus;
  }

  async createConversation(userId, title) {
    const conversation = new Conversation({
      userId,
      title,
      createdAt: new Date()
    });
    
    await this.chatRepository.save(conversation);
    
    // Emit domain event
    this.eventBus.emit('ConversationCreated', {
      conversationId: conversation.id,
      userId
    });
    
    return conversation;
  }

  async addMessage(conversationId, message) {
    const conversation = await this.chatRepository.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    
    conversation.addMessage(message);
    await this.chatRepository.save(conversation);
    
    return conversation;
  }
}
`,
    metadata: {
      source: 'backend/business_modules/chat/application/services/chatService.js',
      userId: 'test-user',
      repoId: 'eventstorm-test'
    }
  };

  console.log('📄 ORIGINAL pageContent (first 200 chars):');
  console.log('─'.repeat(60));
  console.log(testChunk.pageContent.substring(0, 200).replace(/\n/g, '\\n'));
  console.log('...\n');

  console.log('🧠 Processing with SemanticPreprocessor...\n');

  // Process with our refactored semantic preprocessor
  const enhanced = await preprocessor.preprocessChunk(testChunk);

  console.log('✨ ENHANCED RESULTS:');
  console.log('=== PURITY CHECK ===');
  
  // Check if pageContent is unchanged (pure)
  const isPageContentPure = enhanced.pageContent === testChunk.pageContent;
  console.log(`🎯 pageContent unchanged (pure): ${isPageContentPure ? '✅ YES' : '❌ NO'}`);
  
  if (!isPageContentPure) {
    console.log('\n❌ PURITY VIOLATION - pageContent was modified:');
    console.log('Original length:', testChunk.pageContent.length);
    console.log('Enhanced length:', enhanced.pageContent.length);
    console.log('First 200 chars of enhanced:');
    console.log(enhanced.pageContent.substring(0, 200));
  } else {
    console.log('✅ PURITY MAINTAINED - pageContent preserved for clean embeddings\n');
  }

  console.log('📊 METADATA ENHANCEMENTS:');
  console.log('─'.repeat(60));
  console.log(`🎯 Semantic Role: ${enhanced.metadata.semantic_role}`);
  console.log(`🏗️  Architectural Layer: ${enhanced.metadata.layer}`);
  console.log(`🔧 EventStorm Module: ${enhanced.metadata.eventstorm_module}`);
  console.log(`🚪 Entry Point: ${enhanced.metadata.is_entrypoint}`);
  console.log(`📊 Complexity: ${enhanced.metadata.complexity}`);
  console.log(`✨ Enhanced: ${enhanced.metadata.enhanced}`);
  console.log(`⏰ Timestamp: ${enhanced.metadata.enhancement_timestamp}`);

  // Show semantic annotation (stored in metadata)
  if (enhanced.metadata.semantic_annotation) {
    console.log('\n🏷️  SEMANTIC ANNOTATION (stored in metadata):');
    console.log('─'.repeat(60));
    if (enhanced.metadata.semantic_annotation.summary) {
      console.log(`📝 Summary: ${enhanced.metadata.semantic_annotation.summary}`);
    }
    if (enhanced.metadata.semantic_annotation.role_description) {
      console.log(`🎭 Role: ${enhanced.metadata.semantic_annotation.role_description}`);
    }
    if (enhanced.metadata.semantic_annotation.module_description) {
      console.log(`🔧 Module: ${enhanced.metadata.semantic_annotation.module_description}`);
    }
  }

  // Show contextual info (stored in metadata)
  if (enhanced.metadata.related_tests && enhanced.metadata.related_tests.length > 0) {
    console.log('\n🧪 RELATED TESTS (stored in metadata):');
    enhanced.metadata.related_tests.forEach(test => console.log(`   • ${test}`));
  }

  if (enhanced.metadata.extracted_comments && enhanced.metadata.extracted_comments.length > 0) {
    console.log('\n💬 EXTRACTED COMMENTS (stored in metadata):');
    enhanced.metadata.extracted_comments.slice(0, 3).forEach(comment => {
      console.log(`   • ${comment.substring(0, 80)}${comment.length > 80 ? '...' : ''}`);
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('🎯 EMBEDDING PURITY ASSESSMENT:');
  console.log('='.repeat(80));
  
  if (isPageContentPure) {
    console.log('✅ SUCCESS: pageContent remains pure for high-quality embeddings');
    console.log('✅ SUCCESS: All semantic context preserved in metadata');
    console.log('✅ SUCCESS: RAG retrieval will match actual content, not annotations');
    console.log('✅ SUCCESS: Semantic context available for query processing via metadata');
  } else {
    console.log('❌ FAILURE: pageContent was polluted with annotations');
    console.log('❌ IMPACT: Embeddings will include artificial annotation noise');
    console.log('❌ IMPACT: Query matching may be degraded');
  }

  console.log('\n🎉 Test completed!');
}

// Run the test
if (require.main === module) {
  testSemanticPurity().catch(console.error);
}

module.exports = testSemanticPurity;