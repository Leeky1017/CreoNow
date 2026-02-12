## 1. Specification

- [x] 1.1 审阅并确认需求边界：`inferSkillFromInput` 接受 `{input, hasSelection, explicitSkillId?}`，返回技能 ID 字符串
- [x] 1.2 审阅并确认错误路径与边界路径：空输入 → chat；显式覆盖优先；选中文本启发式优先于关键词
- [x] 1.3 审阅并确认验收阈值与不可变契约：路由优先级固定为 显式 > 选中上下文 > 关键词 > 默认 chat
- [x] 1.4 无上游依赖，标注 N/A

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

| Scenario ID | 测试文件 | 测试断言（对应用例） | 断言要点 |
|-------------|---------|---------------------|----------|
| S1 | `apps/desktop/main/src/services/skills/__tests__/skillRouter.test.ts` | `inferSkillFromInput({ input: "帮我想一个悬疑小说的开头", hasSelection: false })` | `"builtin:chat"` |
| S2 | `apps/desktop/main/src/services/skills/__tests__/skillRouter.test.ts` | `inferSkillFromInput({ input: "续写这个段落", hasSelection: false })` | `"builtin:continue"` |
| S3 | `apps/desktop/main/src/services/skills/__tests__/skillRouter.test.ts` | `inferSkillFromInput({ input: "头脑风暴一下", hasSelection: false })` | `"builtin:brainstorm"` |
| S4 | `apps/desktop/main/src/services/skills/__tests__/skillRouter.test.ts` | `inferSkillFromInput({ input: "", hasSelection: false })` | `"builtin:chat"` |
| S5 | `apps/desktop/main/src/services/skills/__tests__/skillRouter.test.ts` | `inferSkillFromInput({ input: "续写", hasSelection: false, explicitSkillId: "builtin:polish" })` | `"builtin:polish"` |
| S6 | `apps/desktop/main/src/services/skills/__tests__/skillRouter.test.ts` | `inferSkillFromInput({ input: "", hasSelection: true })` | `"builtin:polish"` |
| S7 | `apps/desktop/main/src/services/skills/__tests__/skillRouter.test.ts` | `inferSkillFromInput({ input: "改一下", hasSelection: true })` | `"builtin:rewrite"` |

## 3. Red（先写失败测试）

- [x] 3.1 Red 阶段先编写 `skillRouter.test.ts` 与 `chatSkill.test.ts`（模块/文件尚不存在时执行）
- [x] 3.2 Red 失败证据已记录：
  - `ERR_MODULE_NOT_FOUND: Cannot find module '../skillRouter'`
  - `ENOENT: no such file or directory — chat/SKILL.md`
- [x] 3.3 Red 证据落盘：`openspec/_ops/task_runs/ISSUE-457.md` 的 `Red Phase` 段

## 4. Green（最小实现通过）

- [x] 4.1 最小实现 `apps/desktop/main/src/services/skills/skillRouter.ts`，导出 `inferSkillFromInput`
- [x] 4.2 最小实现 `apps/desktop/main/skills/packages/pkg.creonow.builtin/1.0.0/skills/chat/SKILL.md`
- [x] 4.3 Green 通过证据已记录并在本次 closeout 复验：
  - `pnpm exec tsx apps/desktop/main/src/services/skills/__tests__/skillRouter.test.ts`
  - `pnpm exec tsx apps/desktop/main/src/services/skills/__tests__/chatSkill.test.ts`

## 5. Refactor（保持绿灯）

- [x] 5.1 路由关键词规则已抽取为 `KEYWORD_RULES` 常量并保持纯函数实现
- [x] 5.2 `test:unit` 已纳入 `skillRouter.test.ts` 与 `chatSkill.test.ts`
- [x] 5.3 回归修正已完成：`skill-executor.test.ts` 内置技能清单补齐 `chat`（`ISSUE-466`）

## 6. Evidence

- [x] 6.1 Red/Green 历史证据：`openspec/_ops/task_runs/ISSUE-457.md`
- [x] 6.2 回归修正证据：`openspec/_ops/task_runs/ISSUE-466.md`
- [x] 6.3 本次交付与归档证据：`openspec/_ops/task_runs/ISSUE-469.md`
