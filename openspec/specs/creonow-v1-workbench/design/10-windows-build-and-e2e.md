# 10 - Windows Build & Playwright Electron E2E（门禁 / 环境变量 / 产物）

> 上游 Requirement：`CNWB-REQ-001`、`CNWB-REQ-120`  
> 目标：把 Windows-first 交付要求写成“可执行门禁”，并给出 E2E 环境与可观测证据标准。

---

## 1. Windows CI 门禁（必须）

### 1.1 必须的 CI Jobs（建议拆分）

- `ci:check`（ubuntu-latest）：install → typecheck → lint → unit
- `ci:windows-e2e`（windows-latest）：install → build → Playwright Electron E2E
- `ci:windows-build`（windows-latest）：build:win → upload artifacts（nsis + zip）

> 说明：本仓库当前 `CI` workflow 仅跑 ubuntu；V1 必须新增 windows job 并作为 required check。

### 1.2 失败产物（必须上传）

当 E2E 失败时，必须上传：

- `playwright-report/`
- `test-results/`（含 trace/screenshot）
- `logs/`（如存在）

---

## 2. Electron Builder（Windows 打包约束）

### 2.1 最小要求

- 产物：NSIS installer + zip（可选）
- `asar: true`
- `asarUnpack` 必须覆盖 native 依赖：
  - `**/*.node`
  - `**/*.dll`

### 2.2 Smoke（建议）

- 打包后启动 app（最小 smoke）
- 断言 main log 关键行存在（例如 `app_ready`）

---

## 3. Playwright Electron E2E（Windows-first）

### 3.1 启动方式（参考形态）

```ts
import { test, expect, _electron as electron } from "@playwright/test";

test("launch", async () => {
  const electronApp = await electron.launch({
    args: ["."],
    env: {
      ...process.env,
      CREONOW_E2E: "1",
      CREONOW_OPEN_DEVTOOLS: "0",
      CREONOW_USER_DATA_DIR: "<tmp>",
    },
  });
  const page = await electronApp.firstWindow();
  await expect(page.getByTestId("app-shell")).toBeVisible();
});
```

### 3.2 E2E 隔离（MUST）

- 每个 test case 必须使用独立 `CREONOW_USER_DATA_DIR`（mkdtemp）。
- 任何测试不得读写真实用户数据目录。

### 3.3 E2E ready 钩子（MUST）

当 `CREONOW_E2E=1` 时，renderer 必须暴露：

- `window.__CN_E2E__.ready = true` -（可选）`window.__CN_E2E__.getEditorContext()` 用于断言预取状态（参照 WN）

---

## 4. E2E 环境变量（V1 固定）

### 4.1 通用

- `CREONOW_E2E=1`：启用测试钩子（必需）
- `CREONOW_USER_DATA_DIR=<path>`：覆盖 `app.getPath('userData')`
- `CREONOW_OPEN_DEVTOOLS=0|1`：默认 0

### 4.2 AI（Fake-first）

- `CREONOW_AI_PROVIDER=anthropic|openai|proxy`
- `CREONOW_AI_BASE_URL=<fakeServerBaseUrl>`（E2E 必须可用）
- `CREONOW_AI_API_KEY=<empty or fixed>`（E2E 不依赖真实 key）
- `CREONOW_AI_TIMEOUT_MS=<ms>`（用于验证 timeout 分支）

### 4.3 Proxy（可选）

- `CREONOW_AI_PROXY_ENABLED=0|1`
- `CREONOW_AI_PROXY_BASE_URL=...`
- `CREONOW_AI_PROXY_API_KEY=...`（可选）

---

## 5. E2E 必须断言的证据点（最低标准）

每条 P0 E2E 用例至少断言以下其中 2 类证据：

- UI 证据：保存状态、面板可见、错误提示可见、`***REDACTED***` 可见
- DB 证据：`creonow.db` 存在且包含关键表（至少 `projects/documents/document_versions/settings`）
- 日志证据：`logs/main.log` 存在且包含关键行（例如 `app_ready`, `db_ready`, `ai_run_started`）

---

## Reference (WriteNow)

参考路径：

- `WriteNow/tests/e2e/app-launch.spec.ts`（userDataDir 覆盖 + DB 表断言 + log 断言）
- `WriteNow/tests/e2e/sprint-2.5-context-engineering-context-viewer.spec.ts`（E2E ready 钩子与 invoke 调用形态）
- `WriteNow/electron-builder.json`（windows packaging 经验）

从 WN 借鉴并迁移到 CN 的关键约束（摘要）：

- Windows E2E 必须作为门禁而不是“可选检查”；且失败必须产出可复现证据（trace + logs + DB）。
- `userDataDir` 隔离是 E2E 稳定性的前提（避免测试污染与 flake）。
