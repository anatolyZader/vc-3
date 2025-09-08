"use strict";

const path = require("path");

describe("ChatService orchestration", () => {
  const svcPath = path.resolve(
    __dirname,
    "../../../../business_modules/chat/application/services/chatService.js"
  );

  test("startConversation calls persist and returns id", async () => {
    const ChatService = require(svcPath);
    const chatPersistAdapter = { startConversation: jest.fn(async () => undefined) };
    const svc = new ChatService({ chatPersistAdapter });
    const id = await svc.startConversation("u1", "Title");
    expect(typeof id).toBe("string");
    expect(chatPersistAdapter.startConversation).toHaveBeenCalledWith("u1", "Title", expect.any(String));
  });

  test("fetchConversationsHistory delegates to entity via persist", async () => {
    const ChatService = require(svcPath);
    const rows = [{ conversationId: "c1", title: "t", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
    const chatPersistAdapter = { fetchConversationsHistory: jest.fn(async () => rows) };
    const svc = new ChatService({ chatPersistAdapter });
    const out = await svc.fetchConversationsHistory("u1");
    expect(out).toEqual(rows);
  });
});
