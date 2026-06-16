# AgentLint

**A web-based security scanner for MCP (Model Context Protocol) server configs — runs entirely in your browser.**

Paste an MCP config, get a deterministic risk report mapped to the [OWASP Agentic Top 10 (2026)](https://owasp.org/www-project-top-10-for-large-language-model-applications/). Optionally connect your own AI key for a plain-English briefing. Nothing is uploaded — the scanner is pure client-side static analysis, and AI calls go straight from your browser to the provider you choose.

Every other MCP scanner is a CLI for practitioners. AgentLint is the first public, browser-based, **educational** one: no install, no account, no server.

---

## Why

MCP lets agents call external tools, and that surface is now a real attack vector — tool poisoning, rug pulls, the "lethal trifecta," full-schema injection, cross-tool orchestration. Most people wiring up MCP servers have no easy way to sanity-check a config before they trust it. AgentLint is that quick check, and a way to learn what the risks actually look like.

## Features

- **Deterministic static analysis** — 10 rules, no AI required for the core scan. Fast, repeatable, offline.
- **OWASP Agentic Top 10 mapping** — every finding is tagged ASI01–ASI10.
- **Lethal trifecta detection** — flags configs that combine private-data access + untrusted content + external comms.
- **Multi-format parser** — Claude Desktop / Claude Code / Cursor (`mcpServers`), VS Code (`servers`), and remote/SSE transports.
- **Optional AI briefing (BYOK)** — bring your own key for Anthropic, OpenAI, Google Gemini, or any OpenAI-compatible endpoint (Ollama, LM Studio, vLLM, OpenRouter). The key lives only in your browser.
- **Privacy by construction** — your config is never sent to an AgentLint server. Detected secret values are stripped from any AI prompt.

## What it checks

| # | Rule | OWASP |
|---|------|-------|
| 1 | Hardcoded secrets in `env` | ASI03 |
| 2 | Dangerous commands (`curl`, shell pipes, `eval`, `rm`…) | ASI05 |
| 3 | Overly broad filesystem access (`/`, `~`, `/etc`…) | ASI02 |
| 4 | Missing auth on remote/SSE servers | ASI03 |
| 5 | Unpinned package versions | ASI04 |
| 6 | Suspicious tool descriptions (`<IMPORTANT>`, base64, hidden text) | ASI01 |
| 7 | Lethal trifecta (data + untrusted content + external comms) | ASI02 |
| 8 | Privilege escalation (`--privileged`, `sudo`, root) | ASI03 |
| 9 | Network exposure (`0.0.0.0`, open ports) | ASI07 |
| 10 | Unscoped / supply-chain-risky packages | ASI04 |

## How privacy works

- **Scanning is local.** The parser and rule engine run in your browser. The config is never executed and never leaves the page.
- **AI is opt-in and direct.** If you connect a provider, the request goes browser → provider. AgentLint has no backend AI key and no proxy.
- **Secrets are redacted.** The AI prompt omits the `evidence` field, so any secret value a rule detected never reaches a model.
- **Your key stays put.** It's saved in `localStorage` and sent only to the provider you pick. "Disconnect" removes it.

## Tech stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · React 19. No database or auth required to run the scanner.

## Getting started

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

Other scripts:

```bash
pnpm build        # production build
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
```

No environment variables are needed — see [`.env.example`](.env.example). There is intentionally **no** server-side AI key.

### Using the AI briefing

1. Run a scan.
2. In the **Connect an AI** panel, pick a provider and paste your key.
   - **Gemini** has a free tier — get a key at [aistudio.google.com](https://aistudio.google.com).
   - **Local / free:** run [Ollama](https://ollama.com) and choose the *Custom* provider with base URL `http://localhost:11434/v1`. Start Ollama with `OLLAMA_ORIGINS=http://localhost:3000` so the browser can reach it.
   - **Anthropic / OpenAI** need prepaid API credits (separate from any Claude Pro / ChatGPT Plus subscription).

## Supported config formats

```jsonc
// Claude Desktop / Claude Code / Cursor
{ "mcpServers": { "name": { "command": "npx", "args": ["-y", "@some/server"], "env": {} } } }

// VS Code
{ "servers": { "name": { "command": "npx", "args": ["-y", "@some/server"] } } }

// Remote / SSE
{ "mcpServers": { "name": { "url": "https://example.com/mcp", "headers": { "Authorization": "Bearer …" } } } }
```

## Roadmap

- [x] Scanner: static rule engine + OWASP mapping (Phase 1)
- [x] AI briefing via client-side BYOK (Phase 2)
- [ ] Learn mode: CTF-style challenges (tool poisoning, rug pulls, trifecta)
- [ ] Leaderboard + optional auth
- [ ] Rug-pull simulation & lethal-trifecta visualizer, exportable reports

## Contributing

Issues and PRs welcome. The most valuable contributions right now are new detection rules and real-world attack patterns to model. Keep the rule engine deterministic — no rule should depend on a network or AI call.

## License

[MIT](LICENSE) — provided as-is, with no warranty. AgentLint performs static analysis only; it does not replace a real security review.
