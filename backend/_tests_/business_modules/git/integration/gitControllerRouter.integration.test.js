"use strict";

const path = require("path");
const Fastify = require("fastify");

// Integration tests for Git Controller + Router using fastify.inject
// Covers: success path, error propagation, correlation-id handling

describe("Git Controller + Router (Fastify inject)", () => {
  const controllerPath = path.resolve(
    __dirname,
    "../../../../business_modules/git/application/gitController.js"
  );
  const routerPath = path.resolve(
    __dirname,
    "../../../../business_modules/git/input/gitRouter.js"
  );

  function build(overrides = {}) {
    const app = Fastify({ logger: false });

    // auth stub -> provide user and di scope
    app.decorate("verifyToken", async (request) => {
      request.user = { id: overrides.userId || "u-1" };
      // per-request DI scope expected by controller
      request.diScope = {
        resolve: (name) => {
          if (name === "gitService") {
            return (
              overrides.gitService || {
                fetchRepo: jest.fn(async (userId, repoId, correlationId) => ({
                  id: repoId,
                  name: repoId.split("/")[1],
                  fullName: repoId,
                  owner: repoId.split("/")[0],
                  private: false,
                  url: `https://github.com/${repoId}`,
                  fetchedBy: userId,
                  correlationId,
                })),
              }
            );
          }
          return null;
        },
      };
    });

    // minimal httpErrors used by controller
    app.decorate("httpErrors", {
      internalServerError: (msg, { cause } = {}) =>
        Object.assign(new Error(msg), { statusCode: 500, cause }),
    });

  app.register(require(controllerPath));
  app.register(require(routerPath));

    return app;
  }

  test("GET /repositories/:owner/:repo returns repo from service and passes correlation id", async () => {
    const gitService = {
      fetchRepo: jest.fn(async (userId, repoId, correlationId) => ({
        id: repoId,
        name: repoId.split("/")[1],
        fullName: repoId,
        owner: repoId.split("/")[0],
        private: false,
        description: "demo",
        url: `https://github.com/${repoId}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fetchedBy: userId,
        correlationId,
      })),
    };

    const app = build({ gitService, userId: "user-42" });
    await app.ready();

    const res = await app.inject({
      method: "GET",
      url: "/repositories/octo/demo",
      headers: { "x-correlation-id": "corr-123" },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json).toEqual(
      expect.objectContaining({
        id: "octo/demo",
        fullName: "octo/demo",
        owner: "octo",
        name: "demo",
        url: "https://github.com/octo/demo",
      })
    );
    expect(gitService.fetchRepo).toHaveBeenCalledWith(
      "user-42",
      "octo/demo",
      "corr-123"
    );

    await app.close();
  });

  test("GET returns 500 when service throws", async () => {
    const error = new Error("boom");
    const gitService = {
      fetchRepo: jest.fn(async () => {
        throw error;
      }),
    };
    const app = build({ gitService });
    await app.ready();

    const res = await app.inject({
      method: "GET",
      url: "/repositories/org/repo",
    });

    expect(res.statusCode).toBe(500);
    // Fastify will format error; ensure controller transformed it to 500
    expect(gitService.fetchRepo).toHaveBeenCalled();

    await app.close();
  });

  test("GET generates correlation id when header missing", async () => {
    const gitService = {
      fetchRepo: jest.fn(async (_userId, _repoId, correlationId) => {
        return { id: _repoId, correlationId };
      }),
    };

    const app = build({ gitService });
    await app.ready();

    const res = await app.inject({
      method: "GET",
      url: "/repositories/owner/repo1",
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.id).toBe("owner/repo1");
    expect(gitService.fetchRepo).toHaveBeenCalled();
    const passedCorrelation = gitService.fetchRepo.mock.calls[0][2];
    expect(typeof passedCorrelation).toBe("string");
    expect(passedCorrelation.startsWith("http-")).toBe(true);

    await app.close();
  });
});

// Placeholder input-validation tests for future Git router endpoints
// Enable when Git router exposes endpoints with body/query schemas
describe.skip("Git Router input validation (enable when query/body endpoints exist)", () => {
  const pathLib = require("path");
  const Fastify = require("fastify");
  const controllerPath = pathLib.resolve(
    __dirname,
    "../../../../business_modules/git/application/gitController.js"
  );
  const routerPath = pathLib.resolve(
    __dirname,
    "../../../../business_modules/git/input/gitRouter.js"
  );

  function build(overrides = {}) {
    const app = Fastify({ logger: false });
    app.decorate("verifyToken", async (request) => {
      request.user = { id: overrides.userId || "u-1" };
      request.diScope = {
        resolve: () => overrides.gitService || { fetchRepo: jest.fn() },
      };
    });
    app.decorate("httpErrors", {
      internalServerError: (msg, { cause } = {}) =>
        Object.assign(new Error(msg), { statusCode: 500, cause }),
      badRequest: (msg) => Object.assign(new Error(msg), { statusCode: 400 }),
    });
    app.register(require(controllerPath));
    app.register(require(routerPath));
    return app;
  }

  test("GET /repositories (query schema) returns 400 when required query missing", async () => {
    const app = build();
    await app.ready();
    // NOTE: This route is hypothetical. Switch to the actual path once added.
    const res = await app.inject({ method: "GET", url: "/repositories" });
    expect([400, 404]).toContain(res.statusCode);
    await app.close();
  });

  test("POST /repositories/fetch (body schema) returns 400 for invalid body", async () => {
    const app = build();
    await app.ready();
    // NOTE: This route is hypothetical. Switch to the actual path once added.
    const res = await app.inject({ method: "POST", url: "/repositories/fetch", payload: {} });
    expect([400, 404]).toContain(res.statusCode);
    await app.close();
  });
});
