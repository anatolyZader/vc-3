"use strict";

const path = require("path");
const Fastify = require("fastify");

describe("Chat Controller + Router (Fastify inject)", () => {
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
    });

    // DI scope per request
    app.decorateRequest("diScope", null);
    app.addHook("onRequest", async (req) => {
      req.diScope = {
        resolve: (name) => {
          if (name === "chatService") return chatServiceImpl || {
            startConversation: jest.fn(async (userId, title) => "c-1"),
            fetchConversationsHistory: jest.fn(async (userId) => []),
          };
          return null;
        },
      };
    });

    app.register(require(controllerPath));
    app.register(require(routerPath), { prefix: "/api/chat" });

    return app;
  }

  test("POST /api/chat/start returns conversationId and calls service", async () => {
    const chatService = { startConversation: jest.fn(async () => "c-123") };
    const app = build({ chatServiceImpl: chatService });
    await app.ready();

    const res = await app.inject({ method: "POST", url: "/api/chat/start", payload: { title: "My Chat" } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ conversationId: "c-123" });
    expect(chatService.startConversation).toHaveBeenCalledWith("u-1", "My Chat");
    await app.close();
  });

  test("POST /api/chat/start without title fails 400 via schema", async () => {
    const app = build();
    await app.ready();
    const res = await app.inject({ method: "POST", url: "/api/chat/start", payload: {} });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  test("GET /api/chat/history returns array", async () => {
    const chatService = { fetchConversationsHistory: jest.fn(async () => ([{ conversationId: "c1", title: "T", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }])) };
    const app = build({ chatServiceImpl: chatService });
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/api/chat/history" });
    expect(res.statusCode).toBe(200);
    const arr = res.json();
    expect(Array.isArray(arr)).toBe(true);
    expect(arr[0]).toEqual(expect.objectContaining({ conversationId: expect.any(String), title: expect.any(String), createdAt: expect.any(String), updatedAt: expect.any(String) }));
    await app.close();
  });
});
