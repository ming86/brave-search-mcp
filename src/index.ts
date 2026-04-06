#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { invokeBraveWebSearch } from './tools/braveWebSearchTool.js';

const server = new McpServer({
  name: 'brave-search-mcp',
  version: '0.1.0',
});

server.tool(
  'braveWebSearch',
  `Web search via Brave Search API. Returns JSON with title, description, and URL for each result.\n\nUse for: general information lookup, current events (with freshness or news filter), research.`,
  {
    query: z.string().min(1).max(400).describe('Search query (max 400 chars)'),
    count: z.number().int().min(1).max(20).default(10).optional().describe('Number of results (1-20, default 10)'),
    freshness: z.string().optional().describe("Recency: 'pd' (24h), 'pw' (7d), 'pm' (31d), 'py' (365d), or 'YYYY-MM-DDtoYYYY-MM-DD'"),
    result_filter: z.array(z.enum(['discussions', 'faq', 'infobox', 'news', 'query', 'videos', 'web'])).default(['web']).optional().describe('Result types to return. Add "news" for current events.'),
    country: z.string().optional().describe('Country code for search results (e.g. "US", "GB")'),
    search_lang: z.string().optional().describe('Search language (e.g. "en", "fr")'),
    safesearch: z.enum(['off', 'moderate', 'strict']).optional().describe('Safe search filter level'),
    extra_snippets: z.boolean().optional().describe('Return extra alternate snippets for web results'),
    summary: z.boolean().optional().describe('Enable AI summarization of results'),
  },
  async (params) => {
    try {
      const content = await invokeBraveWebSearch(params);
      return { content };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text' as const, text: message }],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('brave-search-mcp server started on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
