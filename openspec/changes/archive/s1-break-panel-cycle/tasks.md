## 1. Specification

- [x] 1.1 审阅 `docs/plans/unified-roadmap.md` 中 `s1-break-panel-cycle（A5-H-001）` 的范围、边界与防治标签
- [x] 1.2 审阅 `RightPanel.tsx` / `AiPanel.tsx` 当前依赖链，确认循环依赖触发路径与现有消费方
- [x] 1.3 审阅并固化 `openspec/changes/s1-break-panel-cycle/specs/workbench-delta.md`，确保 Requirement 与 Scenario 可测试化
- [x] 1.4 完成 依赖同步检查（Dependency Sync Check），记录输入、核对项与结论（无漂移/已更新）
- [x] 1.5 固化兼容策略：`RightPanel` 临时 re-export `useOpenSettings` 的保留窗口与退出条件

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 每个 Scenario 映射为至少一个失败测试（含结构校验与行为校验）
- [x] 2.2 为测试用例标注 Scenario ID（S1-BPC-1/2/3），建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现
- [x] 2.4 补充架构门禁：使用 `madge --circular` 验证 RightPanel 入口循环依赖已消除

### Scenario → 测试映射

| Scenario ID | 测试文件                                                                  | 测试用例名                                                                     | 断言要点                                                         |
| ----------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| S1-BPC-1    | `apps/desktop/renderer/src/contexts/OpenSettingsContext.test.tsx`         | `OpenSettingsContext exports provider and useOpenSettings with no-op fallback` | 新 context 模块可独立导出；无 Provider 时 hook 返回 no-op        |
| S1-BPC-2    | `apps/desktop/renderer/src/features/ai/AiPanel.imports.test.ts`           | `AiPanel imports useOpenSettings from contexts/OpenSettingsContext`            | `AiPanel.tsx` 不再从 `RightPanel` 引入 `useOpenSettings`         |
| S1-BPC-3    | `apps/desktop/renderer/src/components/layout/OpenSettingsCompat.test.tsx` | `RightPanel re-export keeps legacy useOpenSettings consumers working`          | 旧消费路径 `components/layout/RightPanel` 仍可导入并获得兼容行为 |

## 3. Red（先写失败测试）

- [x] 3.1 新增 S1-BPC-1 失败测试：当前缺少 `contexts/OpenSettingsContext.ts` 时应先失败
- [x] 3.2 新增 S1-BPC-2 失败测试：静态校验 `AiPanel.tsx` import 源，当前应因仍指向 `RightPanel` 而失败
- [x] 3.3 新增 S1-BPC-3 失败测试：在迁移期间要求 `RightPanel` 兼容导出稳定，先写测试锁定契约
- [x] 3.4 运行 `npx madge --circular apps/desktop/renderer/src/components/layout/RightPanel.tsx`，记录当前有环的 Red 证据

## 4. Green（最小实现通过）

- [x] 4.1 创建 `apps/desktop/renderer/src/contexts/OpenSettingsContext.ts`，迁移 `OpenSettingsContext` 与 `useOpenSettings`
- [x] 4.2 修改 `RightPanel.tsx`：移除本地定义，改为从 context 模块引入，并保留 `export { useOpenSettings }` 兼容导出
- [x] 4.3 修改 `AiPanel.tsx`：将 `useOpenSettings` import 改为 `../../contexts/OpenSettingsContext`
- [x] 4.4 搜索并处理消费方：`rg -n "from .*RightPanel.*useOpenSettings" apps/desktop/renderer/src`，确保仅保留明确兼容场景
- [x] 4.5 复跑映射测试与 `madge` 检查，确认 Red 全转 Green

## 5. Refactor（保持绿灯）

- [x] 5.1 去除 `RightPanel.tsx` 中冗余 context 残留，确保“提取即删除”，不保留双实现
- [x] 5.2 整理 import 分组与导出顺序，保持 renderer 目录依赖方向单向清晰
- [x] 5.3 复跑 `RightPanel.test.tsx`、`AiPanel.test.tsx` 及关键 AI 面板回归用例，确认兼容行为未回退

## 6. Evidence

- [x] 6.1 在 RUN_LOG 记录 Red/Green 命令、关键输出与结论（含 madge 前后对比）
- [x] 6.2 记录 依赖同步检查（Dependency Sync Check） 的输入、核对结论与后续动作（无漂移/已更新）
- [x] 6.3 记录兼容导出决策（保留范围、计划移除条件）与影响评估
