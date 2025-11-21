# Pub/Sub Architecture: Redis for Dev, GCP for Production

## Executive Summary

**Decision**: Use Redis Pub/Sub (classic channels) as local development adapter, with explicit awareness of semantic gaps vs GCP Pub/Sub.

**Rationale**: 
- ✅ Maintains event-driven architecture in local dev
- ✅ Simple setup (no cloud credentials needed)
- ✅ Good debugging experience
- ⚠️ Doesn't replicate full GCP semantics (intentional trade-off)

## Architecture

### Port/Adapter Pattern

```
┌─────────────────────────────────────────────┐
│         Domain Modules                       │
│  (git, AI, docs, chat, api)                 │
│                                              │
│  Uses: fastify.pubsubClient.topic()         │
│        fastify.pubsubClient.subscription()  │
└──────────────────┬──────────────────────────┘
                   │ Port (abstraction)
┌──────────────────┴──────────────────────────┐
│         pubsubPlugin.js                      │
│  Environment detection & adapter selection   │
└──────────────┬───────────────┬──────────────┘
               │               │
    ┌──────────┴─────┐  ┌─────┴──────────┐
    │ Redis Adapter  │  │  GCP Adapter   │
    │ (Development)  │  │  (Production)  │
    └────────────────┘  └────────────────┘
```

### Environment Selection Logic

```javascript
// In pubsubPlugin.js
const isLocal = process.env.NODE_ENV === 'development' 
                && !process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (isLocal) {
  // Use redisPubsubPlugin.js
} else {
  // Use @google-cloud/pubsub
}
```

**Safety**: Plugin throws error if `NODE_ENV=production` but no GCP credentials found.

## Semantic Differences Table

| Feature | GCP Pub/Sub | Redis Pub/Sub | Impact on Dev |
|---------|-------------|---------------|---------------|
| **Persistence** | ✅ Messages stored | ❌ Fire-and-forget | ⚠️ Must run subscribers before publishing |
| **Ack/Nack** | ✅ Real redelivery | ❌ No-op (just logs) | ⚠️ Can't test retry logic locally |
| **Backlog** | ✅ Inspectable queue | ❌ No queue concept | ⚠️ No lag monitoring in dev |
| **Ordering** | ⚠️ Optional (ordering keys) | ✅ Always ordered | ✅ Actually better in dev |
| **Multiple Subs** | ✅ Fan-out | ✅ Fan-out | ✅ Compatible |
| **Auto-create** | ❌ Must pre-create | ✅ Automatic | ✅ Easier dev setup |
| **Delivery** | At-least-once | At-most-once | ⚠️ Different guarantees |

## What You Can/Can't Test Locally

### ✅ Safe to Test with Redis

- Event routing (topic → correct handlers)
- Payload serialization/deserialization
- Basic async orchestration
- Handler business logic
- Message attributes parsing
- Multiple concurrent events

### ❌ Must Test with GCP (Emulator or Real)

- Message redelivery after `nack()`
- Handler crash recovery
- Processing backlog after subscriber restart
- Ack deadline expiration
- Dead-letter queue behavior
- High-throughput stress testing

## Implementation Details

### Redis Adapter API Compatibility

```javascript
// GCP API (what domain code calls)
const topic = pubsubClient.topic('my-topic');
await topic.publishMessage({ data: Buffer.from('...') });

const sub = pubsubClient.subscription('my-sub');
sub.on('message', async (msg) => {
  const data = msg.data.toString();
  // ... process ...
  await msg.ack(); // or msg.nack()
});
```

**Redis adapter provides identical API:**
- `topic.publishMessage()` → `redis.publish(channel, message)`
- `subscription.on('message', handler)` → `redis.subscribe(channel, callback)`
- `message.ack()` / `message.nack()` → log only (no-op)
- `message.data` → Buffer
- `message.id` → generated `redis-${timestamp}-${random}`

### Why Classic Pub/Sub (not Streams)?

We use `PUBLISH`/`SUBSCRIBE` instead of `XADD`/`XREADGROUP` because:

1. **Simplicity**: Domain code doesn't use consumer groups
2. **Drop-in**: API matches exactly
3. **Good enough**: For dev, at-most-once is fine
4. **Performance**: Pub/Sub is lighter than Streams

**Future consideration**: If you add retry/ack logic to production code, consider migrating adapter to Redis Streams for better dev/prod parity.

## Observability

### Debug Mode

Enable detailed logging:
```bash
export PUBSUB_DEBUG=true
```

Logs:
```
[RedisPubSub] PUBLISH { messageId: 'redis-...', topic: 'git-events', payload: '...' }
[RedisPubSub] RECEIVE { messageId: 'redis-...', subscription: 'git-indexer', payload: '...' }
```

### Redis MONITOR

Watch all Redis operations in real-time:
```bash
docker exec -it eventstorm-redis redis-cli MONITOR
```

See every `PUBLISH` and `SUBSCRIBE` as it happens.

### Grafana / Prometheus

For production metrics, use GCP Cloud Monitoring:
- Unacked message count
- Publish throughput
- Ack latency
- Error rates

(Redis adapter has no equivalent metrics – intentional for dev simplicity)

## Testing Strategy Summary

| Environment | Pub/Sub Implementation | Purpose | Setup Time |
|-------------|----------------------|---------|------------|
| **Local Dev** | Redis Pub/Sub | Daily coding, quick iteration | < 1 min |
| **CI Integration** | GCP Emulator | Pre-deploy verification | ~ 5 min |
| **Staging** | Real GCP Pub/Sub | Final validation | Credentials needed |
| **Production** | Real GCP Pub/Sub | Live system | Production credentials |

See `PUBSUB_TESTING_GUIDE.md` for detailed test scenarios.

## Risk Mitigation

### Risk 1: Retry Logic Works in Prod, Not Tested in Dev

**Mitigation**: 
- Document in `REDIS_PUBSUB_COMPATIBILITY.md` (done)
- Add integration tests with GCP Emulator (see testing guide)
- Manual staging tests before production deploy

### Risk 2: Durability Assumption

**Mitigation**:
- Explicit warnings in code comments
- Log warning on startup: "⚠️ [PubSub] DEV MODE: No durability..."
- Team education

### Risk 3: Scaling Behavior

**Mitigation**:
- Load testing in staging with real GCP Pub/Sub
- Monitor production metrics closely
- Gradual rollout of new pub/sub patterns

## Code Review Checklist

When adding new Pub/Sub patterns:

- [ ] Works with `fastify.pubsubClient` abstraction (not Redis-specific)
- [ ] Tested basic flow with Redis in local dev
- [ ] Added integration test with GCP Emulator if relies on ack/retry
- [ ] Documented expected behavior in failure cases
- [ ] Staging manual test before production deploy
- [ ] Production monitoring alerts configured

## Migration Path (if needed)

If you later need better dev/prod parity:

### Option A: Switch to Redis Streams

Modify `redisPubsubPlugin.js`:
- `publishMessage()` → `XADD`
- `subscription.on()` → `XREADGROUP` with `XACK`
- Provides: durability, ack, backlog

**Effort**: ~4 hours
**Benefit**: Much closer to GCP semantics

### Option B: Always Use GCP Emulator in Dev

Pros:
- 100% semantic match
- Tests exactly what runs in prod

Cons:
- Requires gcloud SDK installed
- Slower startup
- More complex local setup

**Recommendation**: Only if retry/ack logic becomes critical to test.

## Conclusion

**Redis Pub/Sub for dev is the right choice** given your constraints:

✅ **Preserves architecture**: Port/adapter pattern intact
✅ **Practical**: Easy local setup, good debugging
✅ **Conscious trade-off**: We know it's not identical to GCP
✅ **Mitigated**: Integration tests + staging cover gaps

The key is **awareness** – this document + code comments ensure the team knows when to use Redis vs GCP testing.

---

**References**:
- `backend/pubsubPlugin.js` - Environment selection logic
- `backend/redisPubsubPlugin.js` - Redis adapter implementation
- `REDIS_PUBSUB_COMPATIBILITY.md` - Detailed semantic comparison
- `PUBSUB_TESTING_GUIDE.md` - How to test different scenarios
