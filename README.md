# Learn4Agent

A local proxy server that makes Microsoft Learn documentation agent-friendly by converting HTML to enhanced markdown.

## Why?

AI agents struggle with raw HTML documentation. Learn4Agent solves this by:

- Converting HTML to clean markdown with YAML frontmatter
- Adding metadata (title, date, author, word count)
- Providing scoped navigation showing related pages
- Rewriting links to stay within the proxy ecosystem
- Including search instructions so agents can discover more docs

## Quick Start

```bash
npm install
npm run dev
```

Then fetch any Microsoft Learn page through the proxy:

```bash
curl http://localhost:3000/en-us/azure/azure-functions/functions-overview
```

## Features

### Enhanced Markdown Output

```yaml
---
title: "Azure Functions overview"
ms_service: azure-functions
ms_date: 2025-03-06
author: ggailey777
word_count: 515
---

## In This Section
- **Functions overview** (current)
- [Scenarios](http://localhost:3000/en-us/azure/azure-functions/functions-scenarios)
- [Getting started](http://localhost:3000/en-us/azure/azure-functions/functions-get-started)

# What is Azure Functions?
...
```

### Search API

```bash
curl "http://localhost:3000/api/search?q=azure%20blob%20storage"
```

Returns results with proxy URLs so agents can fetch any result directly.

### Real-time Dashboard

Open http://localhost:3000/dashboard to visualize agent browsing behavior in real-time.

- **PAGE** requests shown in blue
- **SEARCH** requests shown in purple
- Live markdown preview as agents browse

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /en-us/...` | Proxy any Microsoft Learn page |
| `GET /api/search?q=...` | Search Microsoft Learn |
| `GET /dashboard` | Real-time visualization dashboard |

## Tech Stack

- Node.js + TypeScript
- Express 5 + WebSocket
- Cheerio + Turndown (with GFM)
- Vanilla JS dashboard with marked.js

## License

MIT
