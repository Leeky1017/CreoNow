# 提案：s2-writing-skills

## 背景

`docs/plans/unified-roadmap.md` 在 Sprint 2 Phase 3 定义 `s2-writing-skills`（AR-C14）：补齐 5 个写作类内置技能文档（write/expand/describe/shrink/dialogue）。当前若缺少该批技能文档，后续编辑器侧技能入口（`s2-write-button`、`s2-bubble-ai`）将无法稳定绑定目标技能，且 Skill 文档规范存在漂移风险。

## 变更内容

- 在内置技能目录补齐 5 个写作类技能 `SKILL.md` 的规格化定义（目标、输入、输出、约束、调用约定）。
- 为 skill loader 增加覆盖这 5 个技能的加载与基本校验测试映射，确保文档与运行时发现机制一致。
- 固化写作技能命名与文案结构，避免同类技能出现描述风格和约束口径不一致。

## 受影响模块

- Skill System（`apps/desktop/main/skills/builtin/*/SKILL.md`）— 写作技能元数据与行为说明。
- Skill System（`apps/desktop/main/src/services/skills/**`）— 技能加载清单与测试覆盖映射。

## 依赖关系

- 上游依赖：无（`s2-writing-skills` 在 Sprint 2 Wave W2 可独立推进）。
- 横向协同：与 `s2-conversation-skills` 并行，不共享运行时契约。
- 下游依赖：`s2-write-button`、`s2-bubble-ai` 依赖本 change 提供稳定写作技能清单（C16/C17 依赖 C14）。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` 中 `s2-writing-skills`（AR-C14）范围与依赖图；
  - `openspec/specs/skill-system/spec.md` 中内置技能、技能加载与执行契约。
- 核对项：
  - 变更边界限定为“新增/规范技能文档 + 对应加载测试映射”；
  - 不引入新 IPC 通道，不改变 SkillExecutor 输入输出结构；
  - 保证写作技能命名、描述字段与既有内置技能风格一致。
- 结论：`NO_DRIFT`（与 Sprint 2 AR-C14 定义一致，可进入 TDD 规格化）。

## 踩坑提醒（防复发）

- `SKILL.md` 文档字段若与 loader 约定键名不一致，会出现“文件存在但运行时不可见”的假阳性。
- 同类技能文案若混用“续写/继续写作”等别名，容易导致 UI 显示和调用映射漂移。
- 仅补文档不补测试映射会造成 `FAKETEST` 风险，必须保证 Scenario 能映射到可失败测试。

## 防治标签

- `FAKETEST` `DRIFT` `NOISE`

## 不做什么

- 不实现技能执行算法改造，不调整 SkillExecutor 调度与超时策略。
- 不新增对话类技能（该范围由 `s2-conversation-skills` 负责）。
- 不处理编辑器入口 UI 与按钮交互（由 `s2-write-button` / `s2-bubble-ai` 负责）。

## 审阅状态

- Owner 审阅：`PENDING`
