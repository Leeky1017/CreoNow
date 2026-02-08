## 1. Specification

- [x] 1.1 审阅 `openspec/specs/memory-system/spec.md` 与 MS-3 delta 约束
- [x] 1.2 完成 Dependency Sync Check（对齐 MS-2 的语义记忆 CRUD / 蒸馏进度 / 冲突输出）
- [x] 1.3 更新 proposal 审阅状态与交付目标

## 2. TDD Mapping

- [x] 2.1 建立 MS3-R1-S1~S5 场景到 renderer 测试映射
- [x] 2.2 建立 MS3-R2-S1~S2 与 MS3-X-S1~S2 到 integration 测试映射
- [x] 2.3 记录 Red 失败证据后再进入 Green

## 3. Red

- [x] 3.1 面板操作测试先失败（初始缺少 provider/行为冲突）
- [x] 3.2 溯源 IPC 测试先失败（缺少 `memory:trace:*` handlers）
- [x] 3.3 异常路径测试先失败（trace mismatch / cross-project denied）

## 4. Green

- [x] 4.1 实现 Memory Panel 交互闭环并对接 `memory:semantic:*`
- [x] 4.2 实现 `MemoryTraceService` 与 `memory:trace:get|feedback` IPC 链路
- [x] 4.3 生成并同步 IPC 契约类型，补齐 Storybook 4 态

## 5. Refactor

- [x] 5.1 修复测试定位歧义（空状态 CTA 与底部操作按钮同名）
- [x] 5.2 统一 renderer 测试 invoke mock 形态并修复 typecheck 约束
- [x] 5.3 补齐 trace 测试的 `MemoryTraceService` 接口完整性

## 6. Evidence

- [x] 6.1 `pnpm typecheck` / `pnpm lint` / `pnpm test:unit` / `pnpm test:integration` 全部通过
- [x] 6.2 `pnpm -C apps/desktop test:run` 全量通过（含新增 memory 场景）
- [x] 6.3 `pnpm -C apps/desktop storybook:build` 通过并产出 `storybook-static`
