/* eslint-disable no-unused-vars */
// videoController.js
const fp = require('fastify-plugin');

let videoAppService, ocrService, codeSnippetService, textSnippetService, postgresAdapter, youtubeDataAdapter, aiAdapter, snapshotAdapter, ocrAdapter;


async function videoController(fastify, options) {
   
  const youtubeAPIKey = fastify.secrets.YOUTUBE_API_KEY

  fastify.decorate('logHola', async function (request, reply) {
    const client = await fastify.pg.connect();
    try {
      let dbOperationSuccessful = false;
      try {
        await client.query(
          `INSERT INTO video (id, youtube_id, title, author, duration, description, created_at)
           VALUES ('550e8400-e29b-41d4-a716-446655334500', 'your_youtube_et', 'Your Title', 'Author Name', 120, 'Sample Description', NOW());`
        );
        dbOperationSuccessful = true;
      } catch (dbError) {
        console.error('Database error:', dbError);
        reply.status(500).send({ error: 'Database operation failed' });
      } finally {
        client.release();
      }

      if (dbOperationSuccessful) {
        reply.send({ message: 'Hola! This is the videoController in browser.', YAK_env_var: fastify.secrets.YOUTUBE_API_KEY });
      }

      console.log('Finished logHola handler');
    } catch (error) {
      console.error('Error in logHola handler:', error);
      if (!reply.sent) {
        reply.status(500).send({ error: 'Internal Server Error' });
      }
    }
  });

  fastify.decorate('takeSnapshot', async function (request, reply) {
    if (!videoAppService) {
      reply.status(500).send({ error: 'Service not initialized' });
      return;
    }
    try {
      const videoYoutubeId = request.params.videoYoutubeId; // or request.body.videoYoutubeId
      await videoAppService.takeSnapshot(videoYoutubeId, snapshotAdapter, postgresAdapter);
      reply.send('Snapshot saved successfully.');
    } catch (error) {
      fastify.log.error('Error taking snapshot:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('downloadTranscript', async function (request, reply) {
    if (!videoAppService) {
      reply.status(500).send({ error: 'Service not initialized' });
      return;
    }
    const videoYoutubeId = request.params.videoYoutubeId;
    try {
      const transcript = await videoAppService.downloadTranscript(videoYoutubeId, youtubeAPIKey, youtubeDataAdapter, postgresAdapter);
      reply.send(transcript);
    } catch (error) {
      fastify.log.error('Error downloading transcript:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('extractCode', async function (request, reply) {
    if (!ocrService) {
      reply.status(500).send({ error: 'Service not initialized' });
      return;
    }
    const imageUrl = request.params.imageUrl;
    try {
      const codeSnippet = await ocrService.extractCode(imageUrl, ocrAdapter, postgresAdapter);
      reply.send(codeSnippet);
    } catch (error) {
      fastify.log.error('Error extracting code:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('extractText', async function (request, reply) {
    if (!ocrService) {
      reply.status(500).send({ error: 'Service not initialized' });
      return;
    }
    const imageUrl = request.params.imageUrl;
    try {
      const textSnippet = await ocrService.extractText(imageUrl, ocrAdapter, postgresAdapter);
      reply.send(textSnippet);
    } catch (error) {
      fastify.log.error('Error extracting text:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('explainCode', async function (request, reply) {
    if (!codeSnippetService) {
      reply.status(500).send({ error: 'Service not initialized' });
      return;
    }
    const codeSnippetId = request.params.codeSnippetId;
    try {
      const codeExplanation = await codeSnippetService.explainCode(codeSnippetId);
      reply.send(codeExplanation);
    } catch (error) {
      fastify.log.error('Error explaining code:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('explainText', async function (request, reply) {
    if (!textSnippetService) {
      reply.status(500).send({ error: 'Service not initialized' });
      return;
    }
    const { textSnippetId, videoYoutubeId }  = request.params;
    try {
      const textExplanation = await textSnippetService.explainText(videoYoutubeId, textSnippetId, aiAdapter, postgresAdapter);
      reply.send(textExplanation);
    } catch (error) {
      fastify.log.error('Error explaining text:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('translateText', async function (request, reply) {
    if (!textSnippetService) {
      reply.status(500).send({ error: 'Service not initialized' });
      return;
    }
    const textSnippetId = request.params.textSnippetId;
    const videoYoutubeId = request.params.videoYoutubeId;
    try {
      const textTranslation = await textSnippetService.translateText(videoYoutubeId, textSnippetId, aiAdapter, postgresAdapter);
      reply.send(textTranslation);
    } catch (error) {
      fastify.log.error('Error translating text:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.addHook('onReady', async function () {
    try {
      const aiAdapter = fastify.diContainer.resolve('aiAdapter');
      console.log('aiAdapter at videoController / onReady:', aiAdapter);
    } catch (error) {
      fastify.log.error('Error resolving aiAdapter at videoController / onReady:', error);
    }
  
    try {
      const ocrAdapter = fastify.diContainer.resolve('ocrAdapter');
      console.log('ocrAdapter at videoController / onReady:', ocrAdapter);
    } catch (error) {
      fastify.log.error('Error resolving ocrAdapter at videoController / onReady:', error);
    }
  
    try {
      const postgresAdapter = fastify.diContainer.resolve('postgresAdapter');
      console.log('postgresAdapter at videoController / onReady:', postgresAdapter);
    } catch (error) {
      fastify.log.error('Error resolving postgresAdapter at videoController / onReady:', error);
    }
  
    try {
      const snapshotAdapter = fastify.diContainer.resolve('snapshotAdapter');
      console.log('snapshotAdapter at videoController / onReady:', snapshotAdapter);
    } catch (error) {
      fastify.log.error('Error resolving snapshotAdapter at videoController / onReady:', error);
    }
  
    try {
      const videoAppService = fastify.diContainer.resolve('videoAppService');
      console.log('videoAppService at videoController / onReady:', videoAppService);
    } catch (error) {
      fastify.log.error('Error resolving videoAppService at videoController / onReady:', error);
    }
  
    try {
      const ocrService = fastify.diContainer.resolve('ocrService');
      console.log('ocrService at videoController / onReady:', ocrService);
    } catch (error) {
      fastify.log.error('Error resolving ocrService at videoController / onReady:', error);
    }
  
    try {
      const codeSnippetService = fastify.diContainer.resolve('codeSnippetService');
      console.log('codeSnippetService at videoController / onReady:', codeSnippetService);
    } catch (error) {
      fastify.log.error('Error resolving codeSnippetService at videoController / onReady:', error);
    }
  
    try {
      const textSnippetService = fastify.diContainer.resolve('textSnippetService');
      console.log('textSnippetService at videoController / onReady:', textSnippetService);
    } catch (error) {
      fastify.log.error('Error resolving textSnippetService at videoController / onReady:', error);
    }
  });
}  

module.exports = fp(videoController);
