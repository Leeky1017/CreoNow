# 审计协议（Audit Protocol）

> 从 `AGENTS.md` 提取。本文件是 1+4+1 审计链路的完整操作手册。

---

## 目录

- [0. 1+4+1 编排关系](#0-141-编排关系)
- [1. 固定模型配置](#1-固定模型配置)
- [2. 零问题收口原则](#2-零问题收口原则)
- [3. 审计四律](#3-审计四律)
- [4. 变更分类（审计第一步）](#4-变更分类审计第一步)
- [5. 审计层级](#5-审计层级)
- [6. 审计检查项索引](#6-审计检查项索引)
- [7. 不能做清单](#7-不能做清单)
- [8. 必须做白名单](#8-必须做白名单)
- [9. Reviewer 发布规则](#9-reviewer-发布规则)
- [10. 审计命令](#10-审计命令)

---

## 0. 1+4+1 编排关系

1. 主会话 Agent 只负责编排，不直接写代码，不直接审计，不直接发布评论。
2. 同一轮实现必须先由 Engineering Subagent 达到“可交审条件”，再进入审计阶段。
3. 每一轮审计必须并行启动 **4 个独立审计 Subagent**，且都对同一变更执行**全量审计**。
4. 四名审计必须独立给出结论，不能因为“已有其他审计结论”而跳步。
5. 任一审计提出任何问题，本轮必须 `REJECT`，回工程修复后重跑全部四审。
6. 四审都 zero findings、都给出 `FINAL-VERDICT: ACCEPT`、required checks 全绿且证据完整后，交由 Reviewer 汇总发布。
7. Reviewer 在 PR discussion timeline 发布**一条**结构化 issue comment，按标题原样粘贴四份审计报告（verbatim）。

## 1. 固定模型配置

| 角色 | 模型 | reasoning effort | 数量 |
| --- | --- | --- | --- |
| Engineering Subagent | GPT-5.3 Codex | extra high（xhigh） | 1 |
| Audit Subagent 1 | GPT-5.4 | extra high（xhigh） | 1 |
| Audit Subagent 2 | GPT-5.3 Codex | extra high（xhigh） | 1 |
| Audit Subagent 3 | Claude Opus 4.6 | high | 1 |
| Audit Subagent 4 | Claude Sonnet 4.6 | high | 1 |
| Reviewer Subagent | Claude Opus 4.6 | high | 1 |
| Main session Agent | 与用户当前对话模型 | 不固定 | 1 |

## 2. 零问题收口原则

1. 只有 zero findings + required checks 全绿 + 证据完整时，才允许 `FINAL-VERDICT: ACCEPT`。
2. 任何问题，无论严重度或措辞（含 `non-blocking` / `suggestion` / `nit` / `tiny issue`），都必须 `REJECT`。
3. 禁止使用 `Accept with risk`、`ACCEPT but...` 或任何“带问题通过”的表达。
4. 审计 Agent 负责划红线，不负责替作者“圆过去”。

## 3. 审计四律

1. **CI 能查的信任 CI；CI 不能查的才是审计主战场。**
2. **每条结论必须有证据。** 必须附 diff 引用或命令输出。
3. **先问“最可能出什么问题”，再验证那个场景。**
4. **代码存在不等于功能生效。** 必须验证用户路径和 Spec 行为。

## 4. 变更分类（审计第一步）

审计前必须先判定：

| 维度 | 可选值 |
| --- | --- |
| WHERE | `backend` / `frontend` / `preload` / `shared` / `infra` / `docs` |
| RISK | `critical` / `high` / `medium` / `low` / `minimal` |
| SCOPE | `cross-module` / `single-module` / `isolated` |

## 5. 审计层级

| 层级 | 适用条件 | 评论模型 | 入口命令 |
| --- | --- | --- | --- |
| Tier L | `risk=low|minimal` 且 `scope=isolated` | 单条 FINAL-VERDICT | `scripts/review-audit.sh L` |
| Tier S | `risk=medium` 且 `scope=single-module` | PRE-AUDIT + FINAL-VERDICT（有 finding 时插入 RE-AUDIT） | `scripts/review-audit.sh S` |
| Tier D | `risk=critical|high` 或 `scope=cross-module` | PRE → RE（最多 5 轮）→ FINAL | `scripts/review-audit.sh D` |

> 四审都使用同一层级标准，不允许“某一席降级”。

## 6. 审计检查项索引

| 变更层 | 核心检查项 |
| --- | --- |
| backend | IPC 参数校验、错误传播、资源释放、服务可达性 |
| frontend | Token 使用、组件复用、i18n、状态过渡、Storybook、PR 截图与链接 |
| preload / IPC | channel 白名单、双向类型一致性、输入校验、暴露面最小化 |
| infra | 门禁 baseline、脚本幂等性、CI 矩阵覆盖 |
| docs | 与代码一致、引用无断裂、示例可运行 |
| workflow / delivery | worktree 合规、PR 文案齐全、preflight 通过、required checks 全绿 |

## 7. 不能做清单

违反任一项，结论必须 `REJECT`：

1. 以单审、双审或维度拆分替代四审全量独立审计。
2. 在任何 finding 存在时给出 `ACCEPT`。
3. required checks 未绿就给可合并结论。
4. 无证据下结论。
5. PR 要件不全（`Closes #N` / `Invariant Checklist`（INV-1~INV-10） / 证据 / 回滚点 / 审计门禁 / 前端视觉证据）仍给放行结论。
6. 用 `Accept with risk` 等措辞绕过零问题原则。

## 8. 必须做白名单

1. 实际读取全部 PR diff。
2. 运行 `scripts/review-audit.sh <TIER>`。
3. 在结论中声明层级与分类。
4. 附实际执行命令与结果。
5. 与其他三席审计一起完成同轮四审。
6. 发现问题后要求工程修复并重跑四审。

## 9. Reviewer 发布规则

1. Reviewer（Claude Opus 4.6 high）仅汇总，不做独立审计判断。
2. 四份审计报告必须按标题分节**原样粘贴**，不得删减、改写、降级。
3. Reviewer 只发布**一条**结构化 PR discussion issue comment，不发布四条散评。
4. 汇总结论规则：四份报告均 `FINAL-VERDICT: ACCEPT` 且 zero findings 时才 `ACCEPT`，否则 `REJECT`。

## 10. 审计命令

```bash
scripts/review-audit.sh L [<base-ref>]
scripts/review-audit.sh S [<base-ref>]
scripts/review-audit.sh D [<base-ref>]
```

---

## 审计交付口径

> 审计是红线系统，不是润色系统。
> 有问题就拒绝，问题清零才放行。
