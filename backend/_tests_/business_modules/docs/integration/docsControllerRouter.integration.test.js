"use strict";

const path = require("path");
const Fastify = require("fastify");

describe("Docs Controller + Router (Fastify inject)", () => {
  const controllerPath = path.resolve(
    __dirname,
    "../../../../business_modules/docs/application/docsController.js"
  );
  const routerPath = path.resolve(
    __dirname,
    "../../../../business_modules/docs/input/docsRouter.js"
  );

  function build(overrides = {}) {
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
          if (name === "docsService") {
            return overrides.docsService || {
              fetchDocs: jest.fn(async (userId, repoId) => ({ repoId, pages: [] })),
              fetchPage: jest.fn(async (userId, repoId, pageId) => ({ pageId, title: "T", content: "C", updatedAt: new Date().toISOString() })),
              createPage: jest.fn(async (userId, repoId, pageTitle) => ({ id: "p-1", title: pageTitle })),
              updatePage: jest.fn(async (userId, repoId, pageId, newContent) => undefined),
              deletePage: jest.fn(async (userId, repoId, pageId) => undefined),
              updateDocsFiles: jest.fn(() => undefined),
            };
          }
          return null;
        },
      };
    });

    app.register(require(controllerPath));
    app.register(require(routerPath), { prefix: "/api/docs" });

    return app;
  }

  test("GET /repos/:repoId/docs returns docs payload", async () => {
    const app = build();
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/repos/r-1/docs" });
    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json).toEqual(expect.objectContaining({ repoId: "r-1", pages: expect.any(Array) }));

    await app.close();
  });

  test("GET /repos/:repoId/pages/:pageId returns page payload", async () => {
    const app = build();
    await app.ready();

  const res = await app.inject({ method: "GET", url: "/repos/r-1/pages/p-1" });
    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json).toEqual(expect.objectContaining({ pageId: "p-1", title: expect.any(String), content: expect.any(String), updatedAt: expect.any(String) }));

    await app.close();
  });

  test("POST /repos/:repoId/pages/create creates page", async () => {
    const docsService = {
      createPage: jest.fn(async () => ({ id: "p-123" })),
    };
    const app = build({ docsService });
    await app.ready();

  const res = await app.inject({ method: "POST", url: "/repos/r-1/pages/create", payload: { pageTitle: "My Page" } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ message: "Docs page created successfully" });
  expect(docsService.createPage).toHaveBeenCalledWith("u-1", "r-1", "My Page");

    await app.close();
  });

  test("PUT /repos/:repoId/pages/:pageId updates page content", async () => {
    const docsService = { updatePage: jest.fn(async () => undefined) };
    const app = build({ docsService });
    await app.ready();

  const res = await app.inject({ method: "PUT", url: "/repos/r-1/pages/p-1", payload: { newContent: "Hello" } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ message: "Docs page content updated successfully" });
  expect(docsService.updatePage).toHaveBeenCalledWith("u-1", "r-1", "p-1", "Hello");

    await app.close();
  });

  test("DELETE /repos/:repoId/pages/:pageId deletes page", async () => {
    const docsService = { deletePage: jest.fn(async () => undefined) };
    const app = build({ docsService });
    await app.ready();

  const res = await app.inject({ method: "DELETE", url: "/repos/r-1/pages/p-1" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ message: "Docs page deleted successfully" });
  expect(docsService.deletePage).toHaveBeenCalledWith("u-1", "r-1", "p-1");

    await app.close();
  });

  test("POST /update-files accepts and returns 202", async () => {
    const docsService = { updateDocsFiles: jest.fn(() => undefined) };
    const app = build({ docsService });
    await app.ready();

  const res = await app.inject({ method: "POST", url: "/update-files" });
    expect(res.statusCode).toBe(202);
    expect(res.json()).toEqual({ message: "Docs file update process has been queued." });
    expect(docsService.updateDocsFiles).toHaveBeenCalledWith("u-1");

    await app.close();
  });
});
