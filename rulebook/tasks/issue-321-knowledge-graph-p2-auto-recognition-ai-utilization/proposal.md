# Proposal: issue-321-knowledge-graph-p2-auto-recognition-ai-utilization

## Why

`knowledge-graph-p2-auto-recognition-ai-utilization` 仍停留在文档与失败测试阶段，缺少可执行的自动识别建议链路、KG 续写注入契约和并发/降级安全边界实现。为满足 KG3 场景验收，必须完成 IPC 契约、主进程接线、队列调度、错误码与测试闭环，并按 OpenSpec + Rulebook + GitHub 门禁完成交付。

## What Changes

- 落地 KG3 IPC 通道：识别 enqueue/cancel/stats、建议 accept/dismiss、`query:relevant`、`query:byids`、`rules:inject`。
- 新增并接线 `KgRecognitionRuntime`（并发上限 4、排队、取消、会话去重、推送建议）。
- 在 `file:document:save` autosave 成功路径异步触发识别（不阻塞保存返回）。
- 扩展 KG service：相关实体查询、跨项目阻断、Rules 注入 mock、失败降级。
- 更新 IPC contract + generated types + error code；补齐 KG3 单测/集测场景并纳入 `test:unit` / `test:integration`。
- 完成 change 任务勾选并归档 `knowledge-graph-p2-auto-recognition-ai-utilization`。

## Impact

- Affected specs:
  - `openspec/changes/archive/knowledge-graph-p2-auto-recognition-ai-utilization/**`
  - `openspec/changes/EXECUTION_ORDER.md`
- Affected code:
  - `apps/desktop/main/src/ipc/{knowledgeGraph.ts,file.ts,contract/ipc-contract.ts}`
  - `apps/desktop/main/src/services/kg/{kgService.ts,kgRecognitionRuntime.ts}`
  - `apps/desktop/main/src/index.ts`
  - `apps/desktop/tests/helpers/kg/harness.ts`
  - `apps/desktop/tests/{unit,integration}/kg/**`
  - `packages/shared/types/{ipc-generated.ts,kg.ts}`
  - `package.json`
- Breaking change: NO（仅新增 KG3 IPC 通道）
- User benefit:
  - autosave 后后台识别建议可用，且不阻塞编辑输入
  - 续写可注入相关 KG 设定并在异常时稳定降级
  - 跨项目访问被阻断，队列并发与取消行为可验证
