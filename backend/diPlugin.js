/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');
const { fastifyAwilixPlugin } = require('@fastify/awilix');
const { asClass, asValue, Lifetime } = require('awilix');

const infraConfig = require('./infraConfig.json');

const Video = require("./business_modules/video/domain/aggregates/video");
const CodeSnippet = require("./business_modules/video/domain/entities/codeSnippet");
const Snapshot = require("./business_modules/video/domain/entities/snapshot");
const TextSnippet = require("./business_modules/video/domain/entities/textSnippet");
const Transcript = require("./business_modules/video/domain/entities/transcript");
const VideoAppService = require('./business_modules/video/application/services/videoAppService');
const CodeSnippetService = require('./business_modules/video/application/services/codeSnippetService');
const OcrService = require('./business_modules/video/application/services/ocrService');
const TextSnippetService = require('./business_modules/video/application/services/textSnippetService');
const VideoConstructService = require('./business_modules/video/application/services/videoConstructService');
const AIAdapter = require('./business_modules/video/infrastructure/ai/aiAdapter');
const PostgresAdapter = require('./business_modules/video/infrastructure/persistence/videoPostgresAdapter');
const OcrAdapter = require('./business_modules/video/infrastructure/ocr/ocrAdapter');
const SnapshotAdapter = require('./business_modules/video/infrastructure/youtube/snapshotAdapter');

const Account = require('./aop_modules/auth/domain/entities/account');
const User = require('./aop_modules/auth/domain/entities/user');
const UserService = require('./aop_modules/auth/application/services/userService');
const PermService = require('./aop_modules/permissions/application/services/permService');
const AuthPostgresAdapter = require('./aop_modules/auth/infrastructure/persistence/authPostgresAdapter');
const AuthRedisAdapter = require('./aop_modules/auth/infrastructure/in_memory_storage/authRedisAdapter');

const ChatService = require('./business_modules/chat/application/services/chatService');
const ChatPostgresAdapter = require('./business_modules/chat/infrastructure/persistence/chatPostgresAdapter');

const GitService = require('./business_modules/git/application/services/gitService');
const GitPostgresAdapter = require('./business_modules/git/infrastructure/persistence/gitPostgresAdapter');
const GitGithubAdapter = require('./business_modules/git/infrastructure/git/gitGithubAdapter');
const GitLangchainAdapter = require('./business_modules/git/infrastructure/ai/gitLangchainAdapter');

const TargetService = require('./business_modules/target/application/services/targetService');
const TargetPostgresAdapter = require('./business_modules/target/infrastructure/persistence/targetPostgresAdapter');
const TargetGithubAdapter = require('./business_modules/target/infrastructure/git/targetGithubAdapter');
const TargetLangchainAdapter = require('./business_modules/target/infrastructure/ai/targetLangchainAdapter');

const WikiService = require('./business_modules/wiki/application/services/wikiService');
const WikiPostgresAdapter = require('./business_modules/wiki/infrastructure/persistence/wikiPostgresAdapter');
const WikiGithubAdapter = require('./business_modules/wiki/infrastructure/git/wikiGithubAdapter');

const ChecklistPostgresAdapter = require('./business_modules/checklist/infrastructure/persistence/checklistPostgresAdapter');

const AIService = require('./business_modules/ai/application/services/aiService');
const AIPostgresAdapter = require('./business_modules/ai/infrastructure/persistence/aiPostgresAdapter');
const AILangchainAdapter = require('./business_modules/ai/infrastructure/ai/aiLangchainAdapter');
const AIPubsubAdapter = require('./business_modules/ai/infrastructure/messaging/aiPubsubAdapter');
const aiPubsubAdapter = require('./business_modules/ai/infrastructure/messaging/aiPubsubAdapter');


module.exports = fp(async function (fastify, opts) {
  try {
    await fastify.register(fastifyAwilixPlugin, {
      disposeOnClose: true,
      disposeOnResponse: true,
      strictBooleanEnforced: true,
      injectionMode: 'CLASSIC',
      encapsulate: false,
    });
  } catch (error) {

    fastify.log.error(`Failed to register fastifyAwilixPlugin: ${error.message}`); 
    throw fastify.httpErrors.internalServerError(
      'Failed to register fastifyAwilixPlugin',
      { cause: error } 
    );
  }

  const adapters = {
    authPostgresAdapter: asClass(AuthPostgresAdapter).singleton(),
    authRedisAdapter: asClass(AuthRedisAdapter).singleton(),
    chatPostgresAdapter: asClass(ChatPostgresAdapter).singleton(),
    gitPostgresAdapter: asClass(GitPostgresAdapter).singleton(),
    gitGithubAdapter: asClass(GitGithubAdapter).singleton(),
    gitLangchainAdapter: asClass(GitLangchainAdapter).singleton(),
    targetPostgresAdapter: asClass(TargetPostgresAdapter).singleton(),
    targetGithubAdapter: asClass(TargetGithubAdapter).singleton(),
    targetLangchainAdapter: asClass(TargetLangchainAdapter).singleton(),
    checklistPostgresAdapter: asClass(ChecklistPostgresAdapter).singleton(),
    aiPostgresAdapter: asClass(AIPostgresAdapter).singleton(),
    aiLangchainAdapter: asClass(AILangchainAdapter).singleton(),
    aiPubsubAdapter: asClass(AIPubsubAdapter).singleton(),
    wikiPostgresAdapter: asClass(WikiPostgresAdapter).singleton(),
    wikiGithubAdapter: asClass(WikiGithubAdapter).singleton(),
  
  };

  await fastify.diContainer.register({
    video: asClass(Video),
    codeSnippet: asClass(CodeSnippet),
    snapshot: asClass(Snapshot),
    textSnippet: asClass(TextSnippet),
    transcript: asClass(Transcript),
    videoAppService: asClass(VideoAppService),
    codeSnippetService: asClass(CodeSnippetService),
    aiAdapter: asValue(AIAdapter),
    postgresAdapter: asClass(PostgresAdapter),
    ocrAdapter: asClass(OcrAdapter),
    ocrService: asClass(OcrService),
    videoController: asValue(require('./business_modules/video/application/videoController')),
    textSnippetService: asClass(TextSnippetService),
    videoConstructService: asClass(VideoConstructService),
    snapshotAdapter: asClass(SnapshotAdapter),
    account: asClass(Account),
    user: asClass(User),
    userService: asClass(UserService, {
      lifetime: Lifetime.SINGLETON,
    }),
    // authPersistAdapter: adapters[authInfraConfig.persistenceAdapter],
    // authInMemStorageAdapter: adapters[authInfraConfig.inMemStorageAdapter],
    permService: asClass(PermService),
    chatService: asClass(ChatService),
    // chatPersistAdapter: adapters[chatInfraConfig.persistenceAdapter],
    gitService: asClass(GitService),
    // gitPersistAdapter: adapters[gitInfraConfig.persistenceAdapter],
    targetService: asClass(TargetService),
    // targetPersistAdapter: adapters[targetInfraConfig.persistenceAdapter],
    wikiService: asClass(WikiService),
    wikiPersistAdapter: adapters[infraConfig.modules.wiki_module.wikiPersistAdapter],
    wikiGitAdapter: adapters[infraConfig.modules.wiki_module.wikiGitAdapter],
    authPersistAdapter: adapters[infraConfig.aop.auth.authPersistAdapter],
    // authInMemStorageAdapter: adapters[infraConfig.aop.auth.authInMemStorageAdapter],
    chatPersistAdapter: adapters[infraConfig.modules.chat_module.chatPersistAdapter],
    gitPersistAdapter: adapters[infraConfig.modules.git_module.gitPersistAdapter],
    gitGitAdapter: adapters[infraConfig.modules.git_module.gitGitAdapter],
    gitAIAdapter: adapters[infraConfig.modules.git_module.gitAIAdapter],
    targetPersistAdapter: adapters[infraConfig.modules.target_code_module.targetPersistAdapter],
    targetGitAdapter: adapters[infraConfig.modules.target_code_module.targetGitAdapter],
    targetAIAdapter: adapters[infraConfig.modules.target_code_module.targetAIAdapter],
    checklistPersistAdapter: adapters[infraConfig.modules.checklist_module.checklistPersistAdapter],
    aiService: asClass(AIService),
    aiAIAdapter: adapters[infraConfig.modules.ai_module.aiAIAdapter],
    aiPersistAdapter: adapters[infraConfig.modules.ai_module.aiPersistAdapter],
    aiPubsubAdapter: adapters[infraConfig.modules.ai_module.aiPubsubAdapter],
  });
});
