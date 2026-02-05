# Design 10 — Code Quality（console 收敛 + UI strings 常量化）

> Spec: `../spec.md#cnmvp-req-011`
>
> Related cards:
> - `../task_cards/p2/P2-004-console-cleanup-and-logger.md`
> - `../task_cards/p2/P2-005-ui-strings-constants.md`

## 1) console.* 收敛策略（写死）

目标：生产代码中禁止散落 `console.log/warn/error`，统一到可替换的日志路径，且不引入隐式依赖。

MVP 写死策略（P2）：

1. 新增 `apps/desktop/renderer/src/lib/logger.ts`：
   - `type RendererLogger = { info(event, data?), warn(event, data?), error(event, data?) }`
   - 默认实现：写到 `console.*`（临时），但所有调用点统一使用该 logger（便于后续替换为 IPC 上报）
2. 后续演进（不在本 spec P2 必做）：新增 IPC `app:log` 把 renderer logs 写入 main.log

> 为什么分两步：直接加 IPC 会触碰 `ipc-contract.ts`（高冲突），先收口调用点更稳。

## 2) UI strings 常量化（写死）

目标：停止继续扩散硬编码字符串，并为 i18n 预留结构，但不引入完整 i18n（避免范围爆炸）。

写死策略：

- 新增 `apps/desktop/renderer/src/lib/uiStrings.ts` 导出分域常量（例如 `DIALOG_LABELS`, `BUTTON_LABELS`）
- 仅替换“高频/重复/易错”的字符串（优先：SystemDialog/rename dialogs/错误文案）
- 不做全量替换（全量属于 P3+）

