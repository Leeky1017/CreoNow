# 提案：s2-type-convergence

## 背景

`docs/plans/unified-roadmap.md` 将 `s2-type-convergence` 定义为 Sprint 2 债务修复项（A1-H-002）。当前版本历史容器存在本地类型重复定义风险，导致同一语义对象可能出现多源类型漂移，增加维护与回归成本。

## 变更内容

- 统一 `VersionListItem` 的类型来源为单一导出源，移除容器侧重复定义。
- 明确版本历史容器必须通过导入复用契约类型，不允许本地重定义同名结构。
- 补齐类型收敛相关验证，确保 `tsc` 能覆盖该约束。

## 受影响模块

- Version Control（Renderer）— `apps/desktop/renderer/src/features/version-history/VersionHistoryContainer.tsx`
- Shared/Document Types — 单一来源类型导出路径（仅引用，不新增并行定义）

## 依赖关系

- 上游依赖：无（Sprint 2 债务组默认独立并行）。
- 横向协同：与其他 Version Control 迭代无强制串行依赖。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` 中 `s2-type-convergence` 条目；
  - `openspec/specs/version-control/spec.md` 的版本列表契约描述。
- 核对项：
  - `VersionListItem` 存在可定位单一来源；
  - 容器侧不再保留本地同名类型定义；
  - 变更仅为类型收敛，不改变版本历史交互行为。
- 结论：`NO_DRIFT`。

## 踩坑提醒（防复发）

- 避免在组件内临时复制类型；如需扩展字段，应先更新单一来源类型，再同步消费方。

## 防治标签

- `DUP` `ADDONLY`

## 不做什么

- 不改版本历史 UI、排序、过滤和交互逻辑。
- 不引入新的版本字段。
- 不修改主 spec 正文（仅起草 change 三件套）。

## 审阅状态

- Owner 审阅：`PENDING`
