"use strict";

const path = require("path");
const Fastify = require("fastify");
const { getApiEventValidators } = require("../../../helpers/eventSchemas");

describe("API Pub/Sub bridge", () => {
  const listenerPath = path.resolve(
    __dirname,
    "../../../../business_modules/api/input/apiPubsubListener.js"
  );

  function build() {
    const app = Fastify({ logger: false });

    const topicMock = { get: jest.fn(async () => [/* topic */ {}]) };
    const subscriptionMock = {
      on: jest.fn((evt, cb) => {
        if (evt === "message") subscriptionMock._onMessage = cb;
        if (evt === "error") subscriptionMock._onError = cb;
      }),
      close: jest.fn(async () => {}),
    };
    const pubSubClient = {
      topic: jest.fn(() => topicMock),
      subscription: jest.fn(() => subscriptionMock),
    };

    app.decorate("diContainer", { resolve: (name) => (name === "pubSubClient" ? pubSubClient : null) });

    // Decorate fetch handler used by listener
    app.decorate("fetchHttpApi", jest.fn(async (req) => ({ result: "ok", data: { repoId: req.query.repoId } })));
    app.decorate("diScope", { resolve: (name) => (name === "apiPubsubAdapter" ? { publishHttpApiFetchedEvent: jest.fn(async () => "mid-1") } : null) });

    app.register(require(listenerPath));
    return { app, pubSubClient, subscriptionMock };
  }

  test("forwards fetchHttpApiRequest and publishes result, acks message", async () => {
    const { app, pubSubClient, subscriptionMock } = build();
    await app.ready();

    expect(pubSubClient.subscription).toHaveBeenCalledWith("api-sub");

    const ack = jest.fn();
    const nack = jest.fn();
    const messagePayload = { event: "fetchHttpApiRequest", payload: { userId: "u1", repoId: "r1", correlationId: "c1" } };
    const message = {
      id: "m1",
      data: Buffer.from(JSON.stringify(messagePayload)),
      ack,
      nack,
    };

    // Validate incoming event against schema
    const { validateFetchHttpApiRequest } = getApiEventValidators();
    expect(validateFetchHttpApiRequest(messagePayload)).toBe(true);

    await subscriptionMock._onMessage(message);

    expect(ack).toHaveBeenCalled();
    expect(nack).not.toHaveBeenCalled();

    await app.close();
  });
});
