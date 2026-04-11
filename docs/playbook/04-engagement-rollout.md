# 成瘾 + 热爱引擎落地计划

> 完整规范见 `docs/references/engagement-engine.md`。本文件聚焦**实施路线**和**任务分解**。

## 依赖关系总图

成瘾引擎不是独立模块——它是现有系统能力的**上层组合**。

```
                  成瘾引擎
                     │
    ┌────────────────┼────────────────┐
    │                │                │
  ┌─▼──┐      ┌─────▼─────┐    ┌─────▼─────┐
  │ KG  │      │  Memory   │    │   Skill   │
  │CRUD+│      │ L0/L1/L2  │    │ 系统 INV-6│
  │可视化│      │ +Episodic │    │ 注册+执行 │
  └─┬───┘      └─────┬─────┘    └─────┬─────┘
    │                │                │
    └────────────────┼────────────────┘
                     │
              ┌──────▼──────┐
              │   Context   │
              │   Engine    │
              └─────────────┘
```

## 实施分波

### 波次 1（P3 同步）: 行为钩子基座

这些功能依赖 P3 核心能力，应与 P3 同步实施：

| 任务 | 对应机制 | 依赖 | 新增服务/组件 |
|------|---------|------|-------------|
| TASK-ENG-01: 故事状态摘要 | 机制 1 · 即时满足 | KG 查询 + Memory L0 + documents | `storyStatusService.ts`（P3 TASK-P3-08） |
| TASK-ENG-02: 心流检测器 | 机制 8 · 心流渴求 | 编辑器事件 + write_sessions | `flowDetector.ts` |
| TASK-ENG-03: 伏笔追踪面板 | 机制 3 · 未完成焦虑 | KG foreshadowing 实体 | `foreshadowingTracker.ts` + 前端面板 |
| TASK-ENG-04: 快捷灵感捕捉 | 机制 11 · 损失厌恶 | 全局快捷键 + KG inspiration 实体 | `quickCaptureService.ts` + 悬浮入口 |

**TASK-ENG-02: 心流检测器**
- 文件：`services/engagement/flowDetector.ts`（新建）
- 输入：编辑器 keydown 事件流
- 输出：FlowState { isInFlow: boolean, duration: number, intensity: 'light' | 'deep' }
- 算法：过去 5 分钟持续打字（间隔 < 30s）且未切换窗口 → light flow；15 分钟 → deep flow
- 行为：deep flow 时隐藏所有非编辑器 UI（Zen Mode 自动触发）
- 退出 flow：检测到 > 60s 无输入 → 柔和恢复 UI（300ms 淡入）
- LLM：否
- INV：无特殊约束

**TASK-ENG-03: 伏笔追踪面板**
- 数据源：KG 中 type=foreshadowing, status=unresolved 的实体
- UI：右侧面板卡片列表（每条伏笔：标题 + 首次出现章节 + 开放天数）
- 排序：按 urgency（越久未回收越高）
- 交互：点击 → 跳转到首次出现位置；标记"已回收"→ KG 状态更新
- 黄金设计参考：`figma_design/前端完整参考/src/app/components/scenarios.tsx`

### 波次 2（P4 同步）: 情感钩子 + 身份钩子

| 任务 | 对应机制 | 依赖 | 新增服务/组件 |
|------|---------|------|-------------|
| TASK-ENG-05: 写作风格分析 | 机制 2 · 自恋满足 | Memory + KG + stats | `analyze-writing-style` Skill |
| TASK-ENG-06: 世界规模仪表板 | 机制 5 · 沉没成本 | KG 统计 | `worldScaleService.ts` + Dashboard 组件 |
| TASK-ENG-07: 里程碑系统 | 机制 5 · 沉没成本 | project_milestones 表 | `milestoneService.ts` + Toast 通知 |
| TASK-ENG-08: AI 人格注入 | 机制 13 · 拟人依恋 + 维度 4 | Memory L0 persona 模板 | System Prompt 模板 + Memory 注入规则 |
| TASK-ENG-09: KG 手动编辑确认仪式 | 机制 14 · 禀赋效应 | KG 编辑 UI | 确认对话框（"你确定移除这个角色？"摘要 + 影响预览） |
| TASK-ENG-10: 可变奖赏引擎 | 机制 4 · 可变奖赏 | KG 深层关系 | `spark-inspiration` Skill + `cascadeAnalyzer` |

### 波次 3（P4+ 后期）: 热爱维度

| 任务 | 对应维度 | 依赖 |
|------|---------|------|
| TASK-ENG-11: 动态氛围系统 | 维度 1 · 情绪空间感 | 纯前端（CSS 变量 + 音频） |
| TASK-ENG-12: 创世仪式 | 维度 2A · 仪式感 | 项目创建 IPC + Framer Motion |
| TASK-ENG-13: 完稿庆典 | 维度 2B · 仪式感 | `creation-report` Skill + KG 可视化 |
| TASK-ENG-14: 角色告别 | 维度 2C · 仪式感 | KG state + d3 过渡动画 + `characterEpitaph` 查询 |
| TASK-ENG-15: 年度创作回顾 | 维度 2D · 仪式感 | `annual-review` Skill + 卡片渲染 + 导出 |
| TASK-ENG-16: 中文排版优化 | 维度 3B · 手工感 | ProseMirror Schema + CSS |
| TASK-ENG-17: 大纲 → KG 预览 | 维度 5A · 未来可视化 | `outline-kg-preview` Skill |
| TASK-ENG-18: 完本预测 | 维度 5B · 未来可视化 | `completionEstimator` 统计服务 |
| TASK-ENG-19: 作品定位 | 维度 5C · 未来可视化 | `work-positioning` Skill |

### 波次 4（远期）: 社交 + 生态

| 任务 | 对应机制 |
|------|---------|
| TASK-ENG-20: KG 可分享 + Fork | 机制 6 · 社交认同 |
| TASK-ENG-21: 称号系统 | 机制 9 · 身份认同 |
| TASK-ENG-22: 视角切换 UI | 机制 10 · 窥视欲 |
| TASK-ENG-23: 叙事模式发现 | 机制 12 · 模式识别 |

## 全局约束

- 所有 LLM 分析注册为 INV-6 合规 Skill
- 所有 UI 通知融入 Dashboard / 边栏 / Toast（禁止弹窗打断写作）
- 查询类服务 ≤ 200ms（纯 SQLite + KG，禁止 LLM）
- 世界规模更新通过 INV-8 post-writing Hook 触发
- 分析 Skill 失败不影响写作（降级为静默跳过 + 错误事件记录 INV-10）
