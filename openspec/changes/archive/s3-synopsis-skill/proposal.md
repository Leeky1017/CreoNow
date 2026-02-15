# 提案：s3-synopsis-skill

## 背景

`docs/plans/unified-roadmap.md` 的 Sprint 3（AR-C24）要求新增内置 `synopsis` 技能，生成 200-300 字章节摘要，为后续摘要注入提供稳定输入。当前内置技能清单中尚无该能力，续写阶段缺少可复用摘要资产。

## 变更内容

- 新增内置技能定义 `synopsis`，明确输入、输出与约束。
- 约束摘要输出为 200-300 字、单段可读文本，避免模板噪音输出。
- 为 skill loader 增加该技能的加载与 schema 校验场景。

## 受影响模块

- Skill System（Main）— 内置技能定义与加载校验。
- AI Service（Main）— `synopsis` 执行链路的技能入口。
- Skills Package（Main）— 新增 `builtin/synopsis/SKILL.md` 资产。

## 依赖关系

- 上游依赖：无。
- 下游依赖：`s3-synopsis-injection`（依赖 `synopsis` 技能产出）。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` 中 `s3-synopsis-skill（AR-C24）` 条目；
  - `openspec/specs/skill-system/spec.md` 中内置技能加载与执行契约。
- 核对项：
  - 新增技能遵循现有内置技能目录规范；
  - 输出约束不会破坏既有 `SkillResult` 契约。
- 结论：`N/A（无上游依赖）`。

## 踩坑提醒（防复发）

- 不要在 `SKILL.md` 混入调试说明、TODO 模板等噪音文本。
- 不要偏离既有内置技能命名和目录约定，避免 loader 漂移。
- 摘要长度约束应可测试，不可仅凭 prompt 描述“期望如此”。

## 代码问题审计重点

- [ ] 测试同时覆盖加载成功、schema 不合法、输出长度越界三类场景，避免“只测能加载”（`docs/代码问题/虚假测试覆盖率.md`）。
- [ ] 审计 `synopsis` 的命名、目录与元数据字段是否与现有 builtin 技能一致（`docs/代码问题/风格漂移与项目约定偏离.md`）。
- [ ] 审计 `SKILL.md` 文案信噪比，删除无执行价值的注释/模板化段落（`docs/代码问题/注释泛滥与噪音代码.md`）。

## 防治标签

- `FAKETEST` `DRIFT` `NOISE`

## 不做什么

- 不在本 change 实现摘要入库与上下文注入（属于 `s3-synopsis-injection`）。
- 不扩展新的技能调度器并发策略，仅新增一个内置技能定义。
- 不改动 Renderer 端技能面板交互。

## 审阅状态

- Owner 审阅：`PENDING`
