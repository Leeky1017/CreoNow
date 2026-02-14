# 提案：s1-path-alias

## 背景

`docs/plans/unified-roadmap.md` 将 `s1-path-alias` 定义为 Sprint 1 的基础解锁项（A7-H-007 + A7-H-008）。
当前仓库存在大量 `../../../../../../packages/shared/...` 与 `../../../../../packages/shared/...` 深层相对路径引用；当目录层级调整或文件搬移时，容易触发批量编译失败，且在重构评审中引入高噪声改动。

## 变更内容

- 在 `tsconfig.base.json` 新增 `@shared/* -> packages/shared/*` 的 `paths` 映射，建立单一共享引用入口。
- 对齐 `apps/desktop/main/tsconfig.json`、`apps/desktop/renderer/tsconfig.json`、`apps/desktop/preload/tsconfig.json` 对 base 配置的继承与生效方式，避免子项目覆盖导致 alias 失效。
- 在 `apps/desktop/electron.vite.config.ts` 增加 `@shared` 的 `resolve.alias`，确保 main/renderer/preload 构建路径一致可解析。
- 对命中 `packages/shared` 的深层相对路径执行批量替换，统一为 `@shared/...`。
- 通过 `tsc --noEmit` 与全局检索验证替换结果，确保不残留深层相对路径写法。

## 受影响模块

- IPC（`packages/shared/**`）— 共享类型与契约导入路径统一。
- Main（`apps/desktop/main/**`）— 主进程对 shared 类型与工具的引用路径切换。
- Renderer（`apps/desktop/renderer/**`）— 渲染进程对 shared 契约引用切换。
- Preload（`apps/desktop/preload/**`）— 预加载桥接层对 shared 契约引用切换。
- Cross Module Integration — 跨层 import 规范从“深层相对路径可用”收敛为“`@shared/*` 为默认契约”。

## 依赖关系

- 上游依赖：无。`s1-path-alias` 在 Sprint 1 依赖图中为独立项，可并行执行。
- 下游协同：`s1-doc-service-extract`、`s1-ai-service-extract`、`s1-kg-service-extract` 建议在本 change 之后执行，以降低后续拆分过程中的路径噪声与冲突面。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md`（Sprint 1 `s1-path-alias` 条目与依赖图）
  - `openspec/specs/cross-module-integration-spec.md`（跨模块契约与统一约束语义）
- 核对项：
  - 变更范围仅限 path alias 建立与 import 批量替换，不引入业务语义变更。
  - alias 需同时覆盖 main/renderer/preload 三个运行面。
  - 验证口径包含“配置生效”与“深层相对路径替换完成”两类证据。
- 结论：`NO_DRIFT`（与 unified-roadmap 的 `s1-path-alias` 定义一致，可进入 TDD 规格化与实施）。

## 踩坑提醒（防复发）

- `electron.vite.config.ts` 可能包含 main/renderer/preload 三段配置，必须逐段确认 alias 已生效。
- 测试代码中的 `packages/shared` 深层相对路径也会影响一致性，批量替换时不要遗漏 `*.test.*`。
- 若子 tsconfig 存在局部 `paths`，需与 base 合并而不是覆盖。
- 替换脚本应限制匹配范围，避免误改非 import 字符串。

## 防治标签

- `DRIFT` `DUP` `NOISE`

## 不做什么

- 不改变任何业务行为、IPC 协议语义或运行时阈值。
- 不新增/删除 shared 导出项，仅调整引用路径。
- 不在本 change 内引入服务拆分、循环依赖治理或其他 Sprint 1 任务代码。

## 审阅状态

- Owner 审阅：`PENDING`
