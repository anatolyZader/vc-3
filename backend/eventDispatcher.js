// eventDispatcher.js
/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');
const EventEmitter = require('events');

// ────────────────────────────────────────────────────────────────
// Single, shared in-process event bus for the whole backend
// ────────────────────────────────────────────────────────────────
const eventBus = new EventEmitter();

// Prevent memory leak warnings in high-throughput scenarios
eventBus.setMaxListeners(100);

/**
 * Envelope shape for cross-process messages.
 * {
 *   event: string;
 *   payload: any;
 *   timestamp: string;
 *   source?: string;
 * }
 */

module.exports = fp(async function eventDispatcherPlugin(fastify, opts) {
  fastify.log.info('🔧 Initializing eventDispatcher...');

  // Transport is the only out-of-process channel (Redis / GCP, etc.)
  if (!fastify.transport) {
    throw new Error('[eventDispatcher] fastify.transport is not available. Ensure transportPlugin is registered first.');
  }
  const transport = fastify.transport;

  const defaultOutboundTopic =
    opts.defaultOutboundTopic ||
    process.env.EVENTS_MAIN_TOPIC ||
    'main-events';

  const inboundSubscription =
    opts.inboundSubscription ||
    process.env.EVENTS_MAIN_SUBSCRIPTION ||
    null; // optional

  const sourceId =
    opts.source ||
    process.env.EVENTS_SOURCE_ID ||
    'eventstorm-backend';

  // ────────────────────────────────────────────────────────────────
  // Core API
  // ────────────────────────────────────────────────────────────────

  /**
   * In-memory only. Synchronous, no transport involved.
   */
  function emitInternal(eventName, payload) {
    fastify.log.info(
      { event: eventName },
      '[eventDispatcher] Emitting internal event'
    );
    eventBus.emit(eventName, payload);
  }

  /**
   * Cross-process event:
   *  - wraps payload in an envelope
   *  - publishes via transport (Redis / GCP)
   *  - by default also emits to local event bus
   */
  async function emitExternal(eventName, payload, options = {}) {
    const topic =
      options.topic ||
      defaultOutboundTopic;

    const envelope = {
      event: eventName,
      payload,
      timestamp: new Date().toISOString(),
      source: sourceId
    };

    fastify.log.info(
      { event: eventName, topic },
      '[eventDispatcher] Publishing external event'
    );

    // Out-of-process publish (Redis, Pub/Sub, etc.)
    let messageId;
    try {
      messageId = await transport.publish(topic, envelope);
      fastify.log.info(
        { event: eventName, topic, messageId },
        '[eventDispatcher] External event published'
      );
    } catch (err) {
      fastify.log.error(
        { err, event: eventName, topic },
        '[eventDispatcher] Failed to publish external event'
      );
      throw err;
    }

    // Optionally also notify local listeners
    if (options.emitInternal !== false) {
      emitInternal(eventName, envelope.payload);
    }

    return { messageId, topic };
  }

  /**
   * Subscribe to local in-process events.
   */
  function subscribe(eventName, handler) {
    fastify.log.info(
      { event: eventName },
      '[eventDispatcher] Subscribing to internal event'
    );
    eventBus.on(eventName, handler);

    // Simple unsubscribe helper (optional)
    return () => {
      eventBus.off(eventName, handler);
    };
  }

  // Expose API on Fastify
  fastify.decorate('eventDispatcher', {
    emitInternal,
    emitExternal,
    subscribe,
    bus: eventBus // raw emitter for advanced cases (e.g. listenerCount)
  });

  // Register in DI so modules can resolve 'eventDispatcher'
  if (fastify.diContainer) {
    const { asValue } = require('awilix');
    await fastify.diContainer.register({
      eventDispatcher: asValue(fastify.eventDispatcher)
    });
    fastify.log.info('✅ eventDispatcher registered in DI container');
  }

  // ────────────────────────────────────────────────────────────────
  // Optional: Inbound bridge from transport → internal bus
  // ────────────────────────────────────────────────────────────────
  if (inboundSubscription) {
    fastify.log.info(
      { subscription: inboundSubscription },
      '[eventDispatcher] Subscribing to inbound transport subscription'
    );

    await transport.subscribe(inboundSubscription, async (message) => {
      const { id } = message;

      try {
        const data = message.data;

        if (!data || !data.event) {
          fastify.log.warn(
            { messageId: id, data },
            '[eventDispatcher] Inbound message without event field, acking and ignoring'
          );
          await message.ack();
          return;
        }

        const { event, payload } = data;

        fastify.log.info(
          { messageId: id, event },
          '[eventDispatcher] Inbound transport message, emitting internal event'
        );

        emitInternal(event, payload);

        await message.ack();
      } catch (err) {
        fastify.log.error(
          { messageId: id, err },
          '[eventDispatcher] Error processing inbound message'
        );
        await message.nack();
      }
    });
  } else {
    fastify.log.info('[eventDispatcher] No inboundSubscription configured; transport → bus bridge disabled');
  }

  // ────────────────────────────────────────────────────────────────
  // Cleanup
  // ────────────────────────────────────────────────────────────────
  fastify.addHook('onClose', async () => {
    fastify.log.info('[eventDispatcher] Cleaning up event bus listeners');
    eventBus.removeAllListeners();
  });

  fastify.log.info('✅ eventDispatcher initialized');
}, {
  name: 'eventDispatcher',
  dependencies: ['@fastify/awilix', 'transportPlugin'] // ensure DI and transport are ready
});

// Also export the bus for rare direct imports (e.g. tests)
module.exports.eventBus = eventBus;