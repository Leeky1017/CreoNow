# ISSUE-110

- Issue: #110
- Branch: task/110-diffview-multi-version-compare
- PR: <fill-after-created>

## Plan

- Add multi-version compare (2–4 versions) with optional sync scrolling.
- Polish DiffView header/footer for consistent sizing and reduced redundancy.
- Add tests + Storybook verification and deliver via PR with auto-merge.

## Runs

### 2026-02-02 setup

- Command: `rulebook task create issue-110-diffview-multi-version-compare && rulebook task validate issue-110-diffview-multi-version-compare`
- Key output: `Task ... is valid`
- Evidence: `rulebook/tasks/issue-110-diffview-multi-version-compare/`

### 2026-02-02 local checks

- Command: `pnpm install`
- Key output: `Done in ...`
- Evidence: Local terminal output

### 2026-02-02 local checks (type/lint)

- Command: `pnpm typecheck && pnpm lint`
- Key output: `tsc --noEmit` / `eslint . --ext .ts,.tsx`
- Evidence: Local terminal output

### 2026-02-02 unit test (targeted)

- Command: `pnpm -C apps/desktop test:run renderer/src/features/ai/MultiVersionCompare.test.tsx`
- Key output: `1 passed (1) / 4 passed (4)`
- Evidence: Local terminal output

### 2026-02-02 storybook visual check

- Command: `pnpm -C apps/desktop storybook`
- Key output: `http://172.18.248.30:6006/?path=/story/features-diffview--multi-version-4`
- Evidence: Visual verification in Storybook (DiffView → Multi Version 4)
