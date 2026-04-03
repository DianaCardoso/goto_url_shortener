'use strict';

const { Server }              = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const fs   = require('node:fs');
const path = require('node:path');

const DATA_FILE = path.join(__dirname, 'data.json');

// ---------------------------------------------------------------------------
// Data layer (same as server.js — reads/writes data.json directly)
// ---------------------------------------------------------------------------

function loadDb() {
  if (!fs.existsSync(DATA_FILE)) {
    return { aliases: {} };
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveDb(db) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const server = new Server(
  { name: 'goto-app', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'list_aliases',
      description: 'Lista todos os atalhos de URL salvos no goto-app.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'add_alias',
      description:
        'Adiciona ou atualiza um atalho de URL. Após adicionar, fica acessível em http://goto/<alias> em qualquer browser.',
      inputSchema: {
        type: 'object',
        properties: {
          alias: {
            type: 'string',
            description: 'Nome do atalho (somente letras, números, _ e -)',
          },
          url: {
            type: 'string',
            description: 'URL de destino (deve começar com http:// ou https://)',
          },
        },
        required: ['alias', 'url'],
      },
    },
    {
      name: 'delete_alias',
      description: 'Remove um atalho de URL.',
      inputSchema: {
        type: 'object',
        properties: {
          alias: {
            type: 'string',
            description: 'Nome do atalho a remover',
          },
        },
        required: ['alias'],
      },
    },
    {
      name: 'get_alias',
      description: 'Retorna a URL de destino de um atalho específico.',
      inputSchema: {
        type: 'object',
        properties: {
          alias: {
            type: 'string',
            description: 'Nome do atalho',
          },
        },
        required: ['alias'],
      },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // ---- list_aliases -------------------------------------------------------
  if (name === 'list_aliases') {
    const db = loadDb();
    const entries = Object.entries(db.aliases);
    if (entries.length === 0) {
      return { content: [{ type: 'text', text: 'Nenhum atalho salvo ainda.' }] };
    }
    const list = entries
      .map(([alias, url]) => `• http://goto/${alias}  →  ${url}`)
      .join('\n');
    return {
      content: [{ type: 'text', text: `Atalhos salvos (${entries.length}):\n\n${list}` }],
    };
  }

  // ---- add_alias ----------------------------------------------------------
  if (name === 'add_alias') {
    const { alias, url } = args;
    if (!/^[a-zA-Z0-9_-]+$/.test(alias)) {
      return {
        content: [{ type: 'text', text: 'Erro: o alias só pode conter letras, números, _ e -' }],
        isError: true,
      };
    }
    if (!/^https?:\/\//i.test(url)) {
      return {
        content: [{ type: 'text', text: 'Erro: a URL deve começar com http:// ou https://' }],
        isError: true,
      };
    }
    const db = loadDb();
    const existed = !!db.aliases[alias];
    db.aliases[alias] = url;
    saveDb(db);
    const action = existed ? 'Atualizado' : 'Adicionado';
    return {
      content: [{ type: 'text', text: `${action}: http://goto/${alias}  →  ${url}` }],
    };
  }

  // ---- delete_alias -------------------------------------------------------
  if (name === 'delete_alias') {
    const { alias } = args;
    const db = loadDb();
    if (!db.aliases[alias]) {
      return {
        content: [{ type: 'text', text: `Erro: atalho "${alias}" não encontrado` }],
        isError: true,
      };
    }
    delete db.aliases[alias];
    saveDb(db);
    return { content: [{ type: 'text', text: `Atalho removido: ${alias}` }] };
  }

  // ---- get_alias ----------------------------------------------------------
  if (name === 'get_alias') {
    const { alias } = args;
    const db = loadDb();
    const url = db.aliases[alias];
    if (!url) {
      return {
        content: [{ type: 'text', text: `Atalho "${alias}" não encontrado` }],
        isError: true,
      };
    }
    return {
      content: [{ type: 'text', text: `http://goto/${alias}  →  ${url}` }],
    };
  }

  return {
    content: [{ type: 'text', text: `Ferramenta desconhecida: ${name}` }],
    isError: true,
  };
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`MCP server error: ${err.message}\n`);
  process.exit(1);
});
