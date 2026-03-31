# P1 变更清单

> P1 阶段（系统脊柱）所有 Spec 变更的文件级索引、模块依赖关系和实现优先级排序。

---

## 1. 文件级变更列表

### 修改（Spec 文件新增 P1 Section）

| 文件 | 变更类型 | 新增 Section 数 | 描述 |
|------|---------|----------------|------|
| `openspec/specs/skill-system/spec.md` | 修改 | 6 | WritingOrchestrator、Tool 注册表、Skill 三件套、Permission Gate、Post-Writing Hooks、任务状态机 |
| `openspec/specs/ai-service/spec.md` | 修改 | 3 | Streaming 主链路、LLM 路由（V1 简化版）、并发分区 |
| `openspec/specs/version-control/spec.md` | 修改 | 3 | 线性快照、三阶段提交、推迟项声明 |
| `openspec/specs/editor/spec.md` | 修改 | 4 | ProseMirror Schema、EditorView 集成、Markdown 输入规则、选区 → AI 管线 |
| `openspec/specs/context-engine/spec.md` | 修改 | 3 | 中文 Token 估算、容量警戒策略、V1 简化版层级与组装 |

### 新建（参考文档）

| 文件 | 描述 |
|------|------|
| `docs/references/cc-analysis/P1-ARCHITECTURE-DISTILL.md` | CC 源码模式 → CN 适配方案对照表 |
| `docs/references/cc-analysis/P1-CHANGES.md` | 本文档 |

### 未修改（P1 可直接使用）

| 文件 | 说明 |
|------|------|
| `openspec/specs/ipc/spec.md` | IPC 契约系统已就绪，P1 直接使用 |
| `openspec/specs/document-management/spec.md` | 文档管理基础已有，P1 可用 |
| `openspec/specs/cross-module-integration-spec.md` | 跨模块契约已有，需与编排层对齐但不需要大改 |

---

## 2. 模块依赖关系

```
                    ┌─────────────────────────────┐
                    │  context-engine              │
                    │  (中文 Token + 上下文组装)    │
                    └──────────┬──────────────────┘
                               │
                    ┌──────────▼──────────────────┐
                    │  ai-service                  │
                    │  (Streaming + LLM 路由)      │
                    └──────────┬──────────────────┘
                               │
┌──────────────┐    ┌──────────▼──────────────────┐    ┌──────────────────┐
│  editor      │───▶│  skill-system               │───▶│  version-control │
│  (ProseMirror│    │  (WritingOrchestrator +      │    │  (线性快照 +     │
│   + 选区)    │    │   Tool + Skill + Permission) │    │   三阶段提交)    │
└──────────────┘    └─────────────────────────────┘    └──────────────────┘
                               │
                    ┌──────────▼──────────────────┐
                    │  ipc（已有，直接使用）        │
                    └─────────────────────────────┘
```

### 依赖矩阵

| 模块 | 依赖 | 被依赖 |
|------|------|--------|
| context-engine | — | ai-service, skill-system |
| ai-service | context-engine | skill-system |
| skill-system | ai-service, context-engine, version-control, editor | — |
| version-control | — | skill-system |
| editor | — | skill-system |
| ipc | — | 所有模块 |

---

## 3. 实现优先级排序

### Phase 1A：基础设施层（可并行）

| 优先级 | 任务 | 模块 | 预估工作量 | 前置依赖 |
|--------|------|------|-----------|---------|
| 1A-1 | ProseMirror Schema + EditorView | editor | 3-4d | 无 |
| 1A-2 | 中文 Token 估算函数 | context-engine | 1d | 无 |
| 1A-3 | 线性快照数据层 | version-control | 2d | 无 |
| 1A-4 | Tool 注册表 + 3 个基础 Tool | skill-system | 2d | 无 |

### Phase 1B：核心管线（串行）

| 优先级 | 任务 | 模块 | 预估工作量 | 前置依赖 |
|--------|------|------|-----------|---------|
| 1B-1 | V1 上下文组装（Rules + Immediate） | context-engine | 2d | 1A-2 |
| 1B-2 | V1 Streaming 主链路 + 单 provider 路由 | ai-service | 3d | 1B-1 |
| 1B-3 | WritingOrchestrator + 任务状态机 | skill-system | 3-4d | 1A-4, 1B-2 |
| 1B-4 | Skill 三件套（续写/润色/改写） | skill-system | 2-3d | 1B-3 |

### Phase 1C：端到端集成（串行）

| 优先级 | 任务 | 模块 | 预估工作量 | 前置依赖 |
|--------|------|------|-----------|---------|
| 1C-1 | Permission Gate + 三阶段提交 | skill-system + version-control | 2-3d | 1B-4, 1A-3 |
| 1C-2 | 选区 → AI 管线（Editor → Orchestrator → Result） | editor + skill-system | 2d | 1C-1 |
| 1C-3 | Markdown 输入规则 | editor | 1-2d | 1A-1 |
| 1C-4 | Post-Writing Hooks（auto-save-version） | skill-system | 1d | 1C-1 |

### Phase 1D：验收闭环

| 优先级 | 任务 | 模块 | 预估工作量 | 前置依赖 |
|--------|------|------|-----------|---------|
| 1D-1 | E2E 流程验证：编辑 → 选中 → 润色 → diff → 确认 → 历史 → 回退 | 全模块 | 2-3d | 1C-* |
| 1D-2 | IPC 通道实施 | ipc | 2d | 1D-1 |

**总估算**：约 25-30 个工作日

---

## 4. P1 关键设计决策摘要

| 决策 | 选择 | 原因 |
|------|------|------|
| 编辑器核心 | ProseMirror（替换 TipTap） | Step/Transaction 细粒度控制，为 P2 Diff 预览奠基 |
| 版本管理 | 线性快照（无分支） | V1 最小复杂度，分支/合并推迟到 P3+ |
| LLM 路由 | 单 provider | V1 不做降级切换，接口预留 |
| 上下文层级 | 仅 Rules + Immediate | V1 无 KG/记忆/RAG，Retrieved/Settings 为空 |
| 并发控制 | 全串行 | V1 技能执行为单次 LLM 调用，无并发需求 |
| Tool-use | 不实现循环 | V1 走简单管线，P2 再加 Agentic Loop |
| Post-Hooks | 仅 auto-save-version | KG/记忆/质检 Hook 注册但不启用 |
| 内容格式 | ProseMirror State JSON | 与编辑器迁移对齐 |
| Token 估算 | CJK 1.5 tokens/char | 中文场景必须修正，CC 默认值不适用 |
| Permission | 四级分类 | 比 CC 多 `must-confirm-snapshot`，强调原稿保护 |

---

## 5. P1 推迟项汇总

以下功能在现有 Spec 中已定义，但 P1 阶段**不实现**：

| 功能 | 现有 Spec | 推迟到 | 原因 |
|------|----------|--------|------|
| 分支管理 | version-control | P3+ | 线性快照足够 V1 |
| 三方合并 | version-control | P3+ | 无分支则无合并 |
| 冲突解决 | version-control | P3+ | 无合并则无冲突 |
| 4 版本对比 | version-control / editor | P2 | 2 版本对比足够 V1 |
| Tool-use 循环 | ai-service | P2 | V1 直通式管线 |
| Agentic Loop | skill-system | P2 | V1 不做自主工具调用 |
| 多 provider 切换 | ai-service | P2 | V1 单 provider |
| 上下文压缩 | context-engine | P2 | V1 短对话不需压缩 |
| 费用追踪 | ai-service | P2 | V1 先跑通再算钱 |
| Retrieved/Settings 层 | context-engine | P2-P3 | V1 无 KG/记忆源 |
| 自定义技能 | skill-system | P3 | V1 仅内置三件套 |
| AI 辅助创建技能 | skill-system | P3 | 依赖自定义技能 |
| Judge 模块 | ai-service | P2 | V1 不做输出质量判定 |
| 多候选方案 | ai-service | P2 | V1 单次生成 |
| 大纲拖拽重排 | editor | P3 | V1 大纲只读 |
| 知识图谱 | knowledge-graph | P3 | V1 不做 |
| 记忆系统 | memory-system | P3 | V1 不做 |
