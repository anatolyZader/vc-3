"use strict";

const path = require("path");

describe("ChatPubsubAdapter (contract)", () => {
  const adapterPath = path.resolve(
    __dirname,
    "../../../../../../business_modules/chat/infrastructure/messaging/pubsub/chatPubsubAdapter.js"
  );

  test("publishEvent dispatches via function eventDispatcher", async () => {
    const dispatched = [];
    const eventDispatcher = async (name, payload) => { dispatched.push({ name, payload }); };
    const Adapter = require(adapterPath);
    const adapter = new Adapter({ eventDispatcher });

    await adapter.addQuestion({ userId: "u1", conversationId: "c1", prompt: "Why?" });

    expect(dispatched).toHaveLength(1);
    expect(dispatched[0]).toEqual({ name: "questionAdded", payload: { userId: "u1", conversationId: "c1", prompt: "Why?" } });
  });
});
