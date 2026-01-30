# CreoNow — Agent Instructions

本仓库目标：构建一个 AI 驱动的文字创作 IDE（创作者的 Cursor）。

## 规范导航

1. 项目规范：`openspec/specs/creonow-spec/spec.md`
2. 设计规范：`design/Variant/DESIGN_SPEC.md`
3. 任务运行日志：`openspec/_ops/task_runs/ISSUE-N.md`
4. 本文件（治理规范）：`AGENTS.md`

## 交付流程

本项目采用 **openspec-rulebook-github-delivery** 体系。

关键要点：
- GitHub 是并发与交付唯一入口：Issue → Branch → PR → Checks → Auto-merge
- Issue 号 `N` 是任务唯一 ID
- 分支名：`task/<N>-<slug>`
- Commit message 必须包含 `(#N)`
- PR body 必须包含 `Closes #N`
- 必须使用 worktree 隔离开发

详细流程见 Skill：`openspec-rulebook-github-delivery/SKILL.md`

## 宪法级约束（必须遵守）

### 代码质量

- 代码必须同时"正确"和"好"
- 正确：功能符合需求；边界处理完备；失败路径可观测且可恢复
- 好：可读性强、可维护、可测试、风格一致
- 禁止 `any` 类型；类型必须完备（TS 严格模式下可编译）
- 注释只解释 why（原因/约束/不变量），不写 what（实现细节复述）

### 一致性

- 全项目必须始终保持统一（命名、结构、错误处理、状态管理）
- 必须遵循已定义的契约规范

### 测试

- 所有功能必须有测试
- 每个关键节点必须做极限/边界测试
- 禁止"假装测试"：未运行就宣称通过；未断言就宣称覆盖

## 代码原则（必须遵守）

- 拒绝隐式注入：所有依赖必须显式传入
- 一条链路一套实现：禁止"向后兼容/双栈并存"
- 不写非必要代码：禁止过度抽象；先跑通最短链路再扩展
- 显式注释：新增/修改的函数必须有 JSDoc

## 技术选型约束

以下技术已锁定，禁止替换：

| 技术 | 用途 |
|-----|------|
| React 18 | 前端框架 |
| TypeScript | 类型系统 |
| Vite | 构建工具 |
| Tailwind CSS 4 | 样式 |
| Radix UI | 组件原语 |
| TipTap 2 | 富文本编辑器 |
| Zustand | 状态管理 |
| Electron | 桌面框架 |
| SQLite | 本地数据库 |

如需变更技术选型，必须先提交 RFC 并获得批准。

## 设计规范

- 设计基准：`design/Variant/DESIGN_SPEC.md`
- 所有 UI 实现必须严格遵循设计规范，禁止偏移
- 颜色、间距、字体必须使用 Design Token

## 异常与防御性编程（必须遵守）

- IPC 边界必须返回可判定结果（`ok: true|false`）
- 禁止 silent failure：任何 `catch` 必须显式处理
- 超时/取消必须有明确状态

## 工作留痕

- 每个 Issue 必须创建 `openspec/_ops/task_runs/ISSUE-N.md`
- RUN_LOG 必含：Issue、Branch、PR、Plan、Runs
- Runs 章节只追加不回写

## 禁止事项（硬禁）

- 禁止兼容旧方案/保留两套实现
- 禁止假数据测试
- 禁止不做验证就说"已完成"
- 禁止 silent failure
