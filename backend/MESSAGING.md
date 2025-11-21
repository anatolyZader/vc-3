# Messaging Architecture Documentation

## Overview

The messaging system in this application follows a **modular monolith** pattern with a clean separation between in-process events and cross-process communication. This document explains the messaging architecture, interfaces, and usage patterns.

## Core Components

### 1. EventDispatcher (In-Process Bus)
- **Single shared EventEmitter** for the entire backend
- **Synchronous** in-memory event handling
- Used for communication between modules within the same process

**API:**
```js
// Subscribe to internal events
const unsubscribe = eventDispatcher.subscribe('eventName', async (payload) => {
  // Handle event
});

// Emit internal events (stays in-process)
eventDispatcher.emitInternal('eventName', payload);

// Emit external events (goes via transport + optionally internal)
const { messageId, topic } = await eventDispatcher.emitExternal('eventName', payload, {
  topic: 'custom-topic',      // Optional: default is 'main-events'
  emitInternal: false         // Optional: skip internal emission (default: true)
});
```

### 2. Transport Abstraction
- **Abstract transport layer** supporting multiple implementations
- **Redis** for local development
- **GCP Pub/Sub** for production
- Provides unified interface regardless of underlying transport

**Interface:**
```js
// Publish a message
const messageId = await transport.publish(topic, message);

// Subscribe to messages
await transport.subscribe(topic, async (message) => {
  const { id, data, timestamp, ack, nack } = message;
  // Process message
  await ack(); // or nack() on failure
});

// Cleanup
await transport.close();
```

## Message Envelope Format

All cross-process messages use a **standardized envelope**:

```js
{
  event: "repositoryFetched",           // Event type/name
  payload: {                            // Actual event data
    repoId: "owner/repo",
    userId: "user123",
    correlationId: "abc-123"
  },
  timestamp: "2025-11-18T12:34:56.789Z", // ISO timestamp
  source: "git-module"                   // Originating module
}
```

### Why Envelopes?

1. **Consistent parsing** across all modules
2. **Audit trail** with timestamps and source tracking
3. **Forward compatibility** for additional metadata
4. **Transport agnostic** - works with Redis, GCP Pub/Sub, etc.

## Logical Channel Configuration

Channel names are centralized in `/backend/messageChannels.js`:

```js
module.exports = {
  git: {
    channel: 'git-events',
    description: 'Repository operations, docs fetched, repo pushed events'
  },
  ai: {
    channel: 'ai-events', 
    description: 'AI responses, processing completions, analysis results'
  },
  // ... other channels
};

// Usage
const { getChannelName } = require('./messageChannels');
const topic = getChannelName('git'); // Returns 'git-events'
```

## Event Flow Patterns

### Pattern 1: In-Process Communication
```
Module A → eventDispatcher.emitInternal('eventName', data)
         → Module B receives via eventDispatcher.subscribe('eventName', handler)
```

**Example:**
```js
// Chat module receives user question
eventDispatcher.emitInternal('questionAdded', { userId, conversationId, prompt });

// AI module processes it
eventDispatcher.subscribe('questionAdded', async (data) => {
  const answer = await generateAnswer(data.prompt);
  eventDispatcher.emitInternal('answerAdded', { userId: data.userId, conversationId: data.conversationId, answer });
});

// Chat module receives answer
eventDispatcher.subscribe('answerAdded', async (data) => {
  await saveAnswerToChat(data);
  await sendWebSocketMessage(data.userId, data.answer);
});
```

### Pattern 2: Cross-Process Communication
```
Module A → adapter.publishEvent() 
         → transport.publish(topic, envelope)
         → Redis/GCP Pub/Sub
         → transport.subscribe() in Module B
         → eventDispatcher.emitInternal() → local handlers
```

**Example:**
```js
// Git module publishes repo data
const envelope = {
  event: 'repositoryFetched',
  payload: { repoId, repoData, userId },
  timestamp: new Date().toISOString(),
  source: 'git-module'
};
await transport.publish('git-events', envelope);

// AI module receives via transport subscription
await transport.subscribe('git-events', async (message) => {
  const { event, payload } = message.data;
  // Bridge to internal event bus
  eventDispatcher.emitInternal(event, payload);
});
```

## Module Architecture

Each module follows this pattern:

### PubSub Adapter (Outbound)
```js
class ModulePubsubAdapter {
  constructor({ transport, logger }) {
    this.transport = transport;
    this.log = logger;
    this.topicName = getChannelName('module');
  }

  async publishEvent(eventName, payload) {
    const envelope = {
      event: eventName,
      payload,
      timestamp: new Date().toISOString(),
      source: 'module-name'
    };
    
    const messageId = await this.transport.publish(this.topicName, envelope);
    this.log.info({ event: eventName, messageId }, 'Event published');
    return messageId;
  }
}
```

### PubSub Listener (Inbound)
```js
module.exports = fp(async function modulePubsubListener(fastify, opts) {
  const { eventDispatcher } = fastify;
  
  // 1. Subscribe to internal events
  eventDispatcher.subscribe('someEvent', async (data) => {
    // Handle in-process event
  });
  
  // 2. Subscribe to transport messages (optional)
  if (fastify.transport) {
    const subscriptionName = getChannelName('module') + '-internal';
    await transport.subscribe(subscriptionName, async (message) => {
      const { event, payload } = message.data;
      eventDispatcher.emitInternal(event, payload);
      await message.ack();
    });
  }
}, {
  name: 'modulePubsubListener',
  dependencies: ['transportPlugin', 'eventDispatcher']
});
```

## Transport Implementations

### Redis Transport (Development)
- Uses **Redis Pub/Sub** channels
- **Fire-and-forget** semantics
- `ack()`/`nack()` are **logging-only** (no retry/DLQ)
- Automatic JSON serialization/parsing
- Dedicated subscriber connections (Redis requirement)

### GCP Pub/Sub Transport (Production)  
- Uses **Google Cloud Pub/Sub**
- **At-least-once delivery** with retries
- Real `ack()`/`nack()` with dead letter queues
- Automatic message deduplication
- Configurable retry policies

## Best Practices

### 1. Event Naming
- Use **past tense** for events: `repositoryFetched`, `questionAdded`, `answerAdded`
- Be **specific**: `userRegistered` not `userEvent`
- Include **context**: `conversationDeleted` not just `deleted`

### 2. Error Handling
```js
// In-process events: Don't re-throw (affects other listeners)
eventDispatcher.subscribe('eventName', async (data) => {
  try {
    await processEvent(data);
  } catch (error) {
    log.error({ error, data }, 'Event processing failed');
    // Don't re-throw
  }
});

// Transport messages: Use ack/nack appropriately  
await transport.subscribe('topic', async (message) => {
  try {
    await processMessage(message.data);
    await message.ack();
  } catch (error) {
    log.error({ error }, 'Message processing failed');
    await message.nack(); // Retry in production
  }
});
```

### 3. Payload Design
- **Include correlation IDs** for tracing
- **Avoid large objects** - consider using references
- **Validate required fields** early
- **Use typed interfaces** when possible

### 4. Testing
```js
// Mock eventDispatcher
const mockEventDispatcher = {
  subscribe: jest.fn(),
  emitInternal: jest.fn(),
  emitExternal: jest.fn()
};

// Mock transport  
const mockTransport = {
  publish: jest.fn().mockResolvedValue('msg-123'),
  subscribe: jest.fn()
};
```

## Troubleshooting

### Channel Name Mismatches
- **Symptom**: Events not received across modules
- **Fix**: Ensure both publisher and subscriber use `getChannelName()` consistently

### Memory Leaks  
- **Symptom**: "Possible EventEmitter memory leak detected"
- **Fix**: EventBus has `setMaxListeners(100)` configured
- **Check**: Unsubscribe from events when modules shut down

### Lost Messages in Development
- **Symptom**: Redis messages disappear
- **Remember**: Redis Pub/Sub is fire-and-forget, no persistence
- **Solution**: Use GCP Pub/Sub for guaranteed delivery in production

### DI Resolution Errors
- **Symptom**: `eventDispatcher not registered` or `transport not registered` 
- **Fix**: Check plugin dependency order in module declarations:
  ```js
  dependencies: ['transportPlugin', 'eventDispatcher']
  ```

## Architecture Benefits

1. **Testability**: Each component can be mocked independently
2. **Scalability**: Transport abstraction allows switching between Redis/GCP based on environment  
3. **Maintainability**: Centralized channel configuration, consistent interfaces
4. **Reliability**: Standardized error handling, proper ack/nack semantics
5. **Observability**: Structured logging with correlation IDs and event tracing

This messaging architecture provides a solid foundation for building robust, scalable microservice-like components within a modular monolith.