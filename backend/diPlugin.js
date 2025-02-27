/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');
const { fastifyAwilixPlugin } = require('@fastify/awilix');
const { asClass, asValue, Lifetime } = require('awilix');

const infraConfig = require('./infraConfig.json');

const Account = require('./aop_modules/auth/domain/entities/account');
const User = require('./aop_modules/auth/domain/entities/user');
const UserService = require('./aop_modules/auth/application/services/userService');
const PermService = require('./aop_modules/permissions/application/services/permService');
const AuthPostgresAdapter = require('./aop_modules/auth/infrastructure/persistence/authPostgresAdapter');
const AuthRedisAdapter = require('./aop_modules/auth/infrastructure/in_memory_storage/authRedisAdapter');

const ChatService = require('./business_modules/chat/application/services/chatService');
const ChatPostgresAdapter = require('./business_modules/chat/infrastructure/persistence/chatPostgresAdapter');
const ChatPubsubAdapter = require('./business_modules/chat/infrastructure/messaging/pubsub/chatPubsubAdapter');

const GitService = require('./business_modules/git/application/services/gitService');
const GitPostgresAdapter = require('./business_modules/git/infrastructure/persistence/gitPostgresAdapter');
const GitGithubAdapter = require('./business_modules/git/infrastructure/git/gitGithubAdapter');
const GitLangchainAdapter = require('./business_modules/git/infrastructure/ai/gitLangchainAdapter');
const GitPubsubAdapter = require('./business_modules/git/infrastructure/messaging/pubsub/gitPubsubAdapter');

const TargetService = require('./business_modules/target/application/services/targetService');
const TargetPostgresAdapter = require('./business_modules/target/infrastructure/persistence/targetPostgresAdapter');
const TargetGithubAdapter = require('./business_modules/target/infrastructure/git/targetGithubAdapter');
const TargetLangchainAdapter = require('./business_modules/target/infrastructure/ai/targetLangchainAdapter');

const WikiService = require('./business_modules/wiki/application/services/wikiService');
const WikiPostgresAdapter = require('./business_modules/wiki/infrastructure/persistence/wikiPostgresAdapter');
const WikiGithubAdapter = require('./business_modules/wiki/infrastructure/git/wikiGithubAdapter');
const WikiLangchainAdapter = require('./business_modules/wiki/infrastructure/ai/wikiLangchainAdapter');
const WikiPubsubAdapter = require('./business_modules/wiki/infrastructure/messaging/pubsub/wikiPubsubAdapter');

const ChecklistPostgresAdapter = require('./business_modules/checklist/infrastructure/persistence/checklistPostgresAdapter');

const AIService = require('./business_modules/ai/application/services/aiService');
const AIPostgresAdapter = require('./business_modules/ai/infrastructure/persistence/aiPostgresAdapter');
const AILangchainAdapter = require('./business_modules/ai/infrastructure/ai/aiLangchainAdapter');
const AIPubsubAdapter = require('./business_modules/ai/infrastructure/messaging/aiPubsubAdapter');



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
    chatPubsubAdapter: asClass(ChatPubsubAdapter).singleton(),
    gitPostgresAdapter: asClass(GitPostgresAdapter).singleton(),
    gitGithubAdapter: asClass(GitGithubAdapter).singleton(),
    gitLangchainAdapter: asClass(GitLangchainAdapter).singleton(),
    gitPubsubAdapter: asClass(GitPubsubAdapter).singleton(),
    targetPostgresAdapter: asClass(TargetPostgresAdapter).singleton(),
    targetGithubAdapter: asClass(TargetGithubAdapter).singleton(),
    targetLangchainAdapter: asClass(TargetLangchainAdapter).singleton(),
    checklistPostgresAdapter: asClass(ChecklistPostgresAdapter).singleton(),
    aiPostgresAdapter: asClass(AIPostgresAdapter).singleton(),
    aiLangchainAdapter: asClass(AILangchainAdapter).singleton(),
    aiPubsubAdapter: asClass(AIPubsubAdapter).singleton(),
    wikiPostgresAdapter: asClass(WikiPostgresAdapter).singleton(),
    wikiGithubAdapter: asClass(WikiGithubAdapter).singleton(),
    wikiLangchainAdapter: asClass(WikiLangchainAdapter).singleton(),
    wikiPubsubAdapter: asClass(WikiPubsubAdapter).singleton(),
  
  };

  await fastify.diContainer.register({
    account: asClass(Account),
    user: asClass(User),
    userService: asClass(UserService, {
      lifetime: Lifetime.SINGLETON,
    }),
    permService: asClass(PermService),
    chatService: asClass(ChatService),
    gitService: asClass(GitService),
    targetService: asClass(TargetService),
    wikiService: asClass(WikiService),
    wikiPersistAdapter: adapters[infraConfig.business_modules.wiki.wikiPersistAdapter],
    wikiGitAdapter: adapters[infraConfig.business_modules.wiki.wikiGitAdapter],
    wikiAIAdapter: adapters[infraConfig.business_modules.wiki.wikiAIAdapter],
    wikiMessagingAdapter: adapters[infraConfig.business_modules.wiki.wikiMessagingAdapter],
    authPersistAdapter: adapters[infraConfig.aop_modules.auth.authPersistAdapter],
    authInMemStorageAdapter: adapters[infraConfig.aop_modules.auth.authInMemStorageAdapter],
    chatPersistAdapter: adapters[infraConfig.business_modules.chat.chatPersistAdapter],
    chatMessagingAdapter: adapters[infraConfig.business_modules.chat.chatMessagingAdapter],
    gitPersistAdapter: adapters[infraConfig.business_modules.git.gitPersistAdapter],
    gitGitAdapter: adapters[infraConfig.business_modules.git.gitGitAdapter],
    gitAIAdapter: adapters[infraConfig.business_modules.git.gitAIAdapter],
    gitMessagingAdapter: adapters[infraConfig.business_modules.git.gitMessagingAdapter],
    targetPersistAdapter: adapters[infraConfig.business_modules.target.targetPersistAdapter],
    targetGitAdapter: adapters[infraConfig.business_modules.target.targetGitAdapter],
    targetAIAdapter: adapters[infraConfig.business_modules.target.targetAIAdapter],
    checklistPersistAdapter: adapters[infraConfig.business_modules.checklist.checklistPersistAdapter],
    aiService: asClass(AIService),
    aiAIAdapter: adapters[infraConfig.business_modules.ai.aiAIAdapter],
    aiPersistAdapter: adapters[infraConfig.business_modules.ai.aiPersistAdapter],
    aiMessagingAdapter: adapters[infraConfig.business_modules.ai.aiMessagingAdapter],
  });
});
