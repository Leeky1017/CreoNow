# CreoNow

AI-native creative writing IDE. Electron + TypeScript + SQLite.

## Quick Start

```bash
pnpm install
pnpm desktop:build
```

## Development

```bash
pnpm typecheck
pnpm contract:check
pnpm test:unit
pnpm test:integration
pytest -q scripts/tests
```

## Architecture

- `apps/desktop/main/` — Electron main process
  - `src/services/` — 13 service modules
  - `src/ipc/` — IPC handlers + contract
  - `src/db/migrations/` — SQLite migrations
- `apps/desktop/main/skills/` — builtin skills
- `packages/shared/` — shared types + utilities
