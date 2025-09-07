"use strict";

const path = require("path");
const Fastify = require("fastify");

describe("Chat additional routes (Fastify inject)", () => {
  const controllerPath = path.resolve(
    __dirname,
    "../../../../business_modules/chat/application/chatController.js"
  );
  const routerPath = path.resolve(
    __dirname,
    "../../../../business_modules/chat/input/chatRouter.js"
  );

  function build({ chatServiceImpl } = {}) {
    const app = Fastify({ logger: false });

    // auth stub
    app.decorate("verifyToken", async (request) => {
      request.user = { id: "u-1" };
    });

    // minimal httpErrors
    app.decorate("httpErrors", {
      internalServerError: (msg, { cause } = {}) => Object.assign(new Error(msg), { statusCode: 500, cause }),
      badRequest: (msg) => Object.assign(new Error(msg), { statusCode: 400 }),
      unauthorized: (msg) => Object.assign(new Error(msg), { statusCode: 401 }),
    });

    // DI scope per request
    app.decorateRequest("diScope", null);
    app.addHook("onRequest", async (req) => {
      req.diScope = {
        resolve: (name) => {
          if (name === "chatService")
            return (
              chatServiceImpl || {
                nameConversation: jest.fn(async (_userId, _cid) => "Named Title"),
                fetchConversation: jest.fn(async (_userId, cid) => ({
                  conversationId: cid,
                  title: "Title",
                  messages: [
                    { role: "user", text: "Hi", timestamp: new Date().toISOString() },
                    { role: "ai", text: "Hello!", timestamp: new Date().toISOString() },
                  ],
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                })),
                addQuestion: jest.fn(async () => "q-1"),
                addAnswer: jest.fn(async () => "a-1"),
              }
            );
          return null;
        },
      };
    });

    app.register(require(controllerPath));
    app.register(require(routerPath), { prefix: "/api/chat" });
    return app;
  }

  test("POST /name-conversation returns conversationId + title and calls service", async () => {
    const chatService = {
      nameConversation: jest.fn(async () => "AI Named"),
    };
    const app = build({ chatServiceImpl: chatService });
    await app.ready();

    const res = await app.inject({ method: "POST", url: "/name-conversation", payload: { conversationId: "c-1" } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ conversationId: "c-1", title: "AI Named" });
    expect(chatService.nameConversation).toHaveBeenCalledWith("u-1", "c-1");
    await app.close();
  });

  test("POST /name-conversation without conversationId fails 400 via schema", async () => {
    const app = build();
    await app.ready();
    const res = await app.inject({ method: "POST", url: "/name-conversation", payload: {} });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  test("GET /:conversationId returns conversation with messages", async () => {
    const chatService = {
      fetchConversation: jest.fn(async (_userId, cid) => ({
        conversationId: cid,
        title: "T",
        messages: [
          { role: "user", text: "Q", timestamp: new Date().toISOString() },
          { role: "ai", text: "A", timestamp: new Date().toISOString() },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
    };
    const app = build({ chatServiceImpl: chatService });
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/c-9" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toEqual(
      expect.objectContaining({
        conversationId: "c-9",
        title: expect.any(String),
        messages: expect.any(Array),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      })
    );
    expect(chatService.fetchConversation).toHaveBeenCalledWith("u-1", "c-9");
    await app.close();
  });

  test("POST /:conversationId/question returns receipt and calls service", async () => {
    const chatService = {
      addQuestion: jest.fn(async () => "q-9"),
    };
    const app = build({ chatServiceImpl: chatService });
    await app.ready();

    const res = await app.inject({ method: "POST", url: "/c-2/question", payload: { prompt: "Why?" } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toEqual(
      expect.objectContaining({
        questionId: "q-9",
        status: "received",
        message: expect.any(String),
        timestamp: expect.any(String),
      })
    );
    expect(chatService.addQuestion).toHaveBeenCalledWith("u-1", "c-2", "Why?");
    await app.close();
  });

  test("POST /:conversationId/answer returns success and calls service with fromEvent=false", async () => {
    const chatService = {
      addAnswer: jest.fn(async () => "a-9"),
    };
    const app = build({ chatServiceImpl: chatService });
    await app.ready();

    const res = await app.inject({ method: "POST", url: "/c-3/answer", payload: { aiResponse: "OK" } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toEqual(
      expect.objectContaining({
        answerId: "a-9",
        status: "success",
        timestamp: expect.any(String),
      })
    );
    expect(chatService.addAnswer).toHaveBeenCalledWith("u-1", "c-3", "OK", false);
    await app.close();
  });
});
