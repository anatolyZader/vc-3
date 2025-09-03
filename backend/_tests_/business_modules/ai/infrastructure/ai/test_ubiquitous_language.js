// test_ubiquitous_language.js
"use strict";

const UbiquitousLanguageProcessor = require('./rag_pipelines/data_preparation/processors/UbiquitousLanguageProcessor');

async function testUbiquitousLanguage() {
  console.log('🔄 Testing Ubiquitous Language Dictionary Integration\n');
  
  // Create a UbiquitousLanguageProcessor instance directly
  const ubiquitousLanguageProcessor = new UbiquitousLanguageProcessor();
  
  // Test documents representing different business modules
  const testDocuments = [
    {
      pageContent: `
class ConversationService {
  async startConversation(userId, title) {
    const conversation = new Conversation(userId);
    await conversation.startConversation(this.persistPort, title);
    
    // Publish domain event
    const event = new ConversationStartedEvent({
      userId,
      conversationId: conversation.conversationId,
      title
    });
    
    await this.messagingAdapter.publishEvent(event);
    return conversation.conversationId;
  }
  
  async addQuestion(conversationId, prompt) {
    const questionContent = new QuestionContent(prompt);
    const messageId = await this.persistPort.addQuestion(userId, conversationId, questionContent.content);
    return messageId;
  }
}
      `,
      metadata: {
        source: 'backend/business_modules/chat/application/services/conversationService.js',
        fileType: 'JavaScript'
      }
    },
    {
      pageContent: `
class AIService extends IAIService {
  async processPushedRepo(userId, repoId, repoData) {
    const pushedRepo = new PushedRepo(new UserId(userId), new RepoId(repoId));
    const response = await this.aiLangchainAdapter.processRepository(repoData);
    
    // Emit domain event
    const event = new RepoPushedEvent({
      userId: userId,
      repoId: repoId,
      repoData
    });
    
    await this.messagingAdapter.publishRepoPushedEvent(event);
    return response;
  }
  
  async respondToPrompt(userId, conversationId, prompt) {
    const promptVO = new Prompt(prompt);
    const aiResponse = await this.aiLangchainAdapter.generateResponse(promptVO);
    return aiResponse;
  }
}
      `,
      metadata: {
        source: 'backend/business_modules/ai/application/services/aiService.js',
        fileType: 'JavaScript'
      }
    },
    {
      pageContent: `
class GitProject {
  constructor(userId, title) {
    this.userId = new UserId(userId);
    this.projectId = new ProjectId(require('uuid').v4());
    this.title = title;
    this.repositories = [];
  }

  async create(gitPersistPort, messagingAdapter) {
    const newProjectData = {
      projectId: this.projectId.value,
      title: this.title,
      createdAt: new Date()
    };
    
    await gitPersistPort.createProject(this.userId.value, newProjectData);
    
    // Publish domain event
    const event = new ProjectCreatedEvent({ 
      userId: this.userId.value, 
      projectId: this.projectId.value, 
      title: this.title 
    });
    
    if (messagingAdapter) await messagingAdapter.publishProjectCreatedEvent(event);
    console.log('GitProject created for user', this.userId.value);
  }
}
      `,
      metadata: {
        source: 'backend/business_modules/git/domain/aggregates/gitProject.js', 
        fileType: 'JavaScript'
      }
    },
    {
      pageContent: `
class Account {
  constructor(userId, IAuthPersistPort) {
    this.accountId = uuidv4();
    this.userId = userId;
    this.createdAt = new Date();
    this.IAuthPersistPort = IAuthPersistPort;
    this.videos = [];
    this.accountType = 'standard';
  }

  async createAccount() {
    try {
      await this.IAuthPersistPort.saveAccount(this);
      console.log('Account created successfully.');
    } catch (error) {
      console.error('Error creating account:', error);
      throw error;
    }
  }

  async fetchAccountDetails(accountId) {
    try {
      const accountData = await this.IAuthPersistPort.fetchAccountDetails(accountId);
      Object.assign(this, accountData);
      return accountData;
    } catch (error) {
      console.error('Error fetching account details:', error);
      throw error;
    }
  }
}
      `,
      metadata: {
        source: 'backend/aop_modules/auth/domain/entities/account.js',
        fileType: 'JavaScript'
      }
    }
  ];
  
  console.log('📄 Testing ubiquitous language enhancement on sample documents...\n');
  
  // Test each document
  for (let i = 0; i < testDocuments.length; i++) {
    const doc = testDocuments[i];
    console.log(`📦 Document ${i + 1}: ${doc.metadata.source}`);
    
    try {
      // Apply ubiquitous language enhancement
      const enhanced = ubiquitousLanguageProcessor.enhanceWithUbiquitousLanguage(doc);
      
      console.log(`   🏷️  Business Module: ${enhanced.metadata.ubiq_business_module}`);
      console.log(`   🎯 Bounded Context: ${enhanced.metadata.ubiq_bounded_context}`);
      console.log(`   📚 Domain Events: ${enhanced.metadata.ubiq_domain_events?.join(', ') || 'none'}`);
      console.log(`   🔍 Terminology: ${enhanced.metadata.ubiq_terminology?.join(', ') || 'none'}`);
      
      // Show the contextual annotation added
      const lines = enhanced.pageContent.split('\n');
      const annotationLines = lines.filter(line => line.startsWith('//')).slice(0, 5);
      console.log(`   📝 Context Annotation:`);
      annotationLines.forEach(line => {
        console.log(`      ${line}`);
      });
      
    } catch (error) {
      console.error(`   ❌ Error processing document: ${error.message}`);
    }
    
    console.log('');
  }
  
  console.log('✅ Ubiquitous language dictionary test completed!');
}

// Run test if this file is executed directly
if (require.main === module) {
  testUbiquitousLanguage().catch(console.error);
}

module.exports = { testUbiquitousLanguage };
