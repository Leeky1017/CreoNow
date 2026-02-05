# Design 09 — Parallel Execution & Conflict Matrix（并行/冲突/分阶段建议）

> Spec: `../spec.md#cnfa-req-002`
>
> 审计指出：14 个 P0 虽有依赖图，但“同时修改同一组件”的冲突风险未分析。本文件补齐这一块，避免并行开发互相踩踏。

## 1) 高冲突文件（优先定义 owner 与先后顺序）

这些文件被多个 P0 同时触碰，必须 **串行** 或 **先定义模式再并行**：

- `apps/desktop/renderer/src/components/layout/AppShell.tsx`
- `apps/desktop/renderer/src/components/layout/Sidebar.tsx`
- `apps/desktop/renderer/src/components/layout/RightPanel.tsx`
- `apps/desktop/renderer/src/features/commandPalette/CommandPalette.tsx`
- `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
- `packages/shared/types/ipc-generated.ts`（codegen 输出，极易冲突）

建议原则（MUST for execution）：

- **IPC contract + codegen**：同一时间只能有 1 个 PR 改动（否则必冲突）。
- **AppShell/CommandPalette**：先完成“入口/快捷键/Surface open 机制”的基础 PR（P0-001/P0-002），再让其他任务基于该机制扩展。

---

## 2) 文件触碰矩阵（P0 × Touchpoints）

> 读法：`X` 表示该 P0 任务预计会修改该文件或同域代码。用于提前发现并行冲突。

| P0 | AppShell | Sidebar | RightPanel | IconBar | CommandPalette | AiPanel | Dashboard | ExportDialog | SettingsDialog | IPC contract + codegen |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P0-001 registry | X |  |  |  |  |  |  |  |  |  |
| P0-002 command | X |  |  |  | X |  |  |  |  |  |
| P0-003 settings | X | X |  | X | X |  |  |  | X |  |
| P0-004 export |  |  |  |  | X |  |  | X |  |  |
| P0-005 dashboard | X |  |  |  |  |  | X |  |  | X |
| P0-006 outline |  | X |  |  |  |  |  |  |  |  |
| P0-007 version | X | X |  |  |  |  |  |  |  | X |
| P0-008 characters |  | X |  |  |  |  |  |  |  |  |
| P0-009 kg viz |  | X |  |  |  |  |  |  |  |  |
| P0-010 rightpanel |  |  | X |  |  |  |  |  |  |  |
| P0-011 zen | X |  |  |  |  |  |  |  |  |  |
| P0-012 dialogs | X | X |  |  |  | X | X |  |  |  |
| P0-013 AI surface |  |  |  |  |  | X |  |  |  |  |
| P0-014 storybook gate |  |  |  |  |  |  |  |  |  |  |

冲突提示（重点）：

- `AppShell.tsx`：P0-002/P0-003/P0-005/P0-007/P0-011/P0-012 都可能改 → 必须排队或拆成小 PR。
- `Sidebar.tsx`：P0-003/P0-006/P0-007/P0-008/P0-009/P0-012 都可能改 → 建议以 “panel container” 模式拆分，减少同时改同一文件。
- `ipc-contract.ts + ipc-generated.ts`：P0-005 与 P0-007 都要新增通道 → 必须串行；推荐先做其中一个，再做另一个。

---

## 3) 冲突解决策略（执行约束）

### 3.1 AppShell/Sidebar 的“最小交叉”策略（SHOULD）

- 把“业务逻辑”下沉到各 feature 的 container（例如 `OutlinePanelContainer`、`CharacterPanelContainer`）。
- `Sidebar.tsx` 只做 panel 切换与布局壳，不直接持有业务状态。

好处：并行任务大多新增/修改 container 文件，而不是都改 Sidebar。

### 3.2 IPC contract 的串行策略（MUST）

- 每次只允许一个 PR 修改 `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
- 该 PR 必须同时更新 `packages/shared/types/ipc-generated.ts`
- 其他 PR 在它合并前禁止改同一处（否则会造成长时间 rebase/冲突）

---

## 4) 分阶段交付建议（减少返工）

> 这是建议，不是强制依赖图；目标是降低“先做的被后做的推翻”的返工概率。

### Phase 1（护栏 + 入口基线）

- P0-001 Surface registry / 零孤儿门禁
- P0-014 Storybook WSL-IP QA gate（证据格式固化）
- P0-002 CommandPalette + Shortcuts（先把快捷键/入口规则立住）

### Phase 2（单链路收敛：Settings/Export/Confirm）

- P0-012 SystemDialog/Confirm 统一（尽早消除 `window.confirm`，减少后续反复替换）
- P0-003 SettingsDialog 单一路径（吸收 SettingsPanel）
- P0-004 ExportDialog 组装（入口统一）

### Phase 3（关键业务闭环）

- P0-005 Dashboard 项目操作闭环（含新增 project IPC）
- P0-007 Version history compare/restore（含新增 version IPC）

> 注意：Phase 3 两个任务都要改 IPC contract，必须串行。

### Phase 4（面板真接电 + 体验补齐）

- P0-006 Outline 派生 + 导航
- P0-010 RightPanel Info/Quality 接电
- P0-011 ZenMode overlay
- P0-013 AI surface（History/New Chat/Skill settings）补齐
- P0-008 Characters via KG
- P0-009 KG visualization

---

## 5) PR 粒度建议（通用）

- 任何涉及 `ipc-contract.ts` 的 PR：
  - 范围必须小（只做一个 domain 的新增通道）
  - 必须带 E2E 覆盖该通道的一个最小闭环
- UI 组装 PR：
  - 优先拆成 “入口接入” 与 “行为闭环” 两步，避免一次 PR 过大
- Storybook 证据：
  - PR 越大，抽查 stories 越多（至少覆盖所有受影响 stories）
