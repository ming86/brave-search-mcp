# brave-search-mcp

An MCP server for web search via the Brave Search API. Port of the `braveWebSearch` LM tool from [lmtools-brave-search](https://github.com/ming86/lmtools-brave-search).

## Purpose

Perform web searches from any MCP-compatible client:

- **General information lookup** — search the web for facts, documentation, and references
- **Current events** — use freshness filters or the news result type for recent content
- **Research** — retrieve web pages, FAQ answers, forum discussions, news articles, and videos in a single query

## Installation

No installation required. MCP clients run the server directly from the GitHub repository using `npx`.

## Configuration

### VS Code (GitHub Copilot)

Add to your VS Code `settings.json`, or create a `.vscode/mcp.json` in your workspace root:

**macOS / Linux — settings.json:**

```json
{
  "mcp": {
    "servers": {
      "brave-search-mcp": {
        "command": "npx",
        "args": ["-y", "github:ming86/brave-search-mcp"],
        "env": {
          "BRAVE_API_KEY": "your-api-key-here"
        }
      }
    }
  }
}
```

**Windows — settings.json:**

```json
{
  "mcp": {
    "servers": {
      "brave-search-mcp": {
        "command": "cmd",
        "args": ["/c", "npx", "-y", "github:ming86/brave-search-mcp"],
        "env": {
          "BRAVE_API_KEY": "your-api-key-here"
        }
      }
    }
  }
}
```

**.vscode/mcp.json** (per-project, macOS/Linux):

```json
{
  "servers": {
    "brave-search-mcp": {
      "command": "npx",
      "args": ["-y", "github:ming86/brave-search-mcp"],
      "env": {
        "BRAVE_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**.vscode/mcp.json** (per-project, Windows):

```json
{
  "servers": {
    "brave-search-mcp": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "github:ming86/brave-search-mcp"],
      "env": {
        "BRAVE_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### GitHub Copilot CLI

The MCP config file is `~/.copilot/mcp-config.json` (macOS/Linux) or `%USERPROFILE%\.copilot\mcp-config.json` (Windows). You can also add servers interactively with `/mcp add` inside the CLI.

**macOS / Linux:**

```json
{
  "mcpServers": {
    "brave-search-mcp": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "github:ming86/brave-search-mcp"],
      "env": {
        "BRAVE_API_KEY": "your-api-key-here"
      },
      "tools": ["*"]
    }
  }
}
```

**Windows:**

```json
{
  "mcpServers": {
    "brave-search-mcp": {
      "type": "local",
      "command": "cmd",
      "args": ["/c", "npx", "-y", "github:ming86/brave-search-mcp"],
      "env": {
        "BRAVE_API_KEY": "your-api-key-here"
      },
      "tools": ["*"]
    }
  }
}
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BRAVE_API_KEY` | Yes | Your Brave Search API subscription token. [Get an API key](https://brave.com/search/api/) |

## Tool: `braveWebSearch`

### Input

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | `string` | Yes | — | Search query (max 400 chars) |
| `count` | `integer` | No | `10` | Number of results (1-20) |
| `freshness` | `string` | No | — | Recency: `pd` (24h), `pw` (7d), `pm` (31d), `py` (365d), or `YYYY-MM-DDtoYYYY-MM-DD` |
| `result_filter` | `string[]` | No | `["web"]` | Result types: `discussions`, `faq`, `infobox`, `news`, `query`, `videos`, `web` |
| `country` | `string` | No | — | Country code (e.g. `US`, `GB`) |
| `search_lang` | `string` | No | — | Search language (e.g. `en`, `fr`) |
| `safesearch` | `string` | No | — | Filter level: `off`, `moderate`, `strict` |
| `extra_snippets` | `boolean` | No | — | Return extra alternate snippets for web results |
| `summary` | `boolean` | No | — | Enable AI summarization of results |

### Output

Returns an array of text content parts. Each part contains a JSON-serialized object for a single result:

**Web results:**

| Field | Type | Description |
|-------|------|-------------|
| `url` | `string` | Page URL |
| `title` | `string` | Page title |
| `description` | `string?` | Page description |
| `extra_snippets` | `string[]?` | Additional excerpts |

**FAQ results:**

| Field | Type | Description |
|-------|------|-------------|
| `question` | `string` | The question |
| `answer` | `string` | The answer |
| `title` | `string` | Source page title |
| `url` | `string` | Source page URL |

**News results:**

| Field | Type | Description |
|-------|------|-------------|
| `url` | `string` | Article URL |
| `title` | `string` | Article title |
| `description` | `string?` | Article description |
| `source` | `string?` | News source |
| `breaking` | `boolean` | Whether this is breaking news |
| `is_live` | `boolean` | Whether this is a live article |
| `age` | `string?` | Age of the article |

### Example

Request:

```json
{
  "query": "TypeScript 5.5 new features",
  "count": 3,
  "freshness": "pm"
}
```

Response (each entry is a separate text content part):

```json
{"url":"https://example.com/ts55","title":"TypeScript 5.5 Released","description":"Overview of new features in TypeScript 5.5..."}
```

```json
{"url":"https://example.com/ts55-guide","title":"What's New in TypeScript 5.5","description":"A comprehensive guide to the latest TypeScript release..."}
```

## Rate Limiting

The server automatically retries on HTTP 429 (rate limit) responses with exponential backoff, up to 5 retries. The Retry-After header is respected when present.

## License

See [LICENSE](LICENSE).
