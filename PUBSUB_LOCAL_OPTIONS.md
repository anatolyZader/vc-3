# Pub/Sub Local Development Options

Your app uses GCP Pub/Sub for async event processing. For local development, you have three options:

---

## ✅ Option 1: Mock Pub/Sub (Current Setup)

**Status:** Already configured and ready to use!

**What it does:**
- Logs all Pub/Sub messages
- Doesn't actually process them asynchronously
- Good for testing API endpoints and immediate flows

**Files:**
- `backend/mockPubsubPlugin.js` - Mock implementation
- `backend/pubsubPlugin.js` - Automatically uses mock when `NODE_ENV=development`

**How it works:**
```javascript
// In local dev (NODE_ENV=development):
pubsubClient.topic('my-topic').publishMessage({ data: 'test' })
// → Logs: "[MOCK PUB/SUB] Would publish to topic 'my-topic': test"
// → Returns mock message ID
// → Nothing actually gets processed
```

**When to use:**
- ✅ Testing API endpoints
- ✅ Quick development
- ✅ When you don't need async processing
- ❌ Can't test full async workflows

---

## Option 2: Redis-Based Queue (Bull/BullMQ)

**For full async processing with real queues.**

**Setup:**
```bash
cd backend
npm install bullmq
```

**Implementation:**
Create `backend/bullPubsubPlugin.js`:
```javascript
const { Queue, Worker } = require('bullmq');

class BullPubSubClient {
  constructor(redisConnection, log) {
    this.redis = redisConnection;
    this.log = log;
    this.queues = new Map();
    this.workers = new Map();
  }

  topic(topicName) {
    if (!this.queues.has(topicName)) {
      const queue = new Queue(topicName, { connection: this.redis });
      this.queues.set(topicName, queue);
    }
    
    return {
      publishMessage: async (message) => {
        const queue = this.queues.get(topicName);
        const data = message.data ? message.data.toString() : JSON.stringify(message);
        await queue.add('message', { data });
        return { messageId: `bull-${Date.now()}` };
      }
    };
  }

  subscription(subscriptionName) {
    return {
      on: (event, handler) => {
        if (event === 'message') {
          const worker = new Worker(subscriptionName, async (job) => {
            const mockMessage = {
              id: job.id,
              data: Buffer.from(job.data.data),
              ack: async () => {},
              nack: async () => { throw new Error('Message processing failed'); }
            };
            await handler(mockMessage);
          }, { connection: this.redis });
          
          this.workers.set(subscriptionName, worker);
        }
      }
    };
  }
}
```

**Update `backend/pubsubPlugin.js`:**
```javascript
const isLocal = process.env.NODE_ENV === 'development';

if (isLocal) {
  const BullPubSubClient = require('./bullPubsubPlugin');
  pubsubClient = new BullPubSubClient(
    { host: 'localhost', port: 6379 },
    fastify.log
  );
} else {
  pubsubClient = new PubSub();
}
```

**Pros:**
- ✅ Real async processing
- ✅ Uses your existing Redis
- ✅ Can test full workflows
- ✅ Job retry, monitoring

**Cons:**
- ⚠️ More setup
- ⚠️ Different API than GCP Pub/Sub

---

## Option 3: GCP Pub/Sub (Remote)

**Continue using GCP Pub/Sub even in local dev.**

**Setup:**
1. Keep GCP credentials:
   ```bash
   # In backend/.env add:
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
   ```

2. Download service account key from GCP Console

3. Set environment variable

**Pros:**
- ✅ Exact same as production
- ✅ No code changes

**Cons:**
- ❌ Requires GCP credentials
- ❌ Internet connection needed
- ❌ Incurs GCP costs
- ❌ Slower (network latency)

---

## Recommended Approach

**Start with Option 1 (Mock) - Already Done! ✅**

Your code is already configured to use the mock in local development. Just ensure:

```bash
# In backend/.env:
NODE_ENV=development
# Don't set GOOGLE_APPLICATION_CREDENTIALS
```

**When you start the backend:**
```bash
cd backend
npm run dev-stable:local
```

You'll see:
```
🔧 Using Mock Pub/Sub (local development mode)
✅ Mock PubSub client registered
```

**Later, if you need real async processing:**
- Implement Option 2 (Bull) following the guide above
- This gives you full async capabilities without GCP dependency

---

## Testing Pub/Sub

**With Mock (current):**
```bash
# API call triggers Pub/Sub
curl http://localhost:3000/api/git/fetch/owner/repo

# Check logs - you'll see:
# [MOCK PUB/SUB] Would publish to topic "git-module-sub": {...}
# But the async work won't actually happen
```

**What gets mocked:**
- ✅ Publishing messages
- ✅ Subscription registration
- ❌ Actual message processing
- ❌ Async job execution

**For full testing:**
- Need Option 2 (Bull) or Option 3 (GCP)

---

## Current Status

✅ **Ready to go!** Mock Pub/Sub is configured and will work when you start the backend.

The mock is automatically activated when:
- `NODE_ENV=development` (set in your .env)
- `GOOGLE_APPLICATION_CREDENTIALS` is NOT set

No additional setup needed for basic development!
