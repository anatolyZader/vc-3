"use strict";

const path = require("path");

describe("DocsService orchestration", () => {
  const svcPath = path.resolve(
    __dirname,
    "../../../../business_modules/docs/application/services/docsService.js"
  );

  test("fetchDocs delegates to entity->git, persists, and publishes event when available", async () => {
    const DocsService = require(svcPath);
    const zipMock = Buffer.from("zipdata");

    const docsGitAdapter = { fetchDocs: jest.fn(async () => zipMock) };
    const docsPersistAdapter = { persistDocs: jest.fn(async () => undefined) };
    const docsMessagingAdapter = { publishFetchedDocsEvent: jest.fn(async () => undefined) };

    const svc = new DocsService({ docsMessagingAdapter, docsPersistAdapter, docsGitAdapter });
    const out = await svc.fetchDocs("u1", "owner/repo");

    expect(out).toBe(zipMock);
    expect(docsGitAdapter.fetchDocs).toHaveBeenCalledWith("owner/repo");
    expect(docsPersistAdapter.persistDocs).toHaveBeenCalledWith("u1", "owner/repo", zipMock);
    expect(docsMessagingAdapter.publishFetchedDocsEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'docsFetched', userId: 'u1', repoId: 'owner/repo', docs: zipMock }));
  });

  test("createPage delegates to entity->git and publishes event", async () => {
    const DocsService = require(svcPath);
    const created = { id: "p-1", title: "T" };

    const docsGitAdapter = { createPage: jest.fn(async () => created) };
    const docsMessagingAdapter = { publishPageCreatedEvent: jest.fn(async () => undefined) };

    const svc = new DocsService({ docsMessagingAdapter, docsGitAdapter, docsPersistAdapter: {} });
    const out = await svc.createPage("u1", "owner/repo", "Title");

    expect(out).toEqual(created);
    expect(docsGitAdapter.createPage).toHaveBeenCalledWith("Title");
    expect(docsMessagingAdapter.publishPageCreatedEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'docsPageCreated', userId: 'u1', repoId: 'owner/repo', pageId: 'p-1', pageTitle: 'Title' }));
  });

  test("updatePage delegates to entity->git and publishes event", async () => {
    const DocsService = require(svcPath);

    const docsGitAdapter = { updatePage: jest.fn(async () => undefined) };
    const docsMessagingAdapter = { publishPageUpdatedEvent: jest.fn(async () => undefined) };

    const svc = new DocsService({ docsMessagingAdapter, docsGitAdapter, docsPersistAdapter: {} });
    await svc.updatePage("u1", "owner/repo", "page-1", "new content");

    expect(docsGitAdapter.updatePage).toHaveBeenCalledWith("page-1", "new content");
    expect(docsMessagingAdapter.publishPageUpdatedEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'docsPageUpdated', userId: 'u1', repoId: 'owner/repo', pageId: 'page-1', newContent: 'new content' }));
  });

  test("deletePage delegates to entity->git and publishes event", async () => {
    const DocsService = require(svcPath);

    const docsGitAdapter = { deletePage: jest.fn(async () => undefined) };
    const docsMessagingAdapter = { publishPageDeletedEvent: jest.fn(async () => undefined) };

    const svc = new DocsService({ docsMessagingAdapter, docsGitAdapter, docsPersistAdapter: {} });
    await svc.deletePage("u1", "owner/repo", "page-1");

    expect(docsGitAdapter.deletePage).toHaveBeenCalledWith("page-1");
    expect(docsMessagingAdapter.publishPageDeletedEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'docsPageDeleted', userId: 'u1', repoId: 'owner/repo', pageId: 'page-1' }));
  });

  test("updateDocsFiles queues background job via ai adapter and does not throw", async () => {
    const DocsService = require(svcPath);

    const spy = jest.fn();
    const docsAiAdapter = { updateDocsFiles: spy };

    const svc = new DocsService({ docsAiAdapter, docsPersistAdapter: {}, docsGitAdapter: {} });
    svc.updateDocsFiles("u1");

    expect(spy).toHaveBeenCalledWith("u1");
  });
});
