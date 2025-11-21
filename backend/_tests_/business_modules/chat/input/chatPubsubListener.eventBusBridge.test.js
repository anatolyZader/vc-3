"use strict";

const path = require("path");
const Fastify = require("fastify");

describe("Chat event bus bridge (answerAdded)", () => {
  const listenerPath = path.resolve(
    __dirname,
    "../../../../business_modules/chat/input/chatPubsubListener.js"
  );

  test("wires answerAdded to fastify.addAnswer handler", async () => {
    await jest.isolateModulesAsync(async () => {
      // Mock the exact module path used by the listener (backend/eventDispatcher)
      const dispatcherPath = require("path").resolve(__dirname, "../../../../eventDispatcher");
      jest.doMock(dispatcherPath, () => {
        const EventEmitter = require("events");
        const eventBus = new EventEmitter();
        return { eventBus };
      }, { virtual: false });

      const { eventBus } = require(dispatcherPath);

      const app = Fastify({ logger: false });
      const addAnswer = jest.fn(async () => ({ ok: true }));
      app.decorate("addAnswer", addAnswer);
      app.register(require(listenerPath));
      await app.ready();

  const payload = { userId: "u1", conversationId: "c1", answer: "Ans" };
  const { getChatEventValidators } = require("../../../helpers/eventSchemas");
  const { validateAnswerAdded } = getChatEventValidators();
  expect(validateAnswerAdded({ event: "answerAdded", payload })).toBe(true);
      eventBus.emit("answerAdded", payload);

      // Allow microtasks
      await new Promise((r) => setImmediate(r));
      expect(addAnswer).toHaveBeenCalled();
      await app.close();
    });
  });
});
