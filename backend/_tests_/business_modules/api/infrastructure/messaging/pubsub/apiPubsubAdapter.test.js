"use strict";

const path = require("path");
const { getApiEventValidators } = require("../../../../../helpers/eventSchemas");

describe("ApiPubsubAdapter", () => {
  const adapterPath = path.resolve(
    __dirname,
    "../../../../../../business_modules/api/infrastructure/messaging/pubsub/apiPubsubAdapter.js"
  );

  test("publishHttpApiFetchedEvent publishes to topic and validates schema", async () => {
    const publishMessage = jest.fn(async () => "m-1");
    const topicObj = { publishMessage };
    const topic = jest.fn(() => ({ get: jest.fn(async () => [topicObj]) }));
    const pubSubClient = { topic };

    const Adapter = require(adapterPath);
    const adapter = new Adapter({ pubSubClient });

    const result = { openapi: "3.0.0", info: { title: "x" } };
    const correlationId = "c1";
    await adapter.publishHttpApiFetchedEvent(result, correlationId);

    expect(topic).toHaveBeenCalledWith("git");
    expect(publishMessage).toHaveBeenCalledTimes(1);
    const dataBuf = publishMessage.mock.calls[0][0].data;
    const event = JSON.parse(Buffer.from(dataBuf).toString());

    const { validateHttpApiFetched } = getApiEventValidators();
    expect(validateHttpApiFetched(event)).toBe(true);
    expect(event.payload.correlationId).toBe(correlationId);
  });
});
const ApiPubsubAdapter = require('../../../../../../business_modules/api/infrastructure/messaging/pubsub/apiPubsubAdapter');

describe('ApiPubsubAdapter', () => {
  test('publishes httpApiFetched event', async () => {
    const publishMessage = jest.fn().mockResolvedValue('msg-1');
    const topic = { publishMessage, get: jest.fn() };
    const topicGetter = jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue([ { publishMessage } ]) });
    const pubSubClient = { topic: topicGetter };
    const adapter = new ApiPubsubAdapter({ pubSubClient });
    const messageId = await adapter.publishHttpApiFetchedEvent({ spec: { paths: {} } }, 'corr-1');
    expect(messageId).toBe('msg-1');
    expect(topicGetter).toHaveBeenCalledWith('git');
    expect(publishMessage).toHaveBeenCalled();
    const payload = JSON.parse(publishMessage.mock.calls[0][0].data.toString());
    expect(payload.event).toBe('httpApiFetched');
    expect(payload.payload.correlationId).toBe('corr-1');
  });
});
