# Project Management Specification Delta

## Change: project-management-p0-creation-metadata-dashboard

### Requirement: 项目创建 [MODIFIED]

P0 阶段必须先建立项目创建的数据模型与通道契约，支持手动创建与 AI 辅助创建，并在 AI 不可用时可靠降级。

项目创建数据模型（P0）：

- `id: string`
- `name: string`
- `type: "novel" | "screenplay" | "media"`
- `description: string`
- `stage: "outline" | "draft" | "revision" | "final"`
- `targetWordCount: number | null`
- `targetChapterCount: number | null`
- `narrativePerson: "first" | "third-limited" | "third-omniscient"`
- `languageStyle: string`
- `targetAudience: string`
- `defaultSkillSetId: string | null`（占位字段）
- `knowledgeGraphId: string | null`（占位字段）
- `createdAt: string`（ISO 8601）
- `updatedAt: string`（ISO 8601）

本 change 覆盖的 IPC 命名与 Zod schema：

| IPC 通道                   | 请求 schema（Zod）                   | 响应 schema（Zod）                    |
| -------------------------- | ------------------------------------ | ------------------------------------- |
| `project:project:create`           | `ProjectCreateRequestSchema`         | `ProjectCreateResponseSchema`         |
| `project:project:createaiassist` | `ProjectCreateAiAssistRequestSchema` | `ProjectCreateAiAssistResponseSchema` |
| `project:project:update`           | `ProjectUpdateRequestSchema`         | `ProjectUpdateResponseSchema`         |
| `project:project:list`             | `ProjectListRequestSchema`           | `ProjectListResponseSchema`           |
| `project:project:stats`            | `ProjectStatsRequestSchema`          | `ProjectStatsResponseSchema`          |

所有响应必须返回可判定结果：`{ ok: true, data }` 或 `{ ok: false, error: { code, message, traceId } }`。

AI 辅助创建在本阶段必须调用 `ai-service` mock 适配层，不接入真实 LLM 配额。

#### Scenario: 用户手动创建项目 [MODIFIED]

- **假设** 用户在 Dashboard 页面，当前项目总数小于 2,000
- **当** 用户通过创建对话框提交名称、类型与简介
- **则** 系统通过 `project:project:create` 创建项目与默认空白章节
- **并且** 主界面切换到新项目编辑器视图

#### Scenario: 用户通过 AI 辅助创建项目（Mock） [MODIFIED]

- **假设** 用户在创建对话框切换到 AI 辅助模式
- **当** 用户输入创作意图文本并触发 `project:project:createaiassist`
- **则** 系统调用 `ai-service` mock 返回可编辑草案（名称、类型、5 章大纲、3 个角色）
- **并且** 用户确认后系统创建项目及其初始结构

#### Scenario: AI 辅助创建失败时降级到手动创建 [MODIFIED]

- **假设** 用户触发 AI 辅助创建
- **当** mock 返回限流或超时错误
- **则** UI 显示「AI 辅助创建暂时不可用，请手动创建或稍后重试」
- **并且** 用户可无损切回手动模式继续创建

### Requirement: 项目元数据 [MODIFIED]

P0 阶段元数据编辑必须通过 `project:project:update` 持久化，并支持创作阶段切换。`knowledgeGraphId` 与 `defaultSkillSetId` 仅作为占位字段持久化，不触发 KG/Skill 实际联动。

#### Scenario: 用户编辑项目元数据并保留占位字段 [MODIFIED]

- **假设** 用户打开项目设置并编辑叙述人称、目标字数与受众
- **当** 提交 `project:project:update`
- **则** 系统持久化变更并返回结构化成功响应
- **并且** `knowledgeGraphId` 与 `defaultSkillSetId` 仅进行字段读写，不触发真实服务调用

#### Scenario: 用户切换创作阶段并同步展示 [MODIFIED]

- **假设** 项目当前阶段为 `draft`
- **当** 用户切换到 `revision`
- **则** 系统记录阶段变更并更新 Dashboard 标签
- **并且** 阶段值必须落在枚举 `outline|draft|revision|final`

### Requirement: Dashboard（项目仪表盘） [MODIFIED]

Dashboard 是应用启动后的默认页面。P0 阶段必须基于 `project:project:list` 与 `project:project:stats` 聚合展示项目卡片，并满足可搜索、可打开与空状态可创建。

Storybook 覆盖要求：

- 创建对话框：`manual`、`ai-assist`、`ai-generating`、`ai-preview`（4 态）
- Dashboard：`default-multi-project`、`search-filtered`、`empty`（3 态）

#### Scenario: 用户在 Dashboard 打开项目 [MODIFIED]

- **假设** Dashboard 卡片已加载
- **当** 用户点击项目卡片
- **则** 系统触发项目打开流程并进入编辑器布局
- **并且** 当前文档与项目上下文加载为所选项目

#### Scenario: Dashboard 空状态引导新用户创建项目 [MODIFIED]

- **假设** `project:project:list` 返回空集合
- **当** Dashboard 首次渲染
- **则** 显示空状态插图与「开始创建你的第一个创作项目」
- **并且** 提供 Primary 样式「新建项目」入口

#### Scenario: Dashboard 按名称搜索过滤 [MODIFIED]

- **假设** 账户下存在多个项目
- **当** 用户输入关键字进行搜索
- **则** 仅显示名称匹配的项目卡片
- **并且** 无匹配时显示「未找到匹配结果」

### Requirement: 模块级可验收标准（PM-1 适用子集） [MODIFIED]

PM-1 覆盖范围必须满足以下可验收阈值：

- `project:project:create` p95 < 500ms
- `project:project:update` p95 < 200ms
- Dashboard 首帧渲染 < 1.2s
- `project:project:*` IPC 请求/响应必须有 Zod 运行时校验与 TypeScript strict 编译约束

#### Scenario: 创建与元数据更新满足阈值基线 [MODIFIED]

- **假设** 执行 30 次 `project:project:create` 与 50 次 `project:project:update`
- **当** 统计耗时分位值
- **则** `project:project:create` p95 小于 500ms 且 `project:project:update` p95 小于 200ms
- **并且** 不出现未定义错误码

#### Scenario: IPC 输入非法时返回结构化错误 [MODIFIED]

- **假设** 渲染进程发送不符合 schema 的 `project:project:list` 请求
- **当** 主进程进行 Zod 校验
- **则** 返回 `{ ok: false, error: { code: "PROJECT_IPC_SCHEMA_INVALID", message, traceId } }`
- **并且** 失败写入主进程日志

### Requirement: 异常与边界覆盖矩阵（PM-1 相关） [MODIFIED]

PM-1 必须覆盖容量溢出与数据异常场景。

#### Scenario: 项目数量超过 2,000 时创建被阻断 [MODIFIED]

- **假设** 当前用户已有 2,000 个项目
- **当** 用户再次执行 `project:project:create`
- **则** 返回 `{ ok: false, error: { code: "PROJECT_CAPACITY_EXCEEDED", message: "项目数量已达上限", traceId } }`
- **并且** UI 引导用户归档或删除旧项目

#### Scenario: 元数据非法枚举值被拒绝 [MODIFIED]

- **假设** 客户端提交 `stage="publishing"` 或 `type="essay"`
- **当** 主进程执行 `project:project:update` 校验
- **则** 返回 `{ ok: false, error: { code: "PROJECT_METADATA_INVALID_ENUM", message, traceId } }`
- **并且** 数据库不写入非法值
