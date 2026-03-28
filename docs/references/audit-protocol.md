# 审计协议（Audit Protocol）

> 从 `AGENTS.md` v3 §六提取。本文件是审计 Agent 的完整操作手册。
> 宪法级概述见 `AGENTS.md` §六。

---

## 目录

- [0. 双审编排关系](#0-双审编排关系)
- [1. 零问题收口原则](#1-零问题收口原则)
- [2. 审计四律](#2-审计四律)
- [3. 变更分类（审计第一步）](#3-变更分类审计第一步)
- [4. 审计层级](#4-审计层级)
- [5. 审计检查项索引](#5-审计检查项索引)
- [6. 不能做清单](#6-不能做清单)
- [7. 必须做白名单](#7-必须做白名单)
- [8. 根因排查格式](#8-根因排查格式)
- [9. PR 评论要求](#9-pr-评论要求)
- [10. 审计命令](#10-审计命令)

---

## 0. 双审编排关系

1. 主会话 Agent 只负责编排，不直接写代码，也不直接输出最终审计结论。
2. 同一轮实现必须先由工程 Subagent 达到“可交审条件”，再进入审计阶段。
3. 每一轮审计必须由 **2 个独立审计 Subagent** 对同一变更做交叉审计；两者都应与主会话 Agent 使用同一模型。
4. 两名审计必须独立审查并独立给出结论，不能用“另一名已经看过”为由跳步。
5. 任一审计提出任何问题，本轮都不得收口；主会话 Agent 必须汇总问题并重新派回工程 Subagent 修复，随后再次发起双审。
6. 只有两名审计都 zero findings，且都给出 `FINAL-VERDICT` + `ACCEPT`，并确认 required checks 全绿、证据完整，才能结束循环。

## 1. 零问题收口原则

1. `FINAL-VERDICT` + `ACCEPT` 仅可出现在 zero findings、required checks 全绿、审计证据完整三者同时满足时。
2. 任何问题，无论严重度、措辞或优先级，包括 `non-blocking` / `suggestion` / `nit` / `tiny issue`，都意味着 `FINAL-VERDICT` 必须为 `REJECT`，直到修复并复审完成。
3. `non-blocking` 仅用于描述优先级或影响面，不再是可与 `ACCEPT` 并存的口径。
4. 禁止使用 `Accept with risk`、`ACCEPT but...` 或其他暗示“带问题通过”的表达。
5. 审计 Agent 必须保持极严格立场，不负责替作者“圆过去”；PR 要件缺失、CI 未绿、视觉证据不可见、未在 worktree 中实施，均按 finding 处理。

## 2. 审计四律

1. **CI 能查的，信任 CI；CI 不能查的，才是审计 Agent 的主战场。** 核心价值：语义正确性、spec 对齐、架构合理性、安全性、测试质量。
2. **每条结论必须有证据。** 没有 diff 引用或命令输出，不要开口。
3. **问自己：如果这个 PR 合并了，最有可能出什么问题？** 然后去验证那个场景。
4. **代码写了不等于功能生效。** 必须验证：用户操作路径是否连通？Spec Scenario 的预期行为是否真的出现？

## 3. 变更分类（审计第一步）

审计 Agent 在一切检查之前，必须先分析 PR diff，判定三个维度：

| 维度 | 可选值 |
|------|--------|
| **变更层（WHERE）** | `backend` / `frontend` / `preload` / `shared` / `infra` / `docs` |
| **风险等级（RISK）** | `critical` / `high` / `medium` / `low` / `minimal` |
| **影响面（SCOPE）** | `cross-module` / `single-module` / `isolated` |

## 4. 审计层级

根据分类结果选择审计深度。**层级选择不可降级**。

| 层级 | 适用条件 | 评论模型 | 入口命令 |
|------|---------|---------|---------|
| **Tier L** | `risk=low\|minimal` 且 `scope=isolated` | 单条 FINAL-VERDICT | `scripts/review-audit.sh L` |
| **Tier S** | `risk=medium` 且 `scope=single-module` | PRE-AUDIT + FINAL-VERDICT（有任何 finding 时插入 RE-AUDIT） | `scripts/review-audit.sh S` |
| **Tier D** | `risk=critical\|high` 或 `scope=cross-module` | PRE → RE（可多轮，最多 5 轮）→ FINAL | `scripts/review-audit.sh D` |

## 5. 审计检查项索引

根据变更层选择对应检查项执行专项检查：

| 变更层 | 核心检查项 |
|--------|------------|
| `backend` | ① IPC handler 参数校验 ② 错误传播路径 ③ 资源释放/生命周期 ④ 服务注册可达性 |
| `frontend` | ① Design Token 使用率（禁硬编码） ② 组件复用（检查 primitives/） ③ i18n `t()` 覆盖 ④ 交互状态过渡 ⑤ Storybook Story ⑥ PR 正文可见截图 ⑦ Storybook artifact/link 可点击 |
| `preload` / IPC | ① Channel 白名单注册 ② 双向类型一致性 ③ 输入校验（preload 侧） ④ 暴露面最小化 |
| `infra` | ① 门禁 baseline 更新合理性 ② 脚本幂等性 ③ CI 矩阵覆盖 |
| `docs` | ① 与代码行为一致 ② 无断裂引用 ③ 示例可运行 |
| `workflow / delivery` | ① 变更是否全程在 `.worktrees/issue-<N>-<slug>` 实施 ② PR 正文是否包含 `Closes #N`、验证证据、回滚点、审计门禁 ③ `scripts/agent_pr_preflight.sh` 是否通过 ④ required checks 是否全绿 |
| 安全（Tier D 追加） | ① contextIsolation/nodeIntegration 配置 ② 输入处理（XSS/注入） ③ 文件路径穿越 |
| 性能（Tier D 追加） | ① 主进程阻塞风险 ② 大数据渲染策略 ③ 内存泄漏路径 |
| 行为变更（S+ 必做） | ① Spec Scenario 与实现对照 ② 用户操作路径连通性 ③ 回归测试覆盖 |

多层变更时，执行所有涉及层的检查项。行为变更检查是横切关注点，补充而非替代各层专项检查。

## 6. 不能做清单

违反任一项 → 审计结论必须 **REJECT**：

1. **不能**提交 CRLF/LF 噪音型大 diff（无语义改动却整文件替换）
2. **不能**删除/跳过测试来换取 CI 通过
3. **不能**保留过时治理术语并声称"已收口"
4. **不能**只给建议不给结论（必须给 `ACCEPT/REJECT`）
5. **不能**无证据下结论（每条结论必须附命令或 diff 证据）
6. **不能**把审计结果只写本地文件不发 PR 评论
7. **不能**在 required checks 未通过时给出可合并结论
8. **不能**用"后续再看"替代当前阻断问题
9. **不能**跳过测试质量验证——涉及行为覆盖时，必须验证测试内容是否真正覆盖行为（不是只检查测试文件存在）
10. **不能**跳过 UI 协议检查——涉及 UI 改动的 PR 必须验证 Design Token 使用率、品牌一致性、PR 正文可见截图与 Storybook artifact/link；PRE-AUDIT 必须包含至少 1 条产品行为验证
11. **不能**以单审替代双审——少于 2 个独立审计 Agent 的结论视为流程未完成
12. **不能**在存在任何 finding（包括 `non-blocking` / `suggestion` / `nit` / `tiny issue`）时给出 `ACCEPT`
13. **不能**使用 `Accept with risk`、`ACCEPT but...` 或其他“有问题但先过”的表述
14. **不能**忽略工程可交审硬门槛——未在 worktree 中实施、PR 正文缺 `Closes #N` / 验证证据 / 回滚点 / 审计门禁、`scripts/agent_pr_preflight.sh` 未过、required checks 未绿、前端 PR 无可见截图或无可点击 Storybook artifact/link 时，必须维持 `REJECT`

## 7. 必须做白名单

审计 Agent 至少必须完成以下动作，否则审计无效：

1. **必须**实际读取 PR 变更的每一个文件（不可只看 commit message 或 PR 标题）
2. **必须**运行 `scripts/review-audit.sh <TIER>`（分层审计命令入口）
3. **必须**在评论中声明审计层级和变更分类结果
4. **必须**声明实际执行了哪些验证命令（附输出）
5. **必须**逐条执行 §5 中对应变更层的检查项（标注 ✅/❌/N/A）
6. **必须**验证新增 public 行为是否有对应测试（Tier S/D）
7. **必须**验证测试是否测了行为而非实现（Tier S/D，涉及测试变更时）
8. **必须**执行功能性验证（Tier S/D，涉及行为变更时）——验证 Spec Scenario 与实现的行为对照，确认功能真的生效
9. **必须**与另一名独立审计 Agent 一起完成同轮交叉审计；若缺少第二席审计，本轮审计不得视为完成
10. **必须**核验工程 Subagent 是否已达到“可交审条件”——包括 worktree、PR 正文、preflight、required checks 四项硬门槛
11. **必须**在前端 PR 中核验 PR 正文已直接嵌入至少 1 张截图，并附可点击 Storybook artifact/link 与视觉验收说明
12. **必须**在存在任何 finding 时维持 `FINAL-VERDICT` = `REJECT`；只有 zero findings + required checks 全绿 + 证据完整时才可改判 `ACCEPT`

## 8. 根因排查格式

每条问题必须包含以下六项：

1. **现象（Symptom）**
2. **根因（Root Cause）**
3. **影响面（Impact）**
4. **复现/检测命令（Reproduce）**
5. **优先级标记（Blocking / Non-blocking，仅用于排序）**
6. **处理结论（必须修复；存在本条问题时 `FINAL-VERDICT` 必为 `REJECT`）**

## 9. PR 评论要求

评论模型根据审计层级自适应：

| 层级 | 评论模型 |
|------|---------|
| **Tier L** | 单条 FINAL-VERDICT |
| **Tier S** | PRE-AUDIT + FINAL-VERDICT（有任何 finding 时插入 RE-AUDIT） |
| **Tier D** | PRE-AUDIT → RE-AUDIT（可多轮，最多 5 轮）→ FINAL-VERDICT |

所有评论必须包含结构化元数据头：`<!-- audit-meta tier: ... -->`

`FINAL-VERDICT` = `ACCEPT` 仅限 zero findings + required checks 全绿 + 证据完备；存在任何 finding 时，`FINAL-VERDICT` 必须为 `REJECT`。

合并门槛：必须收集到两名独立审计 Agent 的 zero-findings `FINAL-VERDICT` + `ACCEPT`，且两边证据完整、required checks 全绿。

## 10. 审计命令

审计命令已整合为分层入口脚本：

```bash
scripts/review-audit.sh L [<base-ref>]   # Tier L：CRLF + diff 概览
scripts/review-audit.sh S [<base-ref>]   # Tier S：+ typecheck + 相关测试 + Storybook + 脚本检查
scripts/review-audit.sh D [<base-ref>]   # Tier D：+ 全量测试 + lint + 架构门禁 + contract
```

---

## 审计交付口径

> "能发现问题、能定位根因、能明确阻断"优先于"写一堆建议"。
> 审计的第一职责是划红线，不是润色方案；宁可严格，不可放水。
