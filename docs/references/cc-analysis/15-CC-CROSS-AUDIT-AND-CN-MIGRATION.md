# Claude Code 分析报告完整性审计 × 源码交叉验证 × CN 最终迁移方案

> 审计日期：2026-04-01  
> 审计对象：`analysis-report/00-INDEX.md` 至 `analysis-report/14-CC-SOURCE-MIGRATION-MAP.md`、`analysis-report/14-CC-SOURCE-MIGRATION-MAP.old.md`、`analysis-report/文章原文内容.md`  
> 源码基线：`src/`（source map 还原版）与 `claude-code-best/`（已验证可运行版，优先级更高）  
> 证据标准：分析报告与源码冲突时，以源码为准  
> 重要限制：当前仓库未包含 CreoNow 原始源码与 OpenSpec 正文，因此 `analysis-report/06-CN-CURRENT-STATE.md`、`analysis-report/10-CN-OPENSPEC-DEEP-ANALYSIS.md`、`analysis-report/11-CN-DEVELOPMENT-STRATEGY.md`、`analysis-report/12-CN-DEVELOPMENT-STRATEGY-GPT.md`、`analysis-report/13-CN-FINAL-ARCHITECTURE.md` 只能做“与 CC 源码和迁移逻辑的一致性审计”，不能视为已经被 CN 原始材料直接验证的事实。置信度：高。

---

## 0. 审计方法

本次审计按以下顺序进行：

1. 完整阅读 `analysis-report/` 下现有报告，建立“报告主张清单”。
2. 以 `claude-code-best/` 作为优先事实基线，对 `src/` 做差异对照，识别报告中哪些结论来自 map 还原版、哪些结论可以被验证版确认。
3. 对以下高风险系统做重点验真：主循环、工具执行、压缩、权限、Coordinator、Bridge、fork cache、prompt 组装、Feature Flag、新增模块、新增 native 包、`services/` 差集。
4. 回填到每份报告，给出评分、错误、遗漏、过时项、深度不足项，以及 CN 迁移清单。

本审计中所有“CC 技术事实”均附带源码锚点；所有“报告结构问题”均附带报告文件锚点；所有“CN 迁移判断”均明确标注置信度。

---

## 1. 执行摘要

### 1.1 总判断

这套 `analysis-report/` 的主要问题不是方向错误，而是盘点精度不够、版本边界不清，以及把“源码存在”误当成“能力已经成熟可迁移”。

可以明确成立的结论有三类：

- CC 的主会话循环、Prompt 组装、自动压缩、成本追踪、工具 fail-closed 默认值，这些核心机制确实构成了 CN 最应学习的骨架。证据：`claude-code-best/src/QueryEngine.ts:186`、`claude-code-best/src/query.ts:219`、`claude-code-best/src/constants/prompts.ts:114`、`claude-code-best/src/services/compact/autoCompact.ts:26`、`claude-code-best/src/cost-tracker.ts:71`。置信度：高。
- 报告对 QueryEngine / query loop、Plugin/Skill/MCP 分层、forked agent cache 共享、Bridge 大方向的理解大体正确，但细节精度不够。证据：`claude-code-best/src/query.ts:241`、`claude-code-best/src/utils/forkedAgent.ts:44`、`claude-code-best/src/bridge/remoteBridgeCore.ts:15`。置信度：高。
- 最失真的部分集中在索引层与迁移图层，尤其是 `analysis-report/00-INDEX.md` 与 `analysis-report/14-CC-SOURCE-MIGRATION-MAP.md`。这些文件传播了错误数字、过度成熟化判断和版本混淆。证据：`analysis-report/00-INDEX.md:7`、`analysis-report/12-CN-DEVELOPMENT-STRATEGY-GPT.md:11`、`analysis-report/14-CC-SOURCE-MIGRATION-MAP.md:144`、`analysis-report/14-CC-SOURCE-MIGRATION-MAP.md:535`、`analysis-report/14-CC-SOURCE-MIGRATION-MAP.md:614`。置信度：高。

### 1.2 五个必须修正的全局结论

1. 分析报告说“Feature Flag 大约 30 个”，源码实际至少远超这个数量；仅 `claude-code-best/src/commands.ts`、`claude-code-best/src/setup.ts`、`claude-code-best/src/services/mcp/client.ts`、`claude-code-best/src/utils/bash/parser.ts` 就能看到大量独立 gate，且仓库级扫描得到 `claude-code-best/src` 约 85 个唯一 `feature('...')`，`src` 约 89 个唯一 `feature('...')`。证据：`claude-code-best/src/commands.ts:63`、`claude-code-best/src/commands.ts:73`、`claude-code-best/src/setup.ts:295`、`claude-code-best/src/setup.ts:365`、`claude-code-best/src/services/mcp/client.ts:117`、`claude-code-best/src/services/mcp/client.ts:242`、`claude-code-best/src/utils/bash/parser.ts:51`。置信度：高。
2. 分析报告说“80+ Hooks”，源码实际 `claude-code-best/src/hooks/` 已有 147 个文件，且并不只是 UI hooks，还覆盖通知、历史、权限、IDE diff 等跨层行为。证据：`claude-code-best/src/constants/prompts.ts:128`、`claude-code-best/src/hooks/notifs/useAutoModeUnavailableNotification.ts:19`、`claude-code-best/src/hooks/useAssistantHistory.ts:72`、`claude-code-best/src/hooks/useDiffInIDE.ts:46`。置信度：高。
3. 分析报告把工具执行简化成“只读并发、写工具串行”，源码实际是 `isConcurrencySafe` 决定并发，不等于 `isReadOnly`。`buildTool()` 的安全默认值是 `isConcurrencySafe=false`、`isReadOnly=false`，`StreamingToolExecutor` 进一步根据并发安全性流式调度。证据：`claude-code-best/src/Tool.ts:757`、`claude-code-best/src/Tool.ts:759`、`claude-code-best/src/Tool.ts:760`、`claude-code-best/src/services/tools/toolOrchestration.ts:24`、`claude-code-best/src/services/tools/toolOrchestration.ts:84`、`claude-code-best/src/services/tools/StreamingToolExecutor.ts:29`、`claude-code-best/src/services/tools/StreamingToolExecutor.ts:113`。置信度：高。
4. 分析报告把 `getSystemContext()` 与 `getUserContext()` 的职责写反了一部分。源码实际把 Git 状态、cache breaker 放在 `getSystemContext()`，把 `claudeMd` 与 `currentDate` 放在 `getUserContext()`。证据：`claude-code-best/src/context.ts:116`、`claude-code-best/src/context.ts:132`、`claude-code-best/src/context.ts:155`、`claude-code-best/src/context.ts:185`。置信度：高。
5. 分析报告把 `claude-code-best` 新增目录普遍视为“最新成熟演进方向”，源码实际显示 `daemon`、`environment-runner`、`jobs`、`proactive`、`self-hosted-runner`、`ssh`，以及 `services/contextCollapse` 在当前仓库里很多只是自动生成 stub。证据：`claude-code-best/src/daemon/main.ts:1`、`claude-code-best/src/environment-runner/main.ts:1`、`claude-code-best/src/jobs/classifier.ts:1`、`claude-code-best/src/proactive/index.ts:1`、`claude-code-best/src/self-hosted-runner/main.ts:1`、`claude-code-best/src/ssh/createSSHSession.ts:1`、`claude-code-best/src/services/contextCollapse/index.ts:1`。置信度：高。

---

## 2. 特别关注系统覆盖审计

| 系统 | 报告覆盖判断 | 关键源码证据 | 审计结论 | 置信度 |
|---|---|---|---|---|
| QueryEngine 完整生命周期 | 基本覆盖，但未覆盖所有分支路径 | `claude-code-best/src/QueryEngine.ts:186`、`claude-code-best/src/QueryEngine.ts:210`、`claude-code-best/src/query.ts:219`、`claude-code-best/src/query.ts:241`、`claude-code-best/src/query.ts:282`、`claude-code-best/src/query.ts:620` | 报告正确抓到了“跨 turn 持久状态 + query loop”主线，但没有把 `QueryEngine.submitMessage()`、`query()`、`queryLoop()` 三层分工，以及 `blocking_limit`、streaming fallback、budget tracking 等路径展开到足够可迁移的深度。 | 高 |
| Tool-use loop 与 streaming tool execution | 部分覆盖 | `claude-code-best/src/Tool.ts:757`、`claude-code-best/src/services/tools/toolOrchestration.ts:24`、`claude-code-best/src/services/tools/toolOrchestration.ts:84`、`claude-code-best/src/services/tools/StreamingToolExecutor.ts:29`、`claude-code-best/src/services/tools/StreamingToolExecutor.ts:129`、`claude-code-best/src/query.ts:651` | 报告讲到了批处理调度，但没有把 `StreamingToolExecutor` 作为与 `runTools()` 并列的重要执行路径讲透，因此“工具循环完整实现”仍不够。 | 高 |
| 上下文压缩三层机制与触发条件 | 覆盖不完整 | `claude-code-best/src/constants/prompts.ts:114`、`claude-code-best/src/services/compact/autoCompact.ts:57`、`claude-code-best/src/services/compact/autoCompact.ts:75`、`claude-code-best/src/services/compact/autoCompact.ts:149`、`claude-code-best/src/services/SessionMemory/sessionMemoryUtils.ts:33`、`claude-code-best/src/services/SessionMemory/sessionMemoryUtils.ts:176`、`claude-code-best/src/services/SessionMemory/sessionMemoryUtils.ts:187`、`claude-code-best/src/services/contextCollapse/index.ts:1` | 报告提到了 Prompt Cache、AutoCompact、Session Memory，但没有精确到阈值与互斥条件；更关键的是没有指出 `contextCollapse` 在当前 `best` 中仍是 stub。 | 高 |
| 权限系统完整实现 | 覆盖不足 | `claude-code-best/src/types/permissions.ts:16`、`claude-code-best/src/types/permissions.ts:33`、`claude-code-best/src/hooks/toolPermission/PermissionContext.ts:217`、`claude-code-best/src/utils/fileHistory.ts:198` | 报告抓到了 Permission 的重要性，但没有把 mode、rule source、hook 决策、文件快照恢复这些层面展开。按文件名扫描，`claude-code-best/src/` 中带 permission 语义的文件超过一百个，明显比“一个子系统”复杂得多。 | 高 |
| Coordinator / Agent Swarm 协议 | 覆盖方向正确，但成熟度判断偏高 | `claude-code-best/src/coordinator/coordinatorMode.ts:37`、`claude-code-best/src/coordinator/coordinatorMode.ts:111`、`claude-code-best/src/coordinator/coordinatorMode.ts:202` | 报告正确识别了 Coordinator 的阶段化 orchestration prompt，但忽略了运行入口仍由 `COORDINATOR_MODE` gate 和环境变量控制。 | 高 |
| Bridge 远程握手与重连 | 部分覆盖 | `claude-code-best/src/bridge/remoteBridgeCore.ts:15`、`claude-code-best/src/bridge/remoteBridgeCore.ts:19`、`claude-code-best/src/bridge/remoteBridgeCore.ts:188`、`claude-code-best/src/bridge/remoteBridgeCore.ts:224`、`claude-code-best/src/bridge/replBridgeTransport.ts:109`、`claude-code-best/src/bridge/replBridgeTransport.ts:183`、`claude-code-best/src/bridge/replBridgeTransport.ts:211` | 报告知道 Bridge 是远程会话骨架，但没有把 `/bridge -> worker_jwt -> SSE + CCRClient -> 401 恢复` 这条协议讲清楚。 | 高 |
| Forked Agent prompt cache 共享 | 覆盖较好 | `claude-code-best/src/utils/forkedAgent.ts:44`、`claude-code-best/src/utils/forkedAgent.ts:68`、`claude-code-best/src/utils/forkedAgent.ts:102` | 这是报告中理解最准确的高级机制之一；不足之处在于没有把“哪些字段必须 cache-safe”与“哪些配置会破坏 cache hit”讲到工程可执行程度。 | 高 |
| Hooks 列表与调用时机 | 覆盖不足 | `claude-code-best/src/constants/prompts.ts:128`、`claude-code-best/src/hooks/notifs/useAutoModeUnavailableNotification.ts:19`、`claude-code-best/src/hooks/useAssistantHistory.ts:72`、`claude-code-best/src/hooks/useDiffInIDE.ts:46` | 报告只把 hooks 当成扩展点目录来讲，没有给出实际调用时机、分类与范围。 | 高 |
| 7 层 Prompt 拼装 | 覆盖表层 | `claude-code-best/src/constants/prompts.ts:175`、`claude-code-best/src/constants/prompts.ts:186`、`claude-code-best/src/constants/prompts.ts:199`、`claude-code-best/src/constants/prompts.ts:255`、`claude-code-best/src/constants/prompts.ts:269`、`claude-code-best/src/constants/prompts.ts:403`、`claude-code-best/src/constants/prompts.ts:430`、`claude-code-best/src/constants/prompts.ts:491` | 报告说到了 prompt engineering，但没有把静态七层、动态 boundary、session-specific sections 和 env/memory/MCP 注入拆解为真实实现顺序。 | 高 |
| Feature Flags | 覆盖不足且数字错误 | `claude-code-best/src/commands.ts:63`、`claude-code-best/src/commands.ts:80`、`claude-code-best/src/commands.ts:96`、`claude-code-best/src/setup.ts:295`、`claude-code-best/src/setup.ts:365`、`claude-code-best/src/services/mcp/client.ts:117`、`claude-code-best/src/utils/bash/parser.ts:51` | 报告把 Feature Flag 当成少量横切配置，源码实际显示它是编译期与运行期开关网络。 | 高 |
| `claude-code-best` 新增 6 个顶层模块 | 覆盖存在重大偏差 | `claude-code-best/src/daemon/main.ts:1`、`claude-code-best/src/environment-runner/main.ts:1`、`claude-code-best/src/jobs/classifier.ts:1`、`claude-code-best/src/proactive/index.ts:1`、`claude-code-best/src/self-hosted-runner/main.ts:1`、`claude-code-best/src/ssh/createSSHSession.ts:1` | 报告把这些新增目录视为已成形增量，但当前仓库中多数是占位桩。迁移判断不能按目录名做。 | 高 |
| 新增 6 个 native 包 | 覆盖存在误判 | `claude-code-best/packages/audio-capture-napi/src/index.ts:28`、`claude-code-best/packages/image-processor-napi/src/index.ts:1`、`claude-code-best/packages/modifiers-napi/src/index.ts:1`、`claude-code-best/packages/color-diff-napi/src/index.ts:1`、`claude-code-best/packages/url-handler-napi/src/index.ts:1`、`claude-code-best/packages/@ant/computer-use-mcp/src/index.ts:1` | 报告把多个包写成 stub，但实际情况是“有的是真实现，有的是 TypeScript 替身，有的是纯 stub”。需要逐包判断，而不是一刀切。 | 高 |
| `services/` 新增 105 个文件 | 覆盖不充分 | 目录差集审计结果：`api 47`、`compact 15`、`mcp 11`、`oauth 7`、`skillSearch 7`、`contextCollapse 3` 等 | 报告注意到了增量规模，但没有区分“能力新增”与“镜像支持文件新增”。`services/api/` 中大量新增其实是 Agent SDK / headless 复用层，不应直接等同为新能力。 | 高 |

---

## 3. `claude-code-best` 相比 `src` 的增量盘点

### 3.1 顶层新增模块：成熟度重估

| 模块 | 入口文件 | 当前状态 | 对迁移的真实意义 | 置信度 |
|---|---|---|---|---|
| `daemon` | `claude-code-best/src/daemon/main.ts:1` | 自动生成 stub | 不能作为 CN 能力基线，只能视为保留接口位 | 高 |
| `environment-runner` | `claude-code-best/src/environment-runner/main.ts:1` | 自动生成 stub | 不应进入当前迁移清单 | 高 |
| `jobs` | `claude-code-best/src/jobs/classifier.ts:1` | 自动生成 stub | 不应被误读为成熟任务分类子系统 | 高 |
| `proactive` | `claude-code-best/src/proactive/index.ts:1` | 自动生成 stub | “主动式 AI”在当前仓库并无可迁移实现 | 高 |
| `self-hosted-runner` | `claude-code-best/src/self-hosted-runner/main.ts:1` | 自动生成 stub | 与 CN 当前产品目标无关 | 高 |
| `ssh` | `claude-code-best/src/ssh/createSSHSession.ts:1`、`claude-code-best/src/ssh/SSHSessionManager.ts:1` | 自动生成 stub | 不应因目录存在而纳入迁移优先级 | 高 |

### 3.2 新增 native 包：逐包判断

| 包 | 关键文件 | 当前状态 | 迁移判断 | 置信度 |
|---|---|---|---|---|
| `packages/audio-capture-napi` | `claude-code-best/packages/audio-capture-napi/src/index.ts:28` | 真实现，使用 SoX / arecord 做音频采集 | 仅当 CN 明确引入语音输入时参考，不作为当前 P0/P1 | 高 |
| `packages/image-processor-napi` | `claude-code-best/packages/image-processor-napi/src/index.ts:1` | 真实现，基于 `sharp` 和系统剪贴板读取 | 仅当 CN 需要剪贴板图像/截图理解时参考 | 高 |
| `packages/modifiers-napi` | `claude-code-best/packages/modifiers-napi/src/index.ts:1` | 真实现，macOS FFI 检测修饰键 | 对写作产品短期价值低 | 高 |
| `packages/color-diff-napi` | `claude-code-best/packages/color-diff-napi/src/index.ts:1` | 不是 NAPI 真绑定，而是 TypeScript port / native 替身 | 可参考“保持 API 兼容的替身策略”，但不需迁移 | 高 |
| `packages/url-handler-napi` | `claude-code-best/packages/url-handler-napi/src/index.ts:1` | 纯 stub | 不纳入迁移 | 高 |
| `packages/@ant/computer-use-mcp` | `claude-code-best/packages/@ant/computer-use-mcp/src/index.ts:1` | 纯 stub；且 `@ant/` 还是一个命名空间目录，不应被当成单一 native 包 | 不纳入迁移 | 高 |

### 3.3 `services/` 新增 105 文件都包含什么

按差集盘点，`claude-code-best/src/services/` 相比 `src/services/` 新增 105 个文件，主要分布如下：

| 子系统 | 新增文件数 | 代表文件 | 说明 | 置信度 |
|---|---:|---|---|---|
| `api` | 47 | `claude-code-best/src/services/api/src/Tool.ts`、`claude-code-best/src/services/api/src/entrypoints/agentSdkTypes.ts`、`claude-code-best/src/services/api/src/utils/toolSearch.ts` | 主要是 Agent SDK / headless 复用层、类型镜像、基础 utils，并不等于 47 个独立新能力 | 高 |
| `compact` | 15 | `claude-code-best/src/services/compact/reactiveCompact.ts`、`claude-code-best/src/services/compact/snipCompact.ts`、`claude-code-best/src/services/compact/cachedMicrocompact.ts` | 这部分是真增量，说明压缩体系比 `src/` 更丰富 | 高 |
| `mcp` | 11 | `claude-code-best/src/services/mcp/src/constants/oauth.ts`、`claude-code-best/src/services/mcp/src/utils/auth.ts` | 以共享常量、类型、auth/config 支持文件为主 | 高 |
| `oauth` | 7 | `claude-code-best/src/services/oauth/src/constants/oauth.ts` | 为 OAuth 流程抽出了公共层，但与 CN 当前迁移关系弱 | 高 |
| `skillSearch` | 7 | `claude-code-best/src/services/skillSearch/featureCheck.ts` | 代表实验性技能检索方向，值得观察但不该提前迁移 | 高 |
| `contextCollapse` | 3 | `claude-code-best/src/services/contextCollapse/index.ts:1` | 当前仍是 stub，不应被视作成熟增量 | 高 |
| 其它 | 15 | `tips`、`tools`、`analytics`、`lsp`、`remoteManagedSettings`、`sessionTranscript` | 多为支持层与周边能力，不是当前迁移重点 | 高 |

结论：`services/` 的新增文件数不能直接解释成“新能力等量增加”。迁移决策必须逐子系统判断成熟度与对 CN 的真实价值。置信度：高。

---

## 4. 逐文件审计

### 4.1 `analysis-report/00-INDEX.md`

**准确性评分：4/10**

- 错误：索引仍写“当前 `analysis-report/` 目录共有 12 份报告文件”，但目录至少已经有 `00-15` 的 16 份主报告文件，另有 `14-CC-SOURCE-MIGRATION-MAP.old.md` 与 `文章原文内容.md`。这会误导读者对报告边界的理解。证据：`analysis-report/00-INDEX.md:7`、`analysis-report/12-CN-DEVELOPMENT-STRATEGY-GPT.md:11`、`analysis-report/13-CN-FINAL-ARCHITECTURE.md:3`。置信度：高。
- 遗漏：索引完全没有收录 `analysis-report/13-CN-FINAL-ARCHITECTURE.md`、`analysis-report/14-CC-SOURCE-MIGRATION-MAP.md`、`analysis-report/14-CC-SOURCE-MIGRATION-MAP.old.md`。置信度：高。
- 过时：索引中的“核心结论”没有反映 `claude-code-best` 对新增模块成熟度、Feature Flag 数量和 native 包状态的真实情况。证据：`claude-code-best/src/commands.ts:63`、`claude-code-best/src/services/contextCollapse/index.ts:1`。置信度：高。
- 深度不足：索引没有区分“事实基线文档”和“面向决策/策略的文档”，导致读者难以判断哪份文档可直接作为工程依据。置信度：高。

### 4.2 `analysis-report/01-CC-ARCHITECTURE.md`

**准确性评分：7/10**

- 错误：报告把工具执行描述成“只读并发，写入串行”；源码实际是按 `isConcurrencySafe` 分批，安全默认值由 `buildTool()` 设为 false。证据：`claude-code-best/src/Tool.ts:757`、`claude-code-best/src/services/tools/toolOrchestration.ts:24`、`claude-code-best/src/services/tools/toolOrchestration.ts:84`。置信度：高。
- 遗漏：没有充分覆盖 Prompt cache boundary 与动态区段拼装。证据：`claude-code-best/src/constants/prompts.ts:114`、`claude-code-best/src/constants/prompts.ts:491`、`claude-code-best/src/constants/prompts.ts:557`。置信度：高。
- 过时：如果读者根据本文件理解 `best` 新模块，会高估 `contextCollapse`、`proactive` 等目录的成熟度；这些在当前仓库还是 stub。证据：`claude-code-best/src/services/contextCollapse/index.ts:1`、`claude-code-best/src/proactive/index.ts:1`。置信度：高。
- 深度不足：对 Bridge、Session Memory、Feature Flag 网络、hooks 生态只做了架构级点名，没有进入工程边界。证据：`claude-code-best/src/bridge/remoteBridgeCore.ts:15`、`claude-code-best/src/services/SessionMemory/sessionMemoryUtils.ts:33`、`claude-code-best/src/constants/prompts.ts:128`。置信度：中高。

### 4.3 `analysis-report/02-CC-CORE-ENGINE.md`

**准确性评分：8/10**

- 错误：对工具并发的解释仍然沿用了“读写分区”表述，不足以还原 streaming path。源码实际既有 `runTools()` 批处理，也有 `StreamingToolExecutor`。证据：`claude-code-best/src/services/tools/toolOrchestration.ts:24`、`claude-code-best/src/services/tools/StreamingToolExecutor.ts:29`、`claude-code-best/src/query.ts:651`。置信度：高。
- 遗漏：没有明确写出 `QueryEngine.submitMessage() -> query() -> queryLoop()` 三层结构，也没有充分覆盖 `streamingFallbackOccured`、tombstone、`taskBudgetRemaining` 等分支。证据：`claude-code-best/src/QueryEngine.ts:210`、`claude-code-best/src/query.ts:219`、`claude-code-best/src/query.ts:284`、`claude-code-best/src/query.ts:676`。置信度：高。
- 过时：无重大过时项，本文件是目前最接近真实核心循环的报告之一。置信度：高。
- 深度不足：没有把 `pendingMemoryPrefetch` 与 `pendingSkillPrefetch` 这种“边执行边预取”的设计价值展开，而这对 CN 写作场景很关键。证据：`claude-code-best/src/query.ts:280`、`claude-code-best/src/query.ts:311`。置信度：中高。

### 4.4 `analysis-report/03-CC-AI-PATTERNS.md`

**准确性评分：7/10**

- 错误：本文件将 `getSystemContext()` 与 `getUserContext()` 的职责写反了一部分；源码实际把 Git status 放在 system context，把 `claudeMd` 与日期放在 user context。证据：`claude-code-best/src/context.ts:116`、`claude-code-best/src/context.ts:132`、`claude-code-best/src/context.ts:155`、`claude-code-best/src/context.ts:185`。置信度：高。
- 遗漏：没有明确写出 Session Memory 的初始化阈值与更新阈值，也没有写出 Auto Memory 提取器的受限工具沙箱。证据：`claude-code-best/src/services/SessionMemory/sessionMemoryUtils.ts:33`、`claude-code-best/src/services/SessionMemory/sessionMemoryUtils.ts:176`、`claude-code-best/src/services/SessionMemory/sessionMemoryUtils.ts:187`、`claude-code-best/src/services/extractMemories/extractMemories.ts:171`、`claude-code-best/src/services/extractMemories/extractMemories.ts:202`、`claude-code-best/src/services/extractMemories/extractMemories.ts:219`。置信度：高。
- 过时：若文中把 `contextCollapse` 视为 `best` 中已经落地的第三层压缩，这在当前仓库里不成立，因为其实现是 stub。证据：`claude-code-best/src/services/contextCollapse/index.ts:1`。置信度：高。
- 深度不足：对“Prompt Cache 节省成本”的论述方向正确，但没有把 cache-safe 参数与 cache-breaker 条件写成工程可迁移规则。证据：`claude-code-best/src/utils/forkedAgent.ts:44`、`claude-code-best/src/utils/forkedAgent.ts:102`、`claude-code-best/src/constants/prompts.ts:114`。置信度：中高。

### 4.5 `analysis-report/04-CC-PLUGIN-SKILL.md`

**准确性评分：7/10**

- 错误：本文件及其派生文档多次延续“80+ hooks”的口径，但 `claude-code-best/src/hooks/` 已达到 147 个文件。证据：`claude-code-best/src/constants/prompts.ts:128`、`claude-code-best/src/hooks/notifs/useAutoModeUnavailableNotification.ts:19`、`claude-code-best/src/hooks/useAssistantHistory.ts:72`。置信度：高。
- 错误：把 Coordinator 叙述得过于成熟，容易让读者误以为这是一条稳定主线；源码实际仍受 `COORDINATOR_MODE` gate 控制。证据：`claude-code-best/src/coordinator/coordinatorMode.ts:37`。置信度：高。
- 遗漏：未充分覆盖 session-specific guidance、Discover Skills、MCP instructions delta 对 prompt 组装的影响。证据：`claude-code-best/src/constants/prompts.ts:352`、`claude-code-best/src/constants/prompts.ts:495`、`claude-code-best/src/constants/prompts.ts:518`。置信度：中高。
- 深度不足：对 hooks 只停留在“有这一层”，没有给出调用时机、权限交互与 UI hook 的边界。证据：`claude-code-best/src/hooks/toolPermission/PermissionContext.ts:217`、`claude-code-best/src/hooks/useDiffInIDE.ts:46`。置信度：中高。

### 4.6 `analysis-report/05-CC-ENGINEERING.md`

**准确性评分：6/10**

- 错误：对 Permission mode 的描述不完整；源码实际外部 mode 至少包括 `acceptEdits`、`bypassPermissions`、`default`、`dontAsk`、`plan`，内部还可能加上 `auto`。证据：`claude-code-best/src/types/permissions.ts:16`、`claude-code-best/src/types/permissions.ts:33`、`claude-code-best/src/types/permissions.ts:35`。置信度：高。
- 错误：Feature Flag 的数量级严重低估。证据：`claude-code-best/src/commands.ts:63`、`claude-code-best/src/setup.ts:295`、`claude-code-best/src/services/mcp/client.ts:117`、`claude-code-best/src/utils/bash/parser.ts:51`。置信度：高。
- 遗漏：没有把修改前快照 `fileHistoryMakeSnapshot()` 纳入“保护用户工作”的工程清单。证据：`claude-code-best/src/utils/fileHistory.ts:198`。置信度：高。
- 深度不足：对启动优化、AbortController 的判断基本对，但对权限系统、Feature Flag 网络和 Team Memory / Context Collapse 的横切影响讲得太浅。证据：`claude-code-best/src/setup.ts:295`、`claude-code-best/src/setup.ts:365`。置信度：中高。

### 4.7 `analysis-report/06-CN-CURRENT-STATE.md`

**准确性评分：7/10**

- 错误：本文件关于 CN 的若干判断无法在当前仓库直接验真，因为 CN 原始代码与 OpenSpec 正文不在本仓库中。这个问题不等于内容错，但属于证据链不闭合。置信度：高。
- 遗漏：应该明确区分“基于 CC 源码对照得出的判断”和“基于 CN 现有实现直接验证得出的判断”。目前读者很容易把两者混为一谈。置信度：高。
- 过时：无充分证据证明本文件过时，但它缺少对 `claude-code-best` 新增/占位模块的重新校准。证据：`claude-code-best/src/proactive/index.ts:1`、`claude-code-best/src/services/contextCollapse/index.ts:1`。置信度：中。
- 深度不足：如果要作为最终 CN 审计基线，必须回到 CN 仓库本身逐文件验证，而不是只用 CC 作镜像对照。置信度：高。

### 4.8 `analysis-report/07-TRANSFERABLE.md`

**准确性评分：8/10**

- 错误：部分数字继承了前文的低估口径，例如 Feature Flag、hooks、`best` 增量成熟度。证据：`claude-code-best/src/commands.ts:63`、`claude-code-best/src/constants/prompts.ts:128`、`claude-code-best/src/daemon/main.ts:1`。置信度：高。
- 遗漏：虽然优先级划分合理，但没有明确写出“哪些模块只能参考模式、不能复制代码”。这是迁移决策里最关键的一层。证据：`claude-code-best/src/bridge/remoteBridgeCore.ts:15`、`claude-code-best/src/proactive/index.ts:1`。置信度：高。
- 过时：如果本文件默认以 `src/` 为主要迁移源，那么应更新为“同名文件以 `claude-code-best` 优先”。置信度：高。
- 深度不足：缺少文件级迁移落位与工作量评估，这会让“可搬/不可搬”的结论难以执行。置信度：高。

### 4.9 `analysis-report/08-CLI-BACKBONE-ELECTRON.md`

**准确性评分：7/10**

- 错误：本文件对 hooks 规模与权限系统复杂度的估计仍偏低。证据：`claude-code-best/src/constants/prompts.ts:128`、`claude-code-best/src/types/permissions.ts:16`。置信度：高。
- 遗漏：没有充分覆盖 `QueryEngine` 的 streaming fallback、file history 快照以及 tool permission UI 与写作 UI 的接口层。证据：`claude-code-best/src/query.ts:676`、`claude-code-best/src/utils/fileHistory.ts:198`、`claude-code-best/src/hooks/toolPermission/PermissionContext.ts:217`。置信度：中高。
- 过时：如果 Electron 方案默认吸收 `best` 新增顶层目录，也需要修正，因为这些目录大多是 stub。证据：`claude-code-best/src/proactive/index.ts:1`。置信度：高。
- 深度不足：对 ProseMirror 的具体接入点仍停留在架构层，没有把“文档模型、选区、批量修改确认”细化到可编码设计。置信度：中。

### 4.10 `analysis-report/09-IMPLEMENTATION-GUIDE.md`

**准确性评分：7/10**

- 错误：本文件若建立在“30 个 Feature Flag”“80+ hooks”“`best` 新模块成熟”这些前提之上，就会放大迁移范围。证据：`claude-code-best/src/commands.ts:63`、`claude-code-best/src/constants/prompts.ts:128`、`claude-code-best/src/services/contextCollapse/index.ts:1`。置信度：高。
- 遗漏：没有把最该先落地的三件事写成不可跳过的 P0：Permission Gate、中文 token 估算修正、AutoCompact / SessionMemory。证据：`claude-code-best/src/types/permissions.ts:16`、`claude-code-best/src/services/compact/autoCompact.ts:57`、`claude-code-best/src/services/SessionMemory/sessionMemoryUtils.ts:33`。置信度：高。
- 过时：若仍把 `src/` 当作默认复制源，需要改成 `claude-code-best` 优先。置信度：高。
- 深度不足：缺少文件级落位、适配工作量和“整文件复制 vs 结构迁移 vs 仅参考模式”的明确划分。置信度：高。

### 4.11 `analysis-report/10-CN-OPENSPEC-DEEP-ANALYSIS.md`

**准确性评分：7/10**

- 错误：当前仓库没有 CN OpenSpec 正文，因此本文件对 OpenSpec 的判断无法直接在本审计中复核。置信度：高。
- 遗漏：应增加“这些建议分别对应 CC 的哪些源码模式”这一层映射。证据：`claude-code-best/src/query.ts:219`、`claude-code-best/src/constants/prompts.ts:444`、`claude-code-best/src/types/permissions.ts:16`。置信度：高。
- 过时：无明显过时源码结论，但如果文中否定某些 CC 模式，应重新参考 `claude-code-best` 的真实实现，而不是早期 map 版印象。置信度：中。
- 深度不足：作为 CN 架构评审文档，它还缺一层“按文件级别如何落到 CN”的承接。置信度：高。

### 4.12 `analysis-report/11-CN-DEVELOPMENT-STRATEGY.md`

**准确性评分：7/10**

- 错误：CN 路线判断缺乏 CN 原始源码证据闭环，这一限制应被显式写出。置信度：高。
- 遗漏：没有充分区分“来自 `src` 的老判断”和“来自 `claude-code-best` 的已验证判断”。置信度：高。
- 过时：部分叙述被 `analysis-report/13-CN-FINAL-ARCHITECTURE.md` 覆盖，但索引层没有把这层关系说清楚。证据：`analysis-report/13-CN-FINAL-ARCHITECTURE.md:3`。置信度：高。
- 深度不足：仍不足以直接指导工程实现，缺少文件级迁移顺序。置信度：高。

### 4.13 `analysis-report/12-CN-DEVELOPMENT-STRATEGY-GPT.md`

**准确性评分：6/10**

- 错误：仍然沿用“12 份文档”这一过时索引口径。证据：`analysis-report/12-CN-DEVELOPMENT-STRATEGY-GPT.md:11`。置信度：高。
- 遗漏：没有提示读者哪些判断已经被 `claude-code-best` 的真实源码证据修正。置信度：高。
- 过时：由于过度压缩，这份文档继续传播了前期报告中的统计误差与成熟度误差。证据：`claude-code-best/src/commands.ts:63`、`claude-code-best/src/services/contextCollapse/index.ts:1`。置信度：高。
- 深度不足：适合面向非技术读者，但不能作为工程决策基线。置信度：高。

### 4.14 `analysis-report/13-CN-FINAL-ARCHITECTURE.md`

**准确性评分：8/10**

- 错误：无明显与 CC 源码冲突的核心错误；主要问题是它在文档体系中的位置与索引不一致。证据：`analysis-report/13-CN-FINAL-ARCHITECTURE.md:3`、`analysis-report/00-INDEX.md:7`。置信度：高。
- 遗漏：仍应补充“每个架构块具体吸收 CC 哪些文件”的映射。证据：`claude-code-best/src/QueryEngine.ts:186`、`claude-code-best/src/constants/prompts.ts:444`、`claude-code-best/src/types/permissions.ts:16`。置信度：高。
- 过时：若沿用前文对 `best` 增量成熟度的判断，需要修正。证据：`claude-code-best/src/proactive/index.ts:1`。置信度：中高。
- 深度不足：对 ProseMirror 接入、原稿保护和写作场景特化仍可再下钻一层。置信度：中。

### 4.15 `analysis-report/14-CC-SOURCE-MIGRATION-MAP.old.md`

**准确性评分：8/10**

- 错误：没有明显硬错误，主要问题是覆盖面不够全。置信度：高。
- 遗漏：没有吸收 `claude-code-best` 中 Bridge、compact 增量、SDK 支持层、部分 native 包状态。证据：`claude-code-best/src/bridge/remoteBridgeCore.ts:15`、`claude-code-best/src/services/compact/reactiveCompact.ts`、`claude-code-best/packages/audio-capture-napi/src/index.ts:28`。置信度：中高。
- 过时：建立在较早的源码全景之上，因此对 `best` 差异没有完整覆盖。置信度：高。
- 深度不足：更像保守底稿，而不是最终迁移清单。置信度：高。

### 4.16 `analysis-report/14-CC-SOURCE-MIGRATION-MAP.md`

**准确性评分：5/10**

- 错误：分析报告说“30 个 Feature Flag”，源码实际远超这个数量。证据：`analysis-report/14-CC-SOURCE-MIGRATION-MAP.md:144`、`analysis-report/14-CC-SOURCE-MIGRATION-MAP.md:1209`、`claude-code-best/src/commands.ts:63`、`claude-code-best/src/setup.ts:295`。置信度：高。
- 错误：分析报告说“80+ hooks”，源码实际 `claude-code-best/src/hooks/` 为 147 个文件。证据：`analysis-report/14-CC-SOURCE-MIGRATION-MAP.md:1212`、`claude-code-best/src/constants/prompts.ts:128`。置信度：高。
- 错误：分析报告把多个 native 包写成 stub，源码实际 `audio-capture-napi`、`image-processor-napi`、`modifiers-napi`、`color-diff-napi` 都不是纯 stub。证据：`analysis-report/14-CC-SOURCE-MIGRATION-MAP.md:535`、`claude-code-best/packages/audio-capture-napi/src/index.ts:28`、`claude-code-best/packages/image-processor-napi/src/index.ts:1`、`claude-code-best/packages/modifiers-napi/src/index.ts:1`、`claude-code-best/packages/color-diff-napi/src/index.ts:1`。置信度：高。
- 错误：分析报告把 Coordinator 描述成“不是实验性 Feature Flag”，源码实际入口仍受 gate 和 env 控制。证据：`analysis-report/14-CC-SOURCE-MIGRATION-MAP.md:614`、`claude-code-best/src/coordinator/coordinatorMode.ts:37`。置信度：高。
- 错误：分析报告把 `best` 顶层新增目录普遍当成成熟新能力，源码实际多数是 stub。证据：`claude-code-best/src/daemon/main.ts:1`、`claude-code-best/src/environment-runner/main.ts:1`、`claude-code-best/src/proactive/index.ts:1`、`claude-code-best/src/ssh/createSSHSession.ts:1`。置信度：高。
- 遗漏：没有充分区分 `services/` 中“新能力”和“支持/镜像文件”。例如 `api 47` 个新增文件里大量是共享类型与工具，而不是 47 个独立能力。置信度：高。
- 过时：虽然文件名是“最新综合版”，但仍混用了 `src/` 与 `best` 的判断方式，没有把 verified baseline 的成熟度与 stub 状态拉开。置信度：高。
- 深度不足：标题叫“迁移地图”，但仍缺少可执行的“整文件复制 / 结构迁移 / 模式参考 / 排除列表”四分法。置信度：高。

### 4.17 `analysis-report/文章原文内容.md`

**评分：不参与评分**

- 该文件是参考材料，不承担工程判断责任。
- 建议继续保留，但应明确为“外部上下文”，不能与源码审计文档同层级引用。置信度：高。

---

## 5. 文件编排评估

### 5.1 信息重复

存在两类明显重复：

- CC 核心事实在 `analysis-report/01-CC-ARCHITECTURE.md`、`analysis-report/02-CC-CORE-ENGINE.md`、`analysis-report/03-CC-AI-PATTERNS.md`、`analysis-report/05-CC-ENGINEERING.md`、`analysis-report/14-CC-SOURCE-MIGRATION-MAP.md` 之间反复出现，但没有单一事实基线。置信度：高。
- CN 策略层在 `analysis-report/10-CN-OPENSPEC-DEEP-ANALYSIS.md`、`analysis-report/11-CN-DEVELOPMENT-STRATEGY.md`、`analysis-report/12-CN-DEVELOPMENT-STRATEGY-GPT.md`、`analysis-report/13-CN-FINAL-ARCHITECTURE.md` 之间重复度很高。置信度：高。

### 5.2 逻辑断层

- 当前阅读路径 `01 -> 14` 不能形成稳定闭环，因为 `analysis-report/00-INDEX.md` 没有正确纳入 `13`、`14`、`14.old`，读者会在“CC 核心事实”和“CN 最终决策”之间跳空。证据：`analysis-report/00-INDEX.md:7`、`analysis-report/13-CN-FINAL-ARCHITECTURE.md:3`。置信度：高。
- `analysis-report/14-CC-SOURCE-MIGRATION-MAP.old.md` 与 `analysis-report/14-CC-SOURCE-MIGRATION-MAP.md` 并存，但没有告知读者哪一份更保守、哪一份更激进，也没有标出应信哪一份。置信度：高。

### 5.3 缺失主题

以下主题没有被任何文件完整覆盖：

- 基于 `claude-code-best` 的“事实基线”文档。置信度：高。
- CC 测试策略、验证流程和“什么才算完成”的工程 gate。证据：`claude-code-best/src/constants/prompts.ts:232`、`claude-code-best/src/constants/prompts.ts:242`。置信度：中高。
- 完整安全模型分析，尤其是 Permission + file history + shell/tool gate 的协同。证据：`claude-code-best/src/types/permissions.ts:16`、`claude-code-best/src/utils/fileHistory.ts:198`、`claude-code-best/src/tools/BashTool/bashPermissions.ts`。置信度：高。
- `claude-code-best` 增量盘点附录，包括 hooks 清单、Feature Flag 清单、`services/` 差集、新模块成熟度状态。置信度：高。
- 报告维护机制：哪个文件是事实源、哪个是策略源、哪个是外部参考。置信度：高。

### 5.4 编排建议

建议重组为以下层次：

1. **事实基线层**：`01`、`02`、`03`、`04`、`05`，再新增一份 “verified baseline / delta inventory” 文档。  
2. **迁移判断层**：保留 `07`，重写 `14`，删除或归档 `14.old`。  
3. **CN 决策层**：合并 `11` 与 `12`，保留 `13` 为唯一最终决策文档，`10` 作为问题诊断前置。  
4. **导航层**：重写 `00-INDEX.md`，明确每份文档的角色。  

### 5.5 `00-INDEX.md` 是否仍准确

不准确。它的导航能力已经失效，且会继续传播“12 份文档”“旧结论仍有效”的错觉。应立即更新。置信度：高。

---

## 6. CN 最终代码迁移方案

### 6.1 迁移原则

1. **不要再把 `src/` 当成默认复制源**。凡是 `claude-code-best/` 与 `src/` 存在同名文件，应以 `claude-code-best/` 为准。`src/` 只在 `best` 缺失且还原版更完整时作为补充参考。置信度：高。
2. **迁移的对象不是“CLI 产品形态”，而是“会话级 Agent 核心骨架”**。CN 应迁移 loop、prompt、permission、compression、budget、cost，不应迁移 CLI/Ink、Bridge、Bash/Git 工具族。置信度：高。
3. **凡是当前为 stub 的新增目录，一律不进入 P0/P1**。置信度：高。

### 6.2 必须迁移的代码

> 说明：下表中的“源文件”默认以 `claude-code-best/` 为实施基线；如果你坚持只从 `src/` 中取代码，应选取同路径文件，但最终仍建议以 `claude-code-best` 版本覆盖。

| 源文件 | 迁移方式 | 为什么必须迁移 | 建议落位到 CN | 适配工作 | 优先级 | 工作量 | 置信度 |
|---|---|---|---|---|---|---|---|
| `claude-code-best/src/QueryEngine.ts` | 结构迁移 | 提供“跨 turn 持久状态 + submitMessage 入口”的外壳，CN 需要同等层级的 `WritingQueryEngine` | `src/agent/core/WritingQueryEngine.ts` | 去掉 CLI / SDK 兼容外壳，改接 Electron 事件与 ProseMirror 文档上下文 | P0 | XL | 高 |
| `claude-code-best/src/query.ts` | 结构迁移 | 这是 CC 最核心的 query loop，实现了 state、budget、prefetch、fallback、tool loop、compaction 协作 | `src/agent/core/writingQueryLoop.ts` | 将 coding tools 替换为写作 skill/tool；将消息类型扩展为章节/卡片/批注上下文 | P0 | XL | 高 |
| `claude-code-best/src/constants/prompts.ts` | 结构迁移 | 提供静态七层 + 动态 boundary + session guidance 的 prompt 组装框架 | `src/agent/prompt/systemPrompt.ts` | 保留组装顺序，重写全部写作领域指令；替换工程术语为创作术语 | P0 | XL | 高 |
| `claude-code-best/src/context.ts` | 结构迁移 | 定义 system context / user context 的分层与 memoization | `src/agent/context/sessionContext.ts` | 用“项目设定/人物/世界观/当前文档状态/风格卡”替换 Git / CLAUDE.md 语义 | P0 | L | 高 |
| `claude-code-best/src/Tool.ts` | 结构迁移 | 提供 tool 类型系统、fail-closed 默认值、并发安全与只读分离 | `src/agent/tools/Tool.ts` | 让 CN 的 `SkillStep`、`EditorAction`、`ResearchAction` 共享一套安全默认值 | P0 | L | 高 |
| `claude-code-best/src/services/tools/toolOrchestration.ts` | 结构迁移 | 提供基于并发安全的批处理调度 | `src/agent/tools/toolOrchestration.ts` | 把 File/Grep/Bash 替换成写作技能、检索和编辑动作 | P1 | M | 高 |
| `claude-code-best/src/services/tools/StreamingToolExecutor.ts` | 结构迁移 | 提供流式工具执行、结果保序、错误联动取消 | `src/agent/tools/StreamingToolExecutor.ts` | 用于长文本生成、检索、校对、资料拉取等流式子任务 | P1 | L | 高 |
| `claude-code-best/src/services/compact/autoCompact.ts` | 结构迁移 | 提供自动压缩阈值、warning/error/blocking limit、失败熔断器 | `src/agent/context/autoCompact.ts` | 把摘要目标改成“创作记忆摘要”，同时校正中文 token 估算 | P0 | L | 高 |
| `claude-code-best/src/query/tokenBudget.ts` | 近乎直接复制 | 为 token 预算与任务预算提供统一口径 | `src/agent/context/tokenBudget.ts` | 替换模型上下文窗口参数，加入中文系数 | P0 | S | 高 |
| `claude-code-best/src/services/SessionMemory/sessionMemoryUtils.ts` | 结构迁移 | 提供 session memory 的初始化门槛与增量更新门槛 | `src/agent/memory/sessionMemoryUtils.ts` | 将内容来源改为写作过程摘要、研究笔记、风格演化记忆 | P1 | M | 高 |
| `claude-code-best/src/types/permissions.ts` | 结构迁移 | 定义 Permission mode、rule source、update destination，是写作原稿保护的根 | `src/agent/permissions/types.ts` | 保留 mode 与 rule 模型，改写行为说明与 UI 文案 | P0 | M | 高 |
| `claude-code-best/src/utils/fileHistory.ts` | 结构迁移 | 修改前快照是创作产品的生命线，不应缺席 | `src/agent/permissions/fileHistory.ts` | 将“文件快照”扩展为“文档版本/章节版本快照”并对接 ProseMirror state | P0 | L | 高 |
| `claude-code-best/src/cost-tracker.ts` | 近乎直接复制 | 会话成本累计、日志化、跨 turn 汇总可直接复用 | `src/agent/telemetry/costTracker.ts` | 替换模型表与产品事件名 | P1 | S | 高 |
| `claude-code-best/src/utils/modelCost.ts` | 近乎直接复制 | 模型成本表与估算逻辑可直接复用骨架 | `src/agent/telemetry/modelCost.ts` | 仅需替换实际模型列表与价格 | P1 | S | 高 |
| `claude-code-best/src/state/store.ts` | 直接复制 | 这是整个仓库里少数可以原样复用的极简状态容器 | `src/state/store.ts` | 小改命名即可 | P1 | S | 高 |

### 6.3 需要参考但不直接复制的代码

| 源文件 | 学什么 | CN 对应实现 | 为什么不直接复制 | 优先级 | 工作量 | 置信度 |
|---|---|---|---|---|---|---|
| `claude-code-best/src/utils/forkedAgent.ts` | cache-safe fork 参数、子链路 usage 统计、父子 prompt cache 共享 | `src/agent/forks/forkedWriter.ts` | CN 需要写作专用子代理，而不是照搬 coding fork | P2 | L | 高 |
| `claude-code-best/src/tools/AgentTool/forkSubagent.ts` | fork 的启动协议与上下文约束 | `src/agent/forks/launchSubtask.ts` | 现有实现强绑定 coding agent 语义 | P2 | M | 中高 |
| `claude-code-best/src/coordinator/coordinatorMode.ts` | 阶段化 orchestrator prompt：Research / Synthesis / Implementation / Verification | `src/agent/planner/coordinatorPrompt.ts` | 当前入口受 gate 控制，且 CC 的 worker UX 不适合直接照搬到写作产品 | P2 | L | 高 |
| `claude-code-best/src/memdir/memdir.ts` | memory prompt 装载与文件化记忆目录 | `src/agent/memory/projectMemory.ts` | CN 未必需要沿用文件系统即记忆系统的 UX | P2 | M | 中高 |
| `claude-code-best/src/services/extractMemories/extractMemories.ts` | 后台记忆提取器的受限工具沙箱 | `src/agent/memory/extractMemories.ts` | CN 需要面向写作内容重写工具白名单与抽取策略 | P2 | L | 高 |
| `claude-code-best/src/services/skillSearch/featureCheck.ts` | “需要时再发现技能”的思路 | `src/agent/skills/skillDiscovery.ts` | 当前是实验性方向，且 `best` 中技能检索仍不算稳定 | P3 | M | 中高 |
| `claude-code-best/src/plugins/builtinPlugins.ts`、`claude-code-best/src/utils/plugins/pluginLoader.ts` | 插件描述、安装、装载流程 | `src/plugins/` | CN V1 不应该引入插件生态复杂度 | P3 | L | 中高 |
| `claude-code-best/packages/audio-capture-napi/src/index.ts` | 语音输入的系统调用策略 | `src/native/audio.ts` | 只有在明确做语音写作后才需要 | P3 | M | 高 |
| `claude-code-best/packages/image-processor-napi/src/index.ts` | 剪贴板图像 / 截图输入 | `src/native/image.ts` | 与当前文本创作主路径无直接关系 | P3 | M | 高 |

### 6.4 完全不需要迁移的代码

| 源文件 | 排除理由 | 优先级 | 置信度 |
|---|---|---|---|
| `claude-code-best/src/bridge/remoteBridgeCore.ts` | 这是远程代码会话桥接，不是写作工作台的核心问题 | 不迁移 | 高 |
| `claude-code-best/src/bridge/replBridgeTransport.ts` | 绑定 CCR v2 / SSE / JWT，会给 CN 带来无意义复杂度 | 不迁移 | 高 |
| `claude-code-best/src/bridge/codeSessionApi.ts` | 绑定 `/bridge` 远程会话 API，不适合当前 CN | 不迁移 | 高 |
| `claude-code-best/src/main.tsx` | CLI/Ink 主入口，不适合 Electron + ProseMirror | 不迁移 | 高 |
| `claude-code-best/src/replLauncher.tsx` | REPL/TUI 启动器，不适合 CN | 不迁移 | 高 |
| `claude-code-best/src/ink.ts` | Ink 运行时适配，不适合 CN | 不迁移 | 高 |
| `claude-code-best/src/commands.ts` | 这是 CLI 命令注册表，不是 CN 的产品骨架 | 不迁移 | 高 |
| `claude-code-best/src/tools/BashTool/prompt.ts`、`claude-code-best/src/tools/BashTool/bashPermissions.ts` | BashTool 属于 coding agent 工具，不属于创作主路径 | 不迁移 | 高 |
| `claude-code-best/src/tools/FileReadTool/FileReadTool.ts`、`claude-code-best/src/tools/FileEditTool/FileEditTool.ts` | 可以学习接口，不要直接复用 coding 场景工具实现 | 不迁移 | 高 |
| `claude-code-best/src/daemon/main.ts` | 当前为 stub | 不迁移 | 高 |
| `claude-code-best/src/environment-runner/main.ts` | 当前为 stub | 不迁移 | 高 |
| `claude-code-best/src/jobs/classifier.ts` | 当前为 stub | 不迁移 | 高 |
| `claude-code-best/src/proactive/index.ts` | 当前为 stub | 不迁移 | 高 |
| `claude-code-best/src/self-hosted-runner/main.ts` | 当前为 stub | 不迁移 | 高 |
| `claude-code-best/src/ssh/createSSHSession.ts`、`claude-code-best/src/ssh/SSHSessionManager.ts` | 当前为 stub，且与 CN 主路径无关 | 不迁移 | 高 |
| `claude-code-best/packages/url-handler-napi/src/index.ts` | 纯 stub | 不迁移 | 高 |
| `claude-code-best/packages/@ant/computer-use-mcp/src/index.ts` | 纯 stub | 不迁移 | 高 |

### 6.5 迁移优先级

| 优先级 | 必做项 | 说明 | 置信度 |
|---|---|---|---|
| P0 | `QueryEngine.ts`、`query.ts`、`constants/prompts.ts`、`context.ts`、`Tool.ts`、`types/permissions.ts`、`utils/fileHistory.ts`、`services/compact/autoCompact.ts`、`query/tokenBudget.ts` | 不迁这些，CN 无法获得 CC 级别的 Agent 会话骨架、原稿保护与上下文治理能力 | 高 |
| P1 | `services/tools/toolOrchestration.ts`、`services/tools/StreamingToolExecutor.ts`、`services/SessionMemory/sessionMemoryUtils.ts`、`cost-tracker.ts`、`utils/modelCost.ts`、`state/store.ts` | 明显提升 CN 的质量、稳定性和可观测性 | 高 |
| P2 | `utils/forkedAgent.ts`、`coordinator/coordinatorMode.ts`、`services/extractMemories/extractMemories.ts`、`memdir/memdir.ts` | 对写作工作流很有价值，但不该先于 P0/P1 | 高 |
| P3 | `services/skillSearch/featureCheck.ts`、插件体系、音频/图像 native 支持 | 锦上添花，等待主骨架稳定后再考虑 | 高 |

### 6.6 迁移后的适配工作

| 模块 | 关键适配 | 说明 | 工作量 | 置信度 |
|---|---|---|---|---|
| Query loop | 替换 coding tool 集合 | 将 File/Bash/Grep/Glob 替换为写作操作、研究检索、文档结构编辑、事实核查 | XL | 高 |
| Prompt system | 重写全部领域指令 | 保留组装层次，不保留软件工程文案 | XL | 高 |
| Permission | 从“文件修改”升级为“文档/章节/块级修改” | 对接 ProseMirror transaction、selection 和 version snapshot | L | 高 |
| AutoCompact / SessionMemory | 中文 token 估算与叙事摘要 | CN 不能直接沿用英文代码任务摘要逻辑 | L | 高 |
| Tool orchestration | 重新定义 `isConcurrencySafe` | 写作技能的并发边界与 coding tools 不同 | M | 高 |
| Forked agent | 重写为写作子任务 | 用于多候选续写、资料整合、风格校对，而不是代码实现/验证 | L | 中高 |

---

## 7. 最终建议

1. 立即重写 `analysis-report/00-INDEX.md`，让它真实反映当前文档体系。置信度：高。  
2. 将 `analysis-report/14-CC-SOURCE-MIGRATION-MAP.old.md` 与 `analysis-report/14-CC-SOURCE-MIGRATION-MAP.md` 合并成一份新的“事实校准后迁移地图”，删除错误数字与 stub 误判。置信度：高。  
3. 将本文件作为新的总审计结论使用；后续所有 CN 迁移工作都应以本文件中的“P0/P1 文件级清单”作为第一优先级。置信度：高。  
4. 在拿到 CN 原始仓库后，立刻补做一次“CN 源码实审版”审计，把当前文档中所有 CN 假设性判断替换为逐文件证据。置信度：高。
