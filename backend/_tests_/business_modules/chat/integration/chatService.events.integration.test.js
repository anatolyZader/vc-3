"use strict";

const ChatService = require("../../../../business_modules/chat/application/services/chatService");

describe("ChatService event payloads match schemas", () => {
  test("nameConversation publishes conversationRenamed with schema-valid payload", async () => {
    const published = [];
    const chatMessagingAdapter = {
      publishEvent: jest.fn(async (event, payload) => published.push({ event, payload })),
    };
    const chatPersistAdapter = {
      fetchConversation: jest.fn(async () => ({ messages: [{ role: "user", text: "Hi" }] })),
      renameConversation: jest.fn(async () => {}),
    };
    const chatAiAdapter = { nameConversation: jest.fn(async () => "Nice Title For Chat") };

    const svc = new ChatService({ chatPersistAdapter, chatMessagingAdapter, chatAiAdapter });
    const title = await svc.nameConversation("u1", "c1");
    expect(title).toBeDefined();

    expect(published.length).toBe(1);
    const evt = published[0];
    expect(evt.event).toBe("conversationRenamed");

    const { getChatEventValidators } = require("../../../helpers/eventSchemas");
    const { validateConversationRenamed } = getChatEventValidators();
    expect(validateConversationRenamed({ event: evt.event, payload: evt.payload })).toBe(true);
  });

  test("deleteConversation publishes conversationDeleted with schema-valid payload", async () => {
    const published = [];
    const chatMessagingAdapter = {
      publishEvent: jest.fn(async (event, payload) => published.push({ event, payload })),
    };
    const chatPersistAdapter = {
      deleteConversation: jest.fn(async () => {}),
    };

    const svc = new (require("../../../../business_modules/chat/application/services/chatService"))({ chatPersistAdapter, chatMessagingAdapter });
    const id = await svc.deleteConversation("u1", "c2");
    expect(id).toBe("c2");

    expect(published.length).toBe(1);
    const evt = published[0];
    expect(evt.event).toBe("conversationDeleted");

    const { getChatEventValidators } = require("../../../helpers/eventSchemas");
    const { validateConversationDeleted } = getChatEventValidators();
    expect(validateConversationDeleted({ event: evt.event, payload: evt.payload })).toBe(true);
  });
});
