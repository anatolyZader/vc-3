fastify.decorate('addQuestion', async (request, reply) => {
  const { conversationId } = request.params;
  const { prompt } = request.body;
  const userId = request.user.id;
  
  try {
    // Validate inputs
    if (!conversationId || !prompt?.trim()) {
      const error = 'Missing required parameters: conversationId or prompt';
      fastify.log.warn(`[${new Date().toISOString()}] ${error} for user ${userId}`);
      
      if (fastify.sendToUser) {
        fastify.sendToUser(userId, {
          type: 'error',
          conversationId,
          error: 'Invalid message. Please provide a valid question.',
          timestamp: new Date().toISOString()
        });
      }
      
      throw fastify.httpErrors.badRequest(error);
    }
    
    fastify.log.info(`[${new Date().toISOString()}] Processing question for user ${userId}, conversation ${conversationId}`);
    
    const chatService = await request.diScope.resolve('chatService');
    const questionId = await chatService.addQuestion(userId, conversationId, prompt);
    
    // Send immediate HTTP response
    reply.send({ 
      questionId, 
      status: 'received',
      message: 'Question received and processing...',
      timestamp: new Date().toISOString()
    });
    
    // ✅ REMOVED: The hardcoded AI response generation
    // The AI service should handle this via the event system
    
  } catch (error) {
    fastify.log.error(`[${new Date().toISOString()}] Error in addQuestion for user ${userId}:`, error);
    
    if (fastify.sendToUser && conversationId) {
      fastify.sendToUser(userId, {
        type: 'error',
        conversationId,
        error: 'Failed to process your question. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString(),
        retryable: true
      });
    }
    
    throw fastify.httpErrors.internalServerError('Failed to send question', { cause: error });
  }
});