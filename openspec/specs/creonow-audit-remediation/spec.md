# CreoNow Audit Remediation 39 — OpenSpec

## 元信息

| 字段         | 值                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------- |
| 规范名称     | creonow-audit-remediation                                                                |
| 状态         | Draft                                                                                    |
| 更新日期     | 2026-02-06                                                                               |
| 审计输入     | Opus审计完整版.md                                                                        |
| 代码复核基线 | git@e1d65fb (main)                                                                       |
| 目标         | 将审计 #1-#39 重写为可执行、可核验、可追踪的 OpenSpec（spec + 6 design + 39 task cards） |

---

## Purpose

本规范用于把审计报告转化为可交付工程计划，并解决两个常见问题：

- 只罗列问题但无法直接派发执行。
- 报告与当前代码基线漂移，导致修复优先级失真。

本次重写遵循：

1. 一条审计问题对应一条 requirement（CNAUD-REQ-001..039）。
2. 一条 requirement 对应一张 task card（39 张，不合并）。
3. 每张卡强制包含 verification_status，避免把过期问题与当前问题混在一起。

---

## Scope

### In scope

- 39 条 requirement 的一对一重建。
- 6 份按主题拆分的设计文档：
  - AI Pipeline
  - Editor / Zen Mode
  - Data & Migration
  - Design System & Tokens
  - Testing & CI
  - Architecture Consistency Refactoring
- 39 张 task card，按 P0/P1/P2 分组。

### Out of scope

- 本规范不直接修改业务代码。
- 本规范不替代 GitHub Issue/PR 流程，只定义执行蓝图与验收口径。

---

## Conformance

1. 仓库治理：AGENTS.md
2. 产品规格：openspec/specs/creonow-spec/spec.md
3. 设计基线：design/Variant/DESIGN_SPEC.md + design/system/01-tokens.css
4. 本规范：openspec/specs/creonow-audit-remediation/spec.md
5. 本规范设计：openspec/specs/creonow-audit-remediation/design/\*.md
6. 本规范任务卡：openspec/specs/creonow-audit-remediation/task\*cards/\*\*/\_.md

---

## Verification Method

本规范中的 verification_status 来自“审计条目 + 代码复核”的交叉校验：

- verified：在当前代码中确认问题仍成立。
- stale：审计问题在当前代码中已不成立（或已完成门禁）。
- needs-recheck：问题方向成立，但计数/范围/边界需二次复核后再开工。

### 当前统计（39）

- verified: 32
- needs-recheck: 6
- stale: 1

### 优先级分布（纠偏后）

- P0: 7
- P1: 17
- P2: 15
- Total: 39

---

## Requirement Index

| #   | Requirement   | Priority | verification_status | Source                               |
| --- | ------------- | -------- | ------------------- | ------------------------------------ |
| 01  | CNAUD-REQ-001 | P0       | verified            | Opus审计完整版.md §2.1               |
| 02  | CNAUD-REQ-002 | P0       | verified            | Opus审计完整版.md §2.2               |
| 03  | CNAUD-REQ-003 | P0       | verified            | Opus审计完整版.md §2.3               |
| 04  | CNAUD-REQ-004 | P0       | verified            | Opus审计完整版.md §4.1               |
| 05  | CNAUD-REQ-005 | P0       | verified            | Opus审计完整版.md §3.6               |
| 06  | CNAUD-REQ-006 | P0       | needs-recheck       | Opus审计完整版.md §4.2 + §6.1        |
| 07  | CNAUD-REQ-007 | P0       | verified            | Opus审计完整版.md §5.2               |
| 08  | CNAUD-REQ-008 | P1       | verified            | Opus审计完整版.md §3.1               |
| 09  | CNAUD-REQ-009 | P1       | verified            | Opus审计完整版.md §3.2               |
| 10  | CNAUD-REQ-010 | P1       | verified            | Opus审计完整版.md §1.1               |
| 11  | CNAUD-REQ-011 | P1       | verified            | Opus审计完整版.md §1.2 + §1.3        |
| 12  | CNAUD-REQ-012 | P1       | needs-recheck       | Opus审计完整版.md §5.1               |
| 13  | CNAUD-REQ-013 | P1       | needs-recheck       | Opus审计完整版.md §5.3               |
| 14  | CNAUD-REQ-014 | P1       | needs-recheck       | Opus审计完整版.md §3.3 + §3.4 + §3.5 |
| 15  | CNAUD-REQ-015 | P1       | verified            | Opus审计完整版.md §7.2               |
| 16  | CNAUD-REQ-016 | P1       | verified            | Opus审计完整版.md §7.1               |
| 17  | CNAUD-REQ-017 | P1       | verified            | Opus审计完整版.md §2.6               |
| 18  | CNAUD-REQ-018 | P1       | verified            | Opus审计完整版.md §2.7               |
| 19  | CNAUD-REQ-019 | P1       | verified            | Opus审计完整版.md §2.4               |
| 20  | CNAUD-REQ-020 | P1       | stale               | Opus审计完整版.md §6.3               |
| 21  | CNAUD-REQ-021 | P1       | verified            | Opus审计完整版.md §6.2               |
| 22  | CNAUD-REQ-022 | P1       | verified            | Opus审计完整版.md §1.5               |
| 23  | CNAUD-REQ-023 | P1       | verified            | Opus审计完整版.md §2.5               |
| 24  | CNAUD-REQ-024 | P1       | verified            | Opus审计完整版.md §3.7               |
| 25  | CNAUD-REQ-025 | P2       | verified            | Opus审计完整版.md §1.4               |
| 26  | CNAUD-REQ-026 | P2       | verified            | Opus审计完整版.md §9.2               |
| 27  | CNAUD-REQ-027 | P2       | verified            | Opus审计完整版.md §9.3               |
| 28  | CNAUD-REQ-028 | P2       | verified            | Opus审计完整版.md §6.4               |
| 29  | CNAUD-REQ-029 | P2       | needs-recheck       | Opus审计完整版.md §6.5               |
| 30  | CNAUD-REQ-030 | P2       | verified            | Opus审计完整版.md §9.1               |
| 31  | CNAUD-REQ-031 | P2       | verified            | Opus审计完整版.md §5.6               |
| 32  | CNAUD-REQ-032 | P2       | needs-recheck       | Opus审计完整版.md §5.5               |
| 33  | CNAUD-REQ-033 | P2       | verified            | Opus审计完整版.md §7.3               |
| 34  | CNAUD-REQ-034 | P2       | verified            | Opus审计完整版.md §8.1               |
| 35  | CNAUD-REQ-035 | P2       | verified            | Opus审计完整版.md §4.3               |
| 36  | CNAUD-REQ-036 | P2       | verified            | Opus审计完整版.md §9.4               |
| 37  | CNAUD-REQ-037 | P2       | verified            | Opus审计完整版.md §2.8               |
| 38  | CNAUD-REQ-038 | P2       | verified            | Opus审计完整版.md §8.2 + §5.4        |
| 39  | CNAUD-REQ-039 | P2       | verified            | Opus审计完整版.md §3.8               |

---

## Requirements

每条 requirement 与审计问题编号 #1..#39 一一对应。

### CNAUD-REQ-001

- Audit issue: #1（AI model 参数硬编码为 fake）
- Priority: P0
- Source: Opus审计完整版.md §2.1
- Requirement: AI 请求模型必须从调用参数显式传入，禁止在 service 层硬编码固定模型值。
- verification_status: verified
- Design: openspec/specs/creonow-audit-remediation/design/01-ai-pipeline.md

### CNAUD-REQ-002

- Audit issue: #2（Anthropic max_tokens 硬编码 256）
- Priority: P0
- Source: Opus审计完整版.md §2.2
- Requirement: Anthropic 请求的 max_tokens 必须参数化并可审计配置，默认值需满足创作场景。
- verification_status: verified
- Design: openspec/specs/creonow-audit-remediation/design/01-ai-pipeline.md

### CNAUD-REQ-003

- Audit issue: #3（ModelPicker 与后端链路断线）
- Priority: P0
- Source: Opus审计完整版.md §2.3
- Requirement: 模型选择必须贯通 renderer store、IPC contract 与 main service 的同一调用链路。
- verification_status: verified
- Design: openspec/specs/creonow-audit-remediation/design/01-ai-pipeline.md

### CNAUD-REQ-004

- Audit issue: #4（migration version 可跳跃导致缺失）
- Priority: P0
- Source: Opus审计完整版.md §4.1
- Requirement: 迁移版本必须单调并可回放，禁止因可选扩展导致 schema_version 永久跨越未执行迁移。
- verification_status: verified
- Design: openspec/specs/creonow-audit-remediation/design/03-data-migration.md

### CNAUD-REQ-005

- Audit issue: #5（Zen Mode 不是可编辑链路）
- Priority: P0
- Source: Opus审计完整版.md §3.6
- Requirement: Zen Mode 必须提供真实编辑能力或与主编辑器共享同一 SSOT 编辑链。
- verification_status: verified
- Design: openspec/specs/creonow-audit-remediation/design/02-editor-zen-mode.md

### CNAUD-REQ-006

- Audit issue: #6（DB 降级策略与错误边界不一致）
- Priority: P0
- Source: Opus审计完整版.md §4.2 + §6.1
- Requirement: 数据库失败降级语义、错误呈现与恢复路径必须在 main 与 renderer 端一致可见。
- verification_status: needs-recheck
- Design: openspec/specs/creonow-audit-remediation/design/03-data-migration.md

### CNAUD-REQ-007

- Audit issue: #7（核心 --color-accent token 缺失）
- Priority: P0
- Source: Opus审计完整版.md §5.2
- Requirement: 设计系统必须定义并统一消费 --color-accent 及派生 token。
- verification_status: verified
- Design: openspec/specs/creonow-audit-remediation/design/04-design-system-tokens.md

### CNAUD-REQ-008

- Audit issue: #8（编辑器仅使用 StarterKit）
- Priority: P1
- Source: Opus审计完整版.md §3.1
- Requirement: 编辑器扩展能力必须达到最小可用基线（placeholder、统计、扩展入口）。
- verification_status: verified
- Design: openspec/specs/creonow-audit-remediation/design/02-editor-zen-mode.md

### CNAUD-REQ-009

- Audit issue: #9（编辑器排版未对齐设计 token）
- Priority: P1
- Source: Opus审计完整版.md §3.2
- Requirement: 编辑器字体、字号、行高必须由 design token 驱动并与规范一致。
- verification_status: verified
- Design: openspec/specs/creonow-audit-remediation/design/02-editor-zen-mode.md

### CNAUD-REQ-010

- Audit issue: #10（IpcInvoke 在多个 store 重复定义）
- Priority: P1
- Source: Opus审计完整版.md §1.1
- Requirement: IpcInvoke 类型必须单点定义并复用，禁止 store 本地重复声明。
- verification_status: verified
- Design: openspec/specs/creonow-audit-remediation/design/06-architecture-consistency.md

### CNAUD-REQ-011

- Audit issue: #11（ServiceResult/ipcError 重复实现）
- Priority: P1
- Source: Opus审计完整版.md §1.2 + §1.3
- Requirement: ServiceResult 与 ipcError 必须集中到 shared，main/renderer 不得分散重复实现。
- verification_status: verified
- Design: openspec/specs/creonow-audit-remediation/design/06-architecture-consistency.md

### CNAUD-REQ-012

- Audit issue: #12（Tailwind 颜色映射缺失）
- Priority: P1
- Source: Opus审计完整版.md §5.1
- Requirement: Tailwind 主题必须映射到 design token，禁止长期依赖 arbitrary color value。
- verification_status: needs-recheck
- Design: openspec/specs/creonow-audit-remediation/design/04-design-system-tokens.md

### CNAUD-REQ-013

- Audit issue: #13（业务 UI 存在大量硬编码颜色）
- Priority: P1
- Source: Opus审计完整版.md §5.3
- Requirement: 业务界面颜色必须优先使用语义 token，逐步清理硬编码色值。
- verification_status: needs-recheck
- Design: openspec/specs/creonow-audit-remediation/design/04-design-system-tokens.md

### CNAUD-REQ-014

- Audit issue: #14（Autosave 状态与时序风险）
- Priority: P1
- Source: Opus审计完整版.md §3.3 + §3.4 + §3.5
- Requirement: Autosave 必须具备可验证状态机与可靠 flush 语义，避免 cleanup fire-and-forget 和微任务时序依赖。
- verification_status: needs-recheck
- Design: openspec/specs/creonow-audit-remediation/design/02-editor-zen-mode.md

### CNAUD-REQ-015

- Audit issue: #15（editor/file bootstrap 协调缺口）
- Priority: P1
- Source: Opus审计完整版.md §7.2
- Requirement: 多 store bootstrap 责任必须收敛到单协调链路，避免重复分叉流程。
- verification_status: verified
- Design: openspec/specs/creonow-audit-remediation/design/06-architecture-consistency.md

### CNAUD-REQ-016

- Audit issue: #16（templateStore 违反架构契约）
- Priority: P1
- Source: Opus审计完整版.md §7.1
- Requirement: template 模块必须遵守显式依赖注入与 IPC/持久化契约，禁止裸 localStorage 双轨。
- verification_status: verified
- Design: openspec/specs/creonow-audit-remediation/design/06-architecture-consistency.md

### CNAUD-REQ-017

- Audit issue: #17（AI feedback 返回成功但未持久化）
- Priority: P1
- Source: Opus审计完整版.md §2.6
- Requirement: 反馈 recorded=true 时必须有可审计落库证据与失败语义。
- verification_status: verified
- Design: openspec/specs/creonow-audit-remediation/design/01-ai-pipeline.md

### CNAUD-REQ-018

- Audit issue: #18（AI stream 缺 renderer 客户端超时）
- Priority: P1
- Source: Opus审计完整版.md §2.7
- Requirement: renderer 必须具备 stream watchdog，防止 IPC 丢事件后永久 running。
- verification_status: verified
- Design: openspec/specs/creonow-audit-remediation/design/01-ai-pipeline.md

### CNAUD-REQ-019

- Audit issue: #19（ModePicker 仅装饰无语义分发）
- Priority: P1
- Source: Opus审计完整版.md §2.4
- Requirement: ModePicker 必须驱动真实 mode 语义，或显式下线避免误导。
- verification_status: verified
- Design: openspec/specs/creonow-audit-remediation/design/01-ai-pipeline.md

### CNAUD-REQ-020

- Audit issue: #20（CI 未运行 desktop vitest 门禁）
- Priority: P1
- Source: Opus审计完整版.md §6.3
- Requirement: CI 必须包含 renderer/store vitest 门禁并阻止失败合并。
- verification_status: stale
- Design: openspec/specs/creonow-audit-remediation/design/05-testing-ci.md

### CNAUD-REQ-021

- Audit issue: #21（Toast 组件存在但未全局接入）
- Priority: P1
- Source: Opus审计完整版.md §6.2
- Requirement: Toast Provider/Viewport 与统一触发路径必须在应用根层接入。
- verification_status: verified
- Design: openspec/specs/creonow-audit-remediation/design/05-testing-ci.md

### CNAUD-REQ-022

- Audit issue: #22（缺少 @shared 等路径别名）
- Priority: P1
- Source: Opus审计完整版.md §1.5
- Requirement: 必须建立跨包 alias，替换深层相对路径并统一 import 约束。
- verification_status: verified
- Design: openspec/specs/creonow-audit-remediation/design/06-architecture-consistency.md

### CNAUD-REQ-023

- Audit issue: #23（ChatHistory 使用 mock 历史）
- Priority: P1
- Source: Opus审计完整版.md §2.5
- Requirement: ChatHistory 必须接入真实数据源或明确 placeholder 状态。
- verification_status: verified
- Design: openspec/specs/creonow-audit-remediation/design/01-ai-pipeline.md

### CNAUD-REQ-024

- Audit issue: #24（Zen Mode 存在硬编码样式）
- Priority: P1
- Source: Opus审计完整版.md §3.7
- Requirement: Zen Mode 样式必须 token 化并避免组件内动态 style 拼装。
- verification_status: verified
- Design: openspec/specs/creonow-audit-remediation/design/02-editor-zen-mode.md

### CNAUD-REQ-025

- Audit issue: #25（packages/shared 利用率不足）
- Priority: P2
- Source: Opus审计完整版.md §1.4
- Requirement: shared 包必须承载跨进程复用类型与工具，避免 monorepo 空壳化。
- verification_status: verified
- Design: openspec/specs/creonow-audit-remediation/design/06-architecture-consistency.md

### CNAUD-REQ-026

- Audit issue: #26（AppShell 文件过大职责过多）
- Priority: P2
- Source: Opus审计完整版.md §9.2
- Requirement: AppShell 必须按路由、布局、命令、副作用拆分为可测试模块。
- verification_status: verified
- Design: openspec/specs/creonow-audit-remediation/design/06-architecture-consistency.md

### CNAUD-REQ-027

- Audit issue: #27（OutlinePanel 文件过大）
- Priority: P2
- Source: Opus审计完整版.md §9.3
- Requirement: OutlinePanel 必须按图标、列表项、搜索与容器职责拆分。
- verification_status: verified
- Design: openspec/specs/creonow-audit-remediation/design/06-architecture-consistency.md

### CNAUD-REQ-028

- Audit issue: #28（测试运行入口碎片化）
- Priority: P2
- Source: Opus审计完整版.md §6.4
- Requirement: 测试入口必须可组合且可维护，避免 root test:unit 的手工串联脚本膨胀。
- verification_status: verified
- Design: openspec/specs/creonow-audit-remediation/design/05-testing-ci.md

### CNAUD-REQ-029

- Audit issue: #29（features 测试覆盖分布不均）
- Priority: P2
- Source: Opus审计完整版.md §6.5
- Requirement: 测试覆盖应按风险分布，关键 feature 不得长期无测试。
- verification_status: needs-recheck
- Design: openspec/specs/creonow-audit-remediation/design/05-testing-ci.md

### CNAUD-REQ-030

- Audit issue: #30（生产代码散落 console 调用）
- Priority: P2
- Source: Opus审计完整版.md §9.1
- Requirement: 生产代码日志必须收敛到统一 logger/telemetry，禁止散落 console.\*。
- verification_status: verified
- Design: openspec/specs/creonow-audit-remediation/design/06-architecture-consistency.md

### CNAUD-REQ-031

- Audit issue: #31（token 存在双源漂移）
- Priority: P2
- Source: Opus审计完整版.md §5.6
- Requirement: token 来源必须单一 SSOT，避免 design 与 renderer 双源漂移。
- verification_status: verified
- Design: openspec/specs/creonow-audit-remediation/design/04-design-system-tokens.md

### CNAUD-REQ-032

- Audit issue: #32（accent token 命名重叠冗余）
- Priority: P2
- Source: Opus审计完整版.md §5.5
- Requirement: accent 系列 token 必须形成可维护命名层级，避免语义重复。
- verification_status: needs-recheck
- Design: openspec/specs/creonow-audit-remediation/design/04-design-system-tokens.md

### CNAUD-REQ-033

- Audit issue: #33（Provider 嵌套层级过深）
- Priority: P2
- Source: Opus审计完整版.md §7.3
- Requirement: Provider 组合需压缩并引入组合器模式，降低根组件复杂度。
- verification_status: verified
- Design: openspec/specs/creonow-audit-remediation/design/06-architecture-consistency.md

### CNAUD-REQ-034

- Audit issue: #34（registerIpcHandlers 扁平臃肿）
- Priority: P2
- Source: Opus审计完整版.md §8.1
- Requirement: IPC 注册入口需模块化分组，降低单函数复杂度与冲突面。
- verification_status: verified
- Design: openspec/specs/creonow-audit-remediation/design/06-architecture-consistency.md

### CNAUD-REQ-035

- Audit issue: #35（document_versions 缺修剪策略）
- Priority: P2
- Source: Opus审计完整版.md §4.3
- Requirement: 版本历史必须提供 retention/prune 策略与可配置参数。
- verification_status: verified
- Design: openspec/specs/creonow-audit-remediation/design/03-data-migration.md

### CNAUD-REQ-036

- Audit issue: #36（ExportDialog 使用 !important）
- Priority: P2
- Source: Opus审计完整版.md §9.4
- Requirement: UI 样式禁止依赖 !important 兜底，需回归 token 化样式层。
- verification_status: verified
- Design: openspec/specs/creonow-audit-remediation/design/04-design-system-tokens.md

### CNAUD-REQ-037

- Audit issue: #37（AiPanel 内嵌 style 标签）
- Priority: P2
- Source: Opus审计完整版.md §2.8
- Requirement: AiPanel 动画样式需迁移到样式层，禁止组件内嵌 style block。
- verification_status: verified
- Design: openspec/specs/creonow-audit-remediation/design/01-ai-pipeline.md

### CNAUD-REQ-038

- Audit issue: #38（SearchPanel mock 与假性能文案）
- Priority: P2
- Source: Opus审计完整版.md §8.2 + §5.4
- Requirement: SearchPanel 必须移除 mock fallback 与硬编码耗时文案，接入真实指标。
- verification_status: verified
- Design: openspec/specs/creonow-audit-remediation/design/01-ai-pipeline.md

### CNAUD-REQ-039

- Audit issue: #39（ZenModeOverlay memo 依赖导致内容过时）
- Priority: P2
- Source: Opus审计完整版.md §3.8
- Requirement: Zen 模式内容提取必须对编辑器内容变化保持新鲜性，不得仅依赖 editor 引用。
- verification_status: verified
- Design: openspec/specs/creonow-audit-remediation/design/02-editor-zen-mode.md

## Execution Waves

### Wave 1 — P0（先修“能用”）

- #1 #2 #3：AI 模型参数链路打通（model/max_tokens/model-picker）。
- #4：修复 migration version 跳跃与回放一致性。
- #5：Zen Mode 回到真实编辑链路。
- #6：DB 降级与错误呈现一致化。
- #7：补齐核心 accent token。

### Wave 2 — P1（补齐“好用”）

- Editor/Autosave：#8 #9 #14 #24。
- 复用与架构一致性：#10 #11 #15 #16 #22。
- AI 可信度：#17 #18 #19 #23。
- CI/UX 基础：#20 #21。
- 设计系统治理：#12 #13。

### Wave 3 — P2（工程质量收敛）

- 架构拆分：#25 #26 #27 #33 #34。
- 测试体系与覆盖：#28 #29。
- 样式与 token 收敛：#31 #32 #36 #37 #38。
- 运维与可观测：#30 #35 #39。
