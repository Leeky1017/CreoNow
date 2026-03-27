# CreoNow 前端 SSOT（Single Source of Truth）

> **「一指既定，百工随之。」—— 此文件夹为 CreoNow 前端开发的唯一真源。**

## 文件夹结构

| 目录 | 定位 | 权威等级 |
|------|------|---------|
| `10-architecture/` | 工程图纸：分层模型、依赖规则、验收标准、目录结构 | **SSOT** |
| `20-design-v3/` | V3 融合设计规范：UI/交互/视觉最终标准 | **SSOT** |
| `30-reference-v1-v2/` | V1/V2 历史参考存档 | Reference only |
| `40-implementation-guides/` | 落地手册与脚本说明 | **SSOT** |
| `99-appendix/` | 审计数据与数字统计 | Reference |

## 新人导航

| 我想做什么？ | 应该看哪份文档？ |
|-------------|-----------------|
| 了解前端整体架构 | [10.1 分层模型](10-architecture/10.1-layer-model.md) |
| 实现一个新组件 | [10.2 组件架构](10-architecture/10.2-component-architecture.md) → [20.3 组件状态矩阵](20-design-v3/20.3-component-states.md) |
| 调整颜色/间距/动画 | [20.1 色彩系统](20-design-v3/20.1-color-system.md) → [20.5 间距系统](20-design-v3/20.5-spacing.md) → [20.4 动画系统](20-design-v3/20.4-animation.md) |
| 实现 AI 面板 | [20.2 组件规范 §AI 面板](20-design-v3/20.2-component-specs.md) → [10.3 IPC 通道](10-architecture/10.3-ipc-channels.md) |
| 添加 IPC 调用 | [10.3 IPC 通道](10-architecture/10.3-ipc-channels.md) |
| 添加 Store | [10.4 状态管理](10-architecture/10.4-state-management.md) |
| 查看 V1/V2 源码 | [30-reference-v1-v2/](30-reference-v1-v2/) |
| 了解构建路线 | [40.1 分阶段路线](40-implementation-guides/40.1-build-roadmap.md) |
| 了解前端量化指标 | [10.5 量化目标](10-architecture/10.5-quantitative-targets.md) |

## 权威与变更规则

- **SSOT 文档**：任何实现必须以此为准。如与源码不一致，以 SSOT 文档为准并修复源码。
- **Reference 文档**：仅供参考，不作为实现依据。如 V1/V2 结论与 V3 冲突，以 V3 为准。
- **变更流程**：修改 SSOT 文档需在 PR 中说明变更原因，并更新关联引用。

## 关联文档

- 源文件：[docs/CN-设计文稿.md](../CN-设计文稿.md)（V3 完整规范原件）
- 架构文件：[docs/前端决策.md](../前端决策.md)（前端架构完整原件）
- 视觉规范：[docs/references/frontend-visual-quality.md](../references/frontend-visual-quality.md)
- Agent 宪法：[AGENTS.md](../../AGENTS.md)
