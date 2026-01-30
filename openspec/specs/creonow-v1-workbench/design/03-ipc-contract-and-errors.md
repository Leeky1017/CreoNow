# 03 - IPC Contract & Errors（Envelope / 错误码 / Streaming / Codegen）

> 上游 Requirement：`CNWB-REQ-040`（IPC 边界）  
> 目标：把 IPC 从“约定俗成”升级为“可生成、可测试、可阻断漂移”的契约系统。

---

## 1. IPC Envelope（统一返回结构）

### 1.1 统一类型（MUST）

所有 `ipcRenderer.invoke` 返回值 MUST 使用如下 Envelope（示意类型）：

```ts
export type IpcResponse<TData> = IpcOk<TData> | IpcErr;

export type IpcOk<TData> = {
  ok: true;
  data: TData;
  meta?: IpcMeta;
};

export type IpcErr = {
  ok: false;
  error: IpcError;
  meta?: IpcMeta;
};

export type IpcMeta = {
  requestId: string;
  ts: number; // epoch ms
};

export type IpcError = {
  code: IpcErrorCode;
  message: string;
  details?: unknown; // JSON-serializable only
  retryable?: boolean;
};
```

### 1.2 禁止事项（硬禁）

- 禁止返回裸数组/字符串/boolean 作为协议（必须 Envelope）。
- 禁止通过 `throw` 让异常穿透到 renderer（必须映射到 `IpcErr`）。
- 禁止 silent failure：任何 `catch` 必须产出 `IpcErr` 或结构化日志（两者通常都需要）。

---

## 2. 错误码字典（CN V1 最小集合）

必须至少包含以下错误码（可扩展但不得随意改名/改语义）：

```ts
export type IpcErrorCode =
  | "INVALID_ARGUMENT"
  | "NOT_FOUND"
  | "ALREADY_EXISTS"
  | "CONFLICT"
  | "PERMISSION_DENIED"
  | "UNSUPPORTED"
  | "IO_ERROR"
  | "DB_ERROR"
  | "MODEL_NOT_READY"
  | "ENCODING_FAILED"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "CANCELED"
  | "UPSTREAM_ERROR"
  | "INTERNAL";
```

### 2.1 映射规则（MUST）

- 参数校验失败 → `INVALID_ARGUMENT`（`details` 至少包含 `fieldName` 或等价定位信息）
- sqlite/FTS5/sqlite-vec 异常 → `DB_ERROR`（不得回传原始堆栈）
- 文件读写/权限问题 → `IO_ERROR | PERMISSION_DENIED`
- 模型未下载/未加载/embedding 不可用 → `MODEL_NOT_READY`
- 用户取消 → `CANCELED`
- 超时 → `TIMEOUT`
- AI 上游返回错误（provider/proxy） → `UPSTREAM_ERROR`
- 其余未分类 → `INTERNAL`

### 2.2 `message/details` 安全约束（MUST）

- `message` 必须可读（用于 UI 展示）。
- `details` 必须是可序列化 JSON，且 MUST NOT 包含：
  - API key / token
  - 用户绝对路径（必须使用 project-relative 或 `userData` 相对路径）
  - 大段 prompt 明文（只允许 hash/长度）

---

## 3. Streaming 协议（AI 必需）

> 说明：invoke 用于“启动/取消/查询”；stream 用于 token/delta 事件。

### 3.1 事件通道（建议）

- `ai:skill:stream`：主进程向 renderer 推送 AI 运行事件。

### 3.2 事件结构（MUST）

```ts
export type AiStreamEvent =
  | { type: "run_started"; runId: string; ts: number }
  | { type: "delta"; runId: string; ts: number; delta: string }
  | { type: "run_completed"; runId: string; ts: number; usage?: unknown }
  | { type: "run_failed"; runId: string; ts: number; error: IpcError }
  | { type: "run_canceled"; runId: string; ts: number };
```

约束：

- 所有事件 MUST 包含 `runId`。
- 失败必须走 `run_failed`（带稳定错误码）；不得只打印 log。

---

## 4. Cancel / Timeout 语义（MUST）

- `ai:skill:cancel({ runId })`：
  - MUST 是幂等（重复 cancel 返回 ok）。
  - MUST 清理主进程侧的 pending 请求与资源（AbortController/timeout timer）。
- 超时：
  - MUST 在主进程统一实现（避免 renderer 与 main 口径不一致）。
  - 超时必须产生 `TIMEOUT` 错误码，并保证不会继续向 stream 推送 delta（避免 UI 卡死）。

---

## 5. Contract SSOT 与 types 生成（必须照搬语义，不照抄实现）

### 5.1 SSOT 原则（MUST）

- IPC 通道列表 + request/response 类型 MUST 由单一来源生成。
- renderer 与 main 共享同一份类型（通过生成文件）。
- 任何手改生成文件必须在 CI 中被阻断。

### 5.2 推荐落点（CN）

- SSOT：`apps/desktop/main/src/ipc/contract/ipc-contract.ts`（或 `.cjs`，但需一致）
- 生成输出：`packages/shared/types/ipc-generated.ts`（只读，带头部注释）
- 脚本：
  - `pnpm contract:generate`
  - `pnpm contract:check`（CI gate：生成后 `git diff --exit-code`）

### 5.3 Preload typed invoke（MUST）

- preload 仅暴露一个入口：
  - `window.creonow.invoke(channel, payload)`（typed）
- renderer 不得直接使用 `ipcRenderer.invoke`（避免绕开类型与错误处理约束）。

---

## 6. 测试与门禁（必须）

- Unit：错误映射（`INVALID_ARGUMENT/DB_ERROR/TIMEOUT/CANCELED/UPSTREAM_ERROR`）与 `details` 安全约束。
- E2E：在 renderer 使用 `window.creonow.invoke` 调用一个最小通道，并断言 `ok` 分支逻辑无异常。
- CI：必须运行 `pnpm contract:check` 并作为 required check 的一部分（见 task cards）。

---

## Reference (WriteNow)

参考路径：

- `WriteNow/openspec/specs/api-contract/spec.md`（契约规范、错误码字典、codegen gate）
- `WriteNow/electron/ipc/contract/ipc-contract.cjs`（契约 SSOT 与生成输入）
- `WriteNow/src/types/ipc-generated.ts`（生成输出的形态与头部声明）
- `WriteNow/electron/ipc/ai.cjs`（取消/超时与错误映射的实现语义）

从 WN 借鉴并迁移到 CN 的关键约束（摘要）：

- “契约 SSOT + 生成 + CI 校验”是避免 IPC 漂移的唯一可扩展做法。
- 主进程不得返回不稳定结构，也不得让异常穿透；一切必须映射到稳定错误码与可读 message。
