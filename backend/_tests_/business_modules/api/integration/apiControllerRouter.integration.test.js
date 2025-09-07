"use strict";

const path = require("path");
const Fastify = require("fastify");

describe("API Controller + Router (Fastify inject)", () => {
  const controllerPath = path.resolve(
    __dirname,
    "../../../../business_modules/api/application/apiController.js"
  );
  const routerPath = path.resolve(
    __dirname,
    "../../../../business_modules/api/input/apiRouter.js"
  );

  function build({ apiServiceImpl, swaggerImpl } = {}) {
    const app = Fastify({ logger: false });

    // Auth stub
    app.decorate("verifyToken", async (request, reply) => {
      request.user = { id: "u-1" };
    });

    // Minimal httpErrors and swagger stubs
    app.decorate("httpErrors", {
      internalServerError: (msg, { cause } = {}) => Object.assign(new Error(msg), { statusCode: 500, cause }),
    });
    app.decorate("swagger", () => swaggerImpl || { openapi: "3.0.0", info: { title: "spec" } });

    // DI: request-scoped service resolve
    app.decorateRequest("diScope", null);
    app.addHook("onRequest", async (req) => {
      req.diScope = {
        resolve: (name) => {
          if (name === "apiService") return apiServiceImpl || { fetchHttpApi: jest.fn(async () => ({ result: "ok", data: { repoId: req.query?.repoId } })) };
          return null;
        },
      };
    });

    // Register controller and router
    app.register(require(controllerPath));
    app.register(require(routerPath), { prefix: "/api/api" });

    return app;
  }

  test("GET /api/api/httpApi returns 200 with service result", async () => {
    const apiService = { fetchHttpApi: jest.fn(async (userId, repoId) => ({ result: "ok", data: { userId, repoId } })) };
    const app = build({ apiServiceImpl: apiService });
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/api/api/httpApi?repoId=r-1" });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toEqual({ result: "ok", data: { userId: "u-1", repoId: "r-1" } });
    expect(apiService.fetchHttpApi).toHaveBeenCalledWith("u-1", "r-1");

    await app.close();
  });

  test("GET /api/api/httpApi without repoId fails validation with 400", async () => {
    const app = build();
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/api/api/httpApi" });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  test("GET /api/api/read-api returns swagger JSON", async () => {
    const swagger = { openapi: "3.1.0", info: { title: "API", version: "0.0.0" } };
    const app = build({ swaggerImpl: swagger });
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/api/api/read-api" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(swagger);

    await app.close();
  });
});
