// app.js
'use strict';
// const fs = require('fs');
const path = require('node:path');

const AutoLoad = require('@fastify/autoload');
const fastifyCookie = require('@fastify/cookie');
const fastifySession = require('@fastify/session');
const RedisStore = require('connect-redis').default;
const redisClient = require('./redisClient');
const redisStore = new RedisStore({ client: redisClient });  
const { fastifyAwilixPlugin, diContainer } = require('@fastify/awilix');
const { asClass, asValue } = require('awilix');
const logOptions = require('./aop/log/logPlugin');
const loggingPlugin = require('./aop/log/logPlugin'); 
const schemaLoaderPlugin = require('./env_schemas/schemaLoaderPlugin');
const config = require('./config');
const fastifyRedis = require('@fastify/redis')
// const auth = require('./shared-plugins/auth');

// Imports required for dependency injection (video module)
const Video = require("./modules/video_module/domain/aggregates/video");
const CodeSnippet = require("./modules/video_module/domain/entities/codeSnippet");
const Snapshot = require("./modules/video_module/domain/entities/snapshot");
const TextSnippet = require("./modules/video_module/domain/entities/textSnippet");
const Transcript = require("./modules/video_module/domain/entities/transcript");
const videoController = require('./modules/video_module/application/videoController'); // plugin
const VideoAppService = require('./modules/video_module/application/services/videoAppService');
const CodeSnippetService = require('./modules/video_module/application/services/codeSnippetService');
const OcrService = require('./modules/video_module/application/services/ocrService');
const TextSnippetService = require('./modules/video_module/application/services/textSnippetService');
const VideoConstructService = require('./modules/video_module/application/services/videoConstructService');
const AIAdapter = require('./modules/video_module/infrastructure/ai/aiAdapter');
const PostgresAdapter = require('./modules/video_module/infrastructure/persistence/videoPostgresAdapter');
const OcrAdapter = require('./modules/video_module/infrastructure/ocr/ocrAdapter');
const SnapshotAdapter = require('./modules/video_module/infrastructure/youtube/snapshotAdapter');

// Imports required for dependency injection (aop)
const Account = require('./aop/auth/domain/entities/account');
const User = require('./aop/auth/domain/entities/user');
const UserService = require('./aop/auth/application/services/userService');
const AuthPostgresAdapter = require('./aop/auth/infrastructure/persistence/authPostgresAdapter');
const AuthRedisAdapter = require('./aop/auth/infrastructure/in_memory_storage/authRedisAdapter')
const PermService = require('./aop/permissions/application/services/permService');
require('dotenv').config();
const MonitorService = require('./aop/monitoring/application/services/monitorService')

module.exports = async function (fastify, opts) {
  await fastify.register(loggingPlugin);
  await fastify.register(schemaLoaderPlugin);
  await fastify.register(config); 

  try {
    fastify.log.info('Attempting to register @fastify/redis plugin.');
    await fastify.register(fastifyRedis, { 
      client: redisClient 
    });
  
    fastify.log.info('@fastify/redis plugin registered successfully.');
  } catch (err) {
    fastify.log.error(`Failed to register @fastify/redis plugin: ${err.message}`);
    throw err; // Rethrow to ensure proper error handling upstream
  }

  try {
    await fastify.register(fastifyCookie, {
      secret: fastify.secrets.COOKIE_SECRET,
      parseOptions: {},
    });
    console.log('Cookie plugin successfully registered');
  } catch (error) {
    console.error('Error registering @fastify/cookie:', error);
  }

  await fastify.register(fastifySession, {
    secret: fastify.secrets.SESSION_SECRET, 
    cookie: { 
      secure: false,
      maxAge: 86400000, // 1 day 
    },
    store: redisStore,
    saveUninitialized: false,
  });

  await diContainer.register({
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
    videoController: asValue(videoController),
    textSnippetService: asClass(TextSnippetService),
    videoConstructService: asClass(VideoConstructService),
    snapshotAdapter: asClass(SnapshotAdapter),
    account: asClass(Account),
    user: asClass(User),
    userService: asClass(UserService),
    authPostgresAdapter: asClass(AuthPostgresAdapter),
    authRedisAdapter: asClass(AuthRedisAdapter),
    // accountService: asClass(AccountService),
    permService: asClass(PermService),
    monitorService: asClass(MonitorService)
  });

  // Register Awilix plugin for dependency injection
  await fastify.register(fastifyAwilixPlugin, {
    disposeOnClose: true,
    disposeOnResponse: true,
    strictBooleanEnforced: true,
  });

  // Define dependencies for logging
  const dependencies = {
    Video,
    CodeSnippet,
    Snapshot,
    TextSnippet,
    Transcript,
    VideoAppService,
    videoController,
    CodeSnippetService,
    OcrService,
    TextSnippetService,
    VideoConstructService,
    AIAdapter,
    PostgresAdapter,
    OcrAdapter,
    SnapshotAdapter,
    Account,
    User,
    // AccountService,
    UserService,
    AuthPostgresAdapter,
    AuthRedisAdapter,
    PermService,
    MonitorService
  };

  // Logging to check which imports are undefined
  for (const [key, value] of Object.entries(dependencies)) {
    console.log(`${key}:`, value !== undefined ? 'Defined' : 'Undefined');
  }

  // await fastify.register(auth);

  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'shared-plugins'),
    options: Object.assign({}, opts),
    encapsulate: false,
    maxDepth: 1,
  });

  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'aop'),
    options: Object.assign({}, opts),
    encapsulate: true,
    maxDepth: 5,
    matchFilter: (path) => path.includes('Controller') || path.includes('Plugin') || path.includes('Router')
  });
  
  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'modules'),
    options: Object.assign({}, opts),
    encapsulate: true,
    maxDepth: 5,
    matchFilter: (path) => path.includes('Controller') || path.includes('Plugin') || path.includes('Router')
  });

  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'doc'),
    options: Object.assign({}, opts),
    encapsulate: false,
    maxDepth: 3,
    matchFilter: (path) => path.includes('Plugin')
  });


  // Error and Not Found Handlers
  await fastify.setErrorHandler(async (err, request, reply) => {
    if (err.validation) {
      reply.code(403);
      return err.message;
    }
    request.log.error({ err });
    reply.code(err.statusCode || 500);
    return "I'm sorry, there was an error processing your request.";
  });

  fastify.setNotFoundHandler(async (request, reply) => {
    reply.code(404);
    return "I'm sorry, I couldn't find what you were looking for.";
  });

  // HTTPS configuration
//   fastify.after(async () => {
//     const keyPath = fastify.secrets.SSL_KEY_PATH;
//     const certPath = fastify.secrets.SSL_CERT_PATH;

//     // if (keyPath && certPath) {
//     //   opts.https = {
//     //     key: fs.readFileSync(keyPath),
//     //     cert: fs.readFileSync(certPath),
//     //   };
//     //   console.log('HTTPS options configured.');
//     // } else {
//     //   console.log('HTTPS options not provided in secrets. Starting in HTTP mode.');
//     // }
//   });
};

module.exports.appConfig = {
  logger: logOptions,
  disableRequestLogging: true,
  requestIdLogLabel: false,
  requestIdHeader: 'x-request-id',
};