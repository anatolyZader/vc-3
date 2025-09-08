"use strict";

// Contract tests for Git events published by GitService via messaging adapter.
// We verify that payloads conform to the shared JSON Schemas.

describe("GitService -> event payload schemas", () => {
  test("repositoryFetched matches schema", async () => {
    const { getGitEventValidators } = require("../../../helpers/eventSchemas");
    const { validateRepositoryFetched } = getGitEventValidators();

    // Simulate adapter payload shape (as in gitPubsubAdapter)
    const evt = {
      event: "repositoryFetched",
      correlationId: "corr-123",
      userId: "u1",
      repoId: "org/repo",
      repo: { id: 1, full_name: "org/repo" },
    };

    const valid = validateRepositoryFetched(evt);
    if (!valid) console.error(validateRepositoryFetched.errors);
    expect(valid).toBe(true);
  });

  test("docsFetched matches schema", async () => {
    const { getGitEventValidators } = require("../../../helpers/eventSchemas");
    const { validateDocsFetched } = getGitEventValidators();

    const evt = {
      event: "docsFetched",
      correlationId: "corr-456",
      userId: "u2",
      repoId: "org/repo",
      docs: { pages: [] },
    };

    const valid = validateDocsFetched(evt);
    if (!valid) console.error(validateDocsFetched.errors);
    expect(valid).toBe(true);
  });
});
