"use strict";

const fs = require("node:fs");
const path = require("node:path");

function createEmptyStore() {
  return { aliases: {} };
}

function ensureStoreFile(filePath) {
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(createEmptyStore(), null, 2));
  }
}

function loadStore(filePath) {
  ensureStoreFile(filePath);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function saveStore(filePath, store) {
  fs.writeFileSync(filePath, JSON.stringify(store, null, 2));
}

function createAliasStore(filePath) {
  return {
    filePath,
    delete(alias) {
      const store = loadStore(filePath);

      if (!store.aliases[alias]) {
        return false;
      }

      delete store.aliases[alias];
      saveStore(filePath, store);
      return true;
    },
    get(alias) {
      const store = loadStore(filePath);
      return store.aliases[alias] || null;
    },
    list() {
      const store = loadStore(filePath);
      return store.aliases;
    },
    set(alias, url) {
      const store = loadStore(filePath);
      store.aliases[alias] = url;
      saveStore(filePath, store);
      return url;
    },
    update(oldAlias, newAlias, newUrl) {
      const store = loadStore(filePath);
      if (!store.aliases[oldAlias]) return false;
      if (newAlias !== oldAlias && store.aliases[newAlias] !== undefined)
        return "conflict";
      const url = newUrl || store.aliases[oldAlias];
      if (newAlias !== oldAlias) delete store.aliases[oldAlias];
      store.aliases[newAlias] = url;
      saveStore(filePath, store);
      return { alias: newAlias, url };
    },
  };
}

module.exports = {
  createAliasStore,
};
