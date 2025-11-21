# Pub/Sub Testing Strategy

## Overview

We use different Pub/Sub implementations for different environments:

| Environment | Implementation | When to Use | Ack/Retry | Durability |
|-------------|----------------|-------------|-----------|------------|
| **Local Dev** | Redis Pub/Sub | Day-to-day coding | ❌ No | ❌ No |
| **Integration Tests** | GCP Pub/Sub Emulator | CI/CD, pre-deploy | ✅ Yes | ✅ Yes |
| **Production** | GCP Pub/Sub | Live system | ✅ Yes | ✅ Yes |

## 1. Local Development (Redis)

### Setup
Already configured in `docker-compose.yml`. Just run:
```bash
docker compose up -d redis
```

### Environment
```bash
NODE_ENV=development
# Don't set GOOGLE_APPLICATION_CREDENTIALS
```

### What You Can Test
✅ **Event flow**: Publish → handler receives → processes
✅ **Routing**: Events go to correct handlers
✅ **Payload**: Serialization/deserialization works
✅ **Basic async**: Multiple events, concurrent handlers

### What You CAN'T Test
❌ **Redelivery**: Failures don't retry
❌ **Durability**: Restart clears messages
❌ **Backlog**: Can't see queued messages
❌ **Ordering guarantees**: Under concurrent load

### Debugging
Enable detailed logging:
```bash
export PUBSUB_DEBUG=true
npm run dev
```

Or watch Redis directly:
```bash
docker exec -it eventstorm-redis redis-cli MONITOR
```

## 2. Integration Tests (GCP Emulator)

### Installation
```bash
# One-time setup
gcloud components install pubsub-emulator
```

### Running Tests

#### Start Emulator
```bash
# Terminal 1: Start emulator
gcloud beta emulators pubsub start --project=test-project --host-port=localhost:8085
```

#### Run Tests Against Emulator
```bash
# Terminal 2: Point to emulator and run tests
export PUBSUB_EMULATOR_HOST=localhost:8085
export NODE_ENV=test
cd backend
npm run test:integration
```

### What This Tests
✅ **Full GCP semantics**: Ack, nack, redelivery
✅ **Failure handling**: Handler crashes → message redelivered
✅ **Durability**: Messages survive subscriber restart
✅ **Backlog**: Inspect unprocessed messages
✅ **Multiple subscriptions**: Fan-out patterns

### Example Integration Test

Create `backend/_tests_/integration/pubsub.integration.test.js`:

```javascript
const { PubSub } = require('@google-cloud/pubsub');

describe('Pub/Sub Integration', () => {
  let pubsub;
  
  beforeAll(() => {
    // Will use emulator if PUBSUB_EMULATOR_HOST is set
    pubsub = new PubSub({ projectId: 'test-project' });
  });
  
  test('should redeliver message after nack', async () => {
    const topicName = 'test-topic-retry';
    const subName = 'test-sub-retry';
    
    // Create topic and subscription
    const [topic] = await pubsub.createTopic(topicName);
    const [subscription] = await topic.createSubscription(subName, {
      ackDeadlineSeconds: 10
    });
    
    let receiveCount = 0;
    const receivedMessages = [];
    
    // Handler that fails first time
    const messageHandler = (message) => {
      receiveCount++;
      receivedMessages.push(message.data.toString());
      
      if (receiveCount === 1) {
        message.nack(); // Force redelivery
      } else {
        message.ack(); // Success on retry
      }
    };
    
    subscription.on('message', messageHandler);
    
    // Publish message
    await topic.publishMessage({ data: Buffer.from('test-retry') });
    
    // Wait for redelivery
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    expect(receiveCount).toBe(2); // Original + retry
    expect(receivedMessages).toEqual(['test-retry', 'test-retry']);
    
    // Cleanup
    await subscription.delete();
    await topic.delete();
  }, 20000);
  
  test('should handle subscriber offline during publish', async () => {
    const topicName = 'test-topic-offline';
    const subName = 'test-sub-offline';
    
    const [topic] = await pubsub.createTopic(topicName);
    const [subscription] = await topic.createSubscription(subName);
    
    // Publish BEFORE subscriber starts
    await topic.publishMessage({ data: Buffer.from('offline-message') });
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // NOW start listening
    const receivedMessages = [];
    const messageHandler = (message) => {
      receivedMessages.push(message.data.toString());
      message.ack();
    };
    
    subscription.on('message', messageHandler);
    
    // Should receive the message published before subscriber started
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    expect(receivedMessages).toContain('offline-message');
    
    // Cleanup
    await subscription.delete();
    await topic.delete();
  }, 10000);
});
```

### Running in CI/CD

Add to your GitHub Actions / GitLab CI:

```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Setup GCloud SDK
        uses: google-github-actions/setup-gcloud@v1
      
      - name: Install Pub/Sub Emulator
        run: |
          gcloud components install pubsub-emulator
      
      - name: Start Emulator
        run: |
          gcloud beta emulators pubsub start --project=test-project --host-port=0.0.0.0:8085 &
          sleep 5
      
      - name: Run Integration Tests
        env:
          PUBSUB_EMULATOR_HOST: localhost:8085
          NODE_ENV: test
        run: |
          cd backend
          npm install
          npm run test:integration
```

## 3. Production (Real GCP)

### Environment
```bash
NODE_ENV=production
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

### Pre-deployment Verification

Before deploying code that depends on new Pub/Sub patterns:

1. **Emulator tests pass** ✅
2. **Manual test in GCP staging**:
   ```bash
   # Use staging credentials
   export GOOGLE_APPLICATION_CREDENTIALS=~/.gcp/staging-key.json
   export NODE_ENV=staging
   
   # Run backend with real GCP Pub/Sub
   npm run dev
   
   # Trigger events, watch logs
   ```

3. **Monitor after deploy**:
   - Check Cloud Console → Pub/Sub → Subscriptions
   - Watch for:
     - Unacked message count growing
     - High error rates
     - Slow ack times

## Summary

| Test Scenario | Use Redis | Use Emulator | Use GCP |
|---------------|-----------|--------------|---------|
| Day-to-day dev | ✅ | ❌ | ❌ |
| Quick iteration | ✅ | ❌ | ❌ |
| Pre-commit tests | ✅ | ❌ | ❌ |
| CI/CD integration tests | ❌ | ✅ | ❌ |
| Testing retry logic | ❌ | ✅ | ❌ |
| Testing durability | ❌ | ✅ | ❌ |
| Staging verification | ❌ | ❌ | ✅ |
| Production | ❌ | ❌ | ✅ |

## Quick Commands Reference

```bash
# Local dev (Redis)
docker compose up -d redis
export NODE_ENV=development
npm run dev

# Watch Redis events
docker exec -it eventstorm-redis redis-cli MONITOR

# Debug mode (verbose Pub/Sub logs)
export PUBSUB_DEBUG=true

# Integration tests (Emulator)
# Terminal 1:
gcloud beta emulators pubsub start --project=test-project

# Terminal 2:
export PUBSUB_EMULATOR_HOST=localhost:8085
export NODE_ENV=test
npm run test:integration

# Staging (Real GCP)
export GOOGLE_APPLICATION_CREDENTIALS=~/.gcp/staging-key.json
export NODE_ENV=staging
npm run dev
```
