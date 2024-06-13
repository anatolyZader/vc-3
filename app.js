/* eslint-disable no-unused-vars */
'use strict'

const path = require('node:path')
const AutoLoad = require('@fastify/autoload')
const { fastifyAwilixPlugin } = require('@fastify/awilix')
const { 
  diContainer, // this is an alias for diContainerProxy
  diContainerClassic, // this instance will be used for `injectionMode = 'CLASSIC'`
  diContainerProxy // this instance will be used by default
} = require('@fastify/awilix')
const { asClass, asFunction, asValue } = require('awilix')
const schemaLoaderPlugin = require('./schemas/schemaLoaderPlugin')


//  imports required for dependency injection:
// -----------------------------------------------------------------------

const SimpleService = require('./simpleService')
// controller
const { videoController } = require('./modules/videoModule/plugins/videoController');
// Services injected
const VideoAppService = require('./modules/videoModule/application/services/videoAppService');
const { takeSnapshot } = require('./modules/videoModule/application/services/videoAppService');
const { downloadTranscript } = require('./modules/videoModule/application/services/videoAppService');
const { CodeSnippetService } = require('./modules/videoModule/application/services/codeSnippetService');
const OcrService = require('./modules/videoModule//application/services/ocrService');
const { TextSnippetService } = require('./modules/videoModule/application/services/textSnippetService');
const VideoConstructService = require('./modules/videoModule/application/services/videoConstructService');
// Adapters injected
const AiAdapter = require('./modules/videoModule/infrastructure/ai/aiAdapter');
const PostgresAdapter = require('./modules/videoModule/infrastructure/database/postgresAdapter');
const OcrAdapter = require('./modules/videoModule/infrastructure/ocr/ocrAdapter');
const { SnapshotAdapter } = require('./modules/videoModule/infrastructure/youtube/snapshotAdapter');
// const YoutubeDataAdapter = require('./modules/videoModule/infrastructure/youtube/youtubeDataAdapter');
// -----------------------------------------------------------------------

// Pass --options via CLI arguments in command to enable these options.
const options = {}

module.exports = async function (fastify, opts) {

  await fastify.register(schemaLoaderPlugin);

  await fastify.register(fastifyAwilixPlugin, { 
    disposeOnClose: true, 
    disposeOnResponse: true,
    strictBooleanEnforced: true
  })
  
  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'modules'),
    options: Object.assign({}, opts),
    encapsulate: false,
    maxDepth: 1
  })

  await diContainer.register({ 
    simpleService: asClass(SimpleService),
    videoAppService: asClass(VideoAppService),
    videoController: asValue(videoController),
    codeSnippetService: asValue(CodeSnippetService),
    ocrService: asValue(OcrService),
    textSnippetService: asValue(TextSnippetService),
    videoConstructService: asValue(VideoConstructService),
    aiAdapter: asValue(AiAdapter),
    // postgresAdapter: asClass(PostgresAdapter),
    // ocrAdapter: asClass(OcrAdapter),
    snapshotAdapter: asValue(SnapshotAdapter),
    // youtubeDataAdapter: asClass(YoutubeDataAdapter),
  }) 
   
 
  // fastify.addHook('onRequest', (request, reply, done) => {
  //   request.diScope.register({
  //     userService: asFunction(
  //       ({ userRepository }) => {
  //         return new UserService(userRepository, request.params.countryId)
  //       },
  //       {
  //         lifetime: Lifetime.SCOPED,
  //         dispose: (module) => module.dispose(),
  //       }
  //     ),
  //   })
  //   done()
  // })

  const simpleService = fastify.diContainer.resolve('simpleService');
  console.log(simpleService.getMessage());

  await fastify.setErrorHandler(async (err, request, reply) => {
    if (err.validation) {
      reply.code(403)
      return err.message
    }
    request.log.error({ err })
    reply.code(err.statusCode || 500)

    return "I'm sorry, there was an error processing your request."
  })

  fastify.setNotFoundHandler(async (request, reply) => {
    reply.code(404)
    return "I'm sorry, I couldn't find what you were looking for."
  })
}

module.exports.options = options