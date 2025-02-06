/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');
const { fastifyAwilixPlugin } = require('@fastify/awilix');
const { asClass, asValue, Lifetime } = require('awilix');

const infraConfig = require('./infraConfig.json');

const Video = require("./modules/video_module/domain/aggregates/video");
const CodeSnippet = require("./modules/video_module/domain/entities/codeSnippet");
const Snapshot = require("./modules/video_module/domain/entities/snapshot");
const TextSnippet = require("./modules/video_module/domain/entities/textSnippet");
const Transcript = require("./modules/video_module/domain/entities/transcript");
const VideoAppService = require('./modules/video_module/application/services/videoAppService');
const CodeSnippetService = require('./modules/video_module/application/services/codeSnippetService');
const OcrService = require('./modules/video_module/application/services/ocrService');
const TextSnippetService = require('./modules/video_module/application/services/textSnippetService');
const VideoConstructService = require('./modules/video_module/application/services/videoConstructService');
const AIAdapter = require('./modules/video_module/infrastructure/ai/aiAdapter');
const PostgresAdapter = require('./modules/video_module/infrastructure/persistence/videoPostgresAdapter');
const OcrAdapter = require('./modules/video_module/infrastructure/ocr/ocrAdapter');
const SnapshotAdapter = require('./modules/video_module/infrastructure/youtube/snapshotAdapter');

const Account = require('./aop/auth/domain/entities/account');
const User = require('./aop/auth/domain/entities/user');
const UserService = require('./aop/auth/application/services/userService');
const PermService = require('./aop/permissions/application/services/permService');
const AuthPostgresAdapter = require('./aop/auth/infrastructure/persistence/authPostgresAdapter');
const AuthRedisAdapter = require('./aop/auth/infrastructure/in_memory_storage/authRedisAdapter');
// const authInfraConfig = require('../aop/auth/infrastructure/authInfraConfig.json');

const ChatService = require('./modules/chat_module/application/services/chatService');
const ChatPostgresAdapter = require('./modules/chat_module/infrastructure/persistence/chatPostgresAdapter');
// const chatInfraConfig = require('../modules/chat_module/infrastructure/chatInfraConfig.json');

const GitService = require('./modules/git_module/application/services/gitService');
const GitPostgresAdapter = require('./modules/git_module/infrastructure/persistence/gitPostgresAdapter');
// const gitInfraConfig = require('../modules/git_module/infrastructure/gitInfraConfig.json');

const TargetCodeService = require('./modules/target_code_module/application/services/targetCodeService');
const TargetCodePostgresAdapter = require('./modules/target_code_module/infrastructure/persistence/targetCodePostgresAdapter');
// const targetCodeInfraConfig = require('../modules/target_code_module/infrastructure/targetCodeInfraConfig.json');

const ChecklistPostgresAdapter = require('./modules/checklist_module/infrastructure/persistence/checklistPostgresAdapter');

const AIAssistPostgresAdapter = require('./modules/ai_assist_module/infrastructure/persistence/aiAssistPostgresAdapter');

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
    targetCodePostgresAdapter: asClass(TargetCodePostgresAdapter).singleton(),
    checklistPostgresAdapter: asClass(ChecklistPostgresAdapter).singleton(),
    aiAssistPostgresAdapter: asClass(AIAssistPostgresAdapter).singleton(),
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
    videoController: asValue(require('./modules/video_module/application/videoController')),
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
    targetCodeService: asClass(TargetCodeService),
    // targetCodePersistAdapter: adapters[targetCodeInfraConfig.persistenceAdapter],
    authPersistAdapter: adapters[infraConfig.aop.auth.authPersistAdapter],
    authInMemStorageAdapter: adapters[infraConfig.aop.auth.authInMemStorageAdapter],
    chatPersistAdapter: adapters[infraConfig.modules.chat_module.chatPersistAdapter],
    gitPersistAdapter: adapters[infraConfig.modules.git_module.gitPersistAdapter],
    targetCodePersistAdapter: adapters[infraConfig.modules.target_code_module.targetCodePersistAdapter],
    checklistPersistAdapter: adapters[infraConfig.modules.checklist_module.checklistPersistAdapter],
    aiAssistPersistAdapter: adapters[infraConfig.aiAssistPersistAdapter],
  });
});
