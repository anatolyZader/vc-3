"use strict";

const path = require("path");

describe("ApiSwaggerAdapter", () => {
  const adapterPath = path.resolve(
    __dirname,
    "../../../../business_modules/api/infrastructure/api/apiSwaggerAdapter.js"
  );

  test("fetchHttpApi returns loaded OpenAPI spec", async () => {
    jest.isolateModules(() => {
      const Adapter = require(adapterPath);
      const adapter = new Adapter();
      return adapter.fetchHttpApi("u", "r").then((spec) => {
        expect(spec).toEqual(expect.objectContaining({ openapi: expect.any(String), info: expect.objectContaining({ title: expect.any(String) }) }));
      });
    });
  });
});
