"use strict";

const path = require("path");

describe("ApiService orchestration", () => {
  const servicePath = path.resolve(
    __dirname,
    "../../../../business_modules/api/application/services/apiService.js"
  );

  test("fetchHttpApi orchestrates adapter->persist->publish and returns spec", async () => {
    const ApiService = require(servicePath);
    const apiAdapter = { fetchHttpApi: jest.fn(async () => ({ openapi: "3.0.0", info: { title: "t" } })) };
    const apiPersistAdapter = { saveHttpApi: jest.fn(async () => undefined) };
    const apiMessagingAdapter = { publishHttpApiFetchedEvent: jest.fn(async () => "mid-1") };

    const svc = new ApiService({ apiAdapter, apiPersistAdapter, apiMessagingAdapter });
    const out = await svc.fetchHttpApi("u1", "r1");

    expect(apiAdapter.fetchHttpApi).toHaveBeenCalledWith("u1", "r1");
    expect(apiPersistAdapter.saveHttpApi).toHaveBeenCalledWith("u1", "r1", expect.any(Object));
    expect(apiMessagingAdapter.publishHttpApiFetchedEvent).toHaveBeenCalledWith(expect.objectContaining({ userId: "u1", repoId: "r1" }));
    expect(out).toEqual(expect.objectContaining({ openapi: expect.any(String) }));
  });
});
