## 1. Implementation
- [ ] 1.1 Add builtin skill package `builtin:polish` and ensure build copies `main/skills` into `dist/main/skills`
- [ ] 1.2 Main: implement skill loader + strict validator + SSOT precedence (project > global > builtin)
- [ ] 1.3 Main: implement DB-backed enabled/valid/error_* state and migrations
- [ ] 1.4 Main: implement IPC `skill:list/read/write/toggle` and register handlers
- [ ] 1.5 Main: gate `ai:skill:run` on enabled/valid and inject skill prompt to provider requests
- [ ] 1.6 Renderer: add AI Panel skills popup (SkillPicker) and wire selection into `ai:skill:run`
- [ ] 1.7 Observability: log `skill_loaded/skill_invalid/skill_toggled` without leaking skill content

## 2. Testing
- [ ] 2.1 Unit: `apps/desktop/tests/unit/skillValidator.test.ts` (unknown `context_rules` key; YAML syntax error)
- [ ] 2.2 E2E (Windows): `apps/desktop/tests/e2e/skills.spec.ts` (skill:list returns enabled+valid; toggle disables run; command palette opens)
- [ ] 2.3 Verification: `pnpm contract:check && pnpm test:unit && pnpm -C apps/desktop typecheck && pnpm -C apps/desktop exec playwright test -c tests/e2e/playwright.config.ts tests/e2e/skills.spec.ts`

## 3. Documentation
- [ ] 3.1 RUN_LOG: `openspec/_ops/task_runs/ISSUE-38.md` append key runs + outputs (append-only)
