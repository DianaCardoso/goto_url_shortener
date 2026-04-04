"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { createAliasStore } = require("../storage");

test("alias store creates the backing file on first use", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "goto-storage-"));
  const storePath = path.join(tempDir, "nested", "aliases.json");
  const store = createAliasStore(storePath);

  assert.deepEqual(store.list(), {});
  assert.equal(fs.existsSync(storePath), true);
});

test("alias store persists alias writes and reads", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "goto-storage-"));
  const storePath = path.join(tempDir, "aliases.json");
  const store = createAliasStore(storePath);

  store.set("docs", "https://example.com/docs");

  assert.equal(store.get("docs"), "https://example.com/docs");
  assert.deepEqual(store.list(), {
    docs: "https://example.com/docs",
  });
});

test("alias store deletes existing aliases and reports missing ones", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "goto-storage-"));
  const storePath = path.join(tempDir, "aliases.json");
  const store = createAliasStore(storePath);

  store.set("drive", "https://example.com/drive");

  assert.equal(store.delete("drive"), true);
  assert.equal(store.get("drive"), null);
  assert.equal(store.delete("drive"), false);
});
