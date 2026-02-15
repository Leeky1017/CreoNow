# Skill System Specification Delta

## Change: s3-synopsis-skill

### Requirement: 系统必须提供内置 `synopsis` 技能并约束摘要输出质量 [ADDED]

Skill System 必须新增内置技能 `synopsis`，用于生成章节摘要。该技能必须可被 skill loader 识别并执行，输出必须满足 200-300 字的单段摘要约束。

#### Scenario: S3-SYN-SKILL-S1 skill loader 加载 `synopsis` 内置技能 [ADDED]

- **假设** 应用启动并加载内置技能目录
- **当** loader 扫描到 `builtin/synopsis/SKILL.md`
- **则** 系统必须注册 `synopsis` 技能并标记作用域为 `builtin`
- **并且** 技能可在执行入口被正常解析与调用

#### Scenario: S3-SYN-SKILL-S2 `synopsis` 输出遵守 200-300 字单段摘要约束 [ADDED]

- **假设** 用户输入一章完整文本并触发 `synopsis` 技能
- **当** 技能执行完成
- **则** 输出必须为 200-300 字范围内的摘要文本
- **并且** 输出为单段正文，不包含模板化注释、列表或调试噪音

#### Scenario: S3-SYN-SKILL-S3 无效 `synopsis` 定义在加载阶段失败并报错 [ADDED]

- **假设** `SKILL.md` 缺失必填元数据或字段格式不合法
- **当** loader 解析该定义
- **则** 系统必须返回结构化加载错误并拒绝注册该技能
- **并且** 其他技能加载流程保持可用

## Out of Scope

- 摘要持久化与续写注入链路（由 `s3-synopsis-injection` 负责）
- Skill 调度器并发/超时策略改造
- 编辑器或面板层的技能入口 UI 改造
