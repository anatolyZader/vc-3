// app.js
'use strict';
const fs = require('fs');
const path = require('node:path');

const AutoLoad = require('@fastify/autoload');
const fastifyCookie = require('@fastify/cookie');
const fastifySession = require('@fastify/session');
const { fastifyAwilixPlugin, diContainer } = require('@fastify/awilix');
const { asClass, asValue } = require('awilix');
const logOptions = require('./shared-plugins/loggingPlugin');
const loggingPlugin = require('./shared-plugins/loggingPlugin'); 
const schemaLoaderPlugin = require('./env_schemas/schemaLoaderPlugin');
const config = require('./config');
const redisClient = require('./redisClient');
const fastifyRedis = require('@fastify/redis')
// const auth = require('./shared-plugins/auth');

// Imports required for dependency injection (video module)
const Video = require("./modules/videoModule/domain/aggregates/video");
const CodeSnippet = require("./modules/videoModule/domain/entities/codeSnippet");
const Snapshot = require("./modules/videoModule/domain/entities/snapshot");
const TextSnippet = require("./modules/videoModule/domain/entities/textSnippet");
const Transcript = require("./modules/videoModule/domain/entities/transcript");
const videoController = require('./modules/videoModule/plugins/videoController'); // plugin
const VideoAppService = require('./modules/videoModule/application/services/videoAppService');
const CodeSnippetService = require('./modules/videoModule/application/services/codeSnippetService');
const OcrService = require('./modules/videoModule/application/services/ocrService');
const TextSnippetService = require('./modules/videoModule/application/services/textSnippetService');
const VideoConstructService = require('./modules/videoModule/application/services/videoConstructService');
const AIAdapter = require('./modules/videoModule/infrastructure/ai/aiAdapter');
const PostgresAdapter = require('./modules/videoModule/infrastructure/database/postgresAdapter');
const OcrAdapter = require('./modules/videoModule/infrastructure/ocr/ocrAdapter');
const SnapshotAdapter = require('./modules/videoModule/infrastructure/youtube/snapshotAdapter');

// Imports required for dependency injection (auth module)
const Account = require('./aop/auth/domain/entities/account');
const User = require('./aop/auth/domain/entities/user');
const UserService = require('./aop/auth/application/services/userService');
const AccountService = require('./aop/auth/application/services/accountService');
const AuthPostgresAdapter = require('./aop/auth/infrastructure/database/authPostgresAdapter');
require('dotenv').config();

// // Create Fastify instance with the logger configuration
// const fastify = require('fastify')({
//   logger: logOptions,  // Integrate the logger options
//   disableRequestLogging: true,
//   requestIdLogLabel: false,
//   requestIdHeader: 'x-request-id',
// });

module.exports = async function (fastifyRootInstance, opts) {
  await fastifyRootInstance.register(loggingPlugin);
  await fastifyRootInstance.register(schemaLoaderPlugin);
  await fastifyRootInstance.register(config);

  await fastifyRootInstance.register(fastifyRedis, { 
    client: redisClient 
  });



    await fastifyRootInstance.register(fastifyCookie, {
      secret: fastifyRootInstance.secrets.COOKIE_SECRET,  
      parseOptions: {},
    });
  
    await fastifyRootInstance.register(fastifySession, {
      secret: fastifyRootInstance.secrets.SESSION_SECRET, 
      cookie: {
        secure: false,
        maxAge: 86400000, // 1 day 
      },
      store: new fastifySession.stores.RedisStore({
        client: redisClient, 
      }),
      saveUninitialized: false, //
    });

  // await fastifyRootInstance.register(auth);
  await fastifyRootInstance.register(AutoLoad, {
    dir: path.join(__dirname, 'shared-plugins'),
    options: Object.assign({}, opts),
    encapsulate: false,
    maxDepth: 1,
  });

  await fastifyRootInstance.register(AutoLoad, {
    dir: path.join(__dirname, 'modules'),
    options: Object.assign({}, opts),
    encapsulate: false,
    maxDepth: 1,
  });

  await fastifyRootInstance.register(AutoLoad, {
    dir: path.join(__dirname, 'aop'),
    options: Object.assign({}, opts),
    encapsulate: false,
    maxDepth: 1,
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
    accountService: asClass(AccountService),
  });

  // Register Awilix plugin for dependency injection
  await fastifyRootInstance.register(fastifyAwilixPlugin, {
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
    AccountService,
    UserService,
    AuthPostgresAdapter,
  };

  // Logging to check which imports are undefined
  for (const [key, value] of Object.entries(dependencies)) {
    console.log(`${key}:`, value !== undefined ? 'Defined' : 'Undefined');
  }

  // Error and Not Found Handlers
  await fastifyRootInstance.setErrorHandler(async (err, request, reply) => {
    if (err.validation) {
      reply.code(403);
      return err.message;
    }
    request.log.error({ err });
    reply.code(err.statusCode || 500);
    return "I'm sorry, there was an error processing your request.";
  });

  fastifyRootInstance.setNotFoundHandler(async (request, reply) => {
    reply.code(404);
    return "I'm sorry, I couldn't find what you were looking for.";
  });

  // HTTPS configuration
  fastifyRootInstance.after(async () => {
    const keyPath = fastifyRootInstance.secrets.SSL_KEY_PATH;
    const certPath = fastifyRootInstance.secrets.SSL_CERT_PATH;

    if (keyPath && certPath) {
      opts.https = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      };
      console.log('HTTPS options configured.');
    } else {
      console.log('HTTPS options not provided in secrets. Starting in HTTP mode.');
    }
  });
};

module.exports.appConfig = {
  logger: logOptions,
  disableRequestLogging: true,
  requestIdLogLabel: false,
  requestIdHeader: 'x-request-id',
};
