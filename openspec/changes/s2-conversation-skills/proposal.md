# 提案：s2-conversation-skills

## 背景

`docs/plans/unified-roadmap.md` 在 Sprint 2 Phase 3 定义 `s2-conversation-skills`（AR-C15）：补齐 3 个对话类技能文档（brainstorm/roleplay/critique）。当前对话技能若缺失标准化文档，后续面板技能分类与调用行为会出现定义漂移，且难以稳定覆盖测试。

## 变更内容

- 新增并规范 3 个对话类内置技能 `SKILL.md`，统一文档骨架与约束表达。
- 对 skill loader 的测试映射补齐对话技能覆盖，验证可发现性与文档有效性。
- 对齐对话技能命名、描述与作用边界，避免与写作技能职责重叠。

## 受影响模块

- Skill System（`apps/desktop/main/skills/builtin/{brainstorm,roleplay,critique}/SKILL.md`）— 对话技能定义。
- Skill System（`apps/desktop/main/src/services/skills/**`）— 对话技能加载与校验测试映射。

## 依赖关系

- 上游依赖：无（`s2-conversation-skills` 在 Sprint 2 Wave W2 可独立推进）。
- 横向协同：与 `s2-writing-skills` 并行，不要求串行。
- 下游依赖：为后续 Slash/对话入口功能提供稳定的对话技能基础清单。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` 中 `s2-conversation-skills`（AR-C15）定义；
  - `openspec/specs/skill-system/spec.md` 中技能作用域与加载规则。
- 核对项：
  - 范围限定为对话技能文档与加载校验，不扩展到执行器逻辑；
  - 对话技能命名与职责边界不覆盖写作技能职责；
  - 测试覆盖需能识别缺失或格式错误文档。
- 结论：`NO_DRIFT`（与 Sprint 2 AR-C15 定义一致，可进入 TDD 规格化）。

## 踩坑提醒（防复发）

- `brainstorm` 名称可能与流程技能同名，需避免导入路径或显示名冲突。
- `roleplay`、`critique` 若缺少输入约束，容易在 UI 层被误用为通用写作按钮。
- 仅写静态快照测试无法防住 `FAKETEST`，需有真实 loader 失败路径测试。

## 防治标签

- `FAKETEST` `DRIFT` `NOISE`

## 不做什么

- 不新增写作技能、不调整既有写作技能文档。
- 不改动 SkillExecutor、IPC 通道和错误码定义。
- 不实现编辑器/AI 面板上的触发入口 UI。

## 审阅状态

- Owner 审阅：`PENDING`
