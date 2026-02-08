# Knowledge Graph Specification Delta

## Change: knowledge-graph-p2-auto-recognition-ai-utilization

### Dependency

本 change 依赖 `knowledge-graph-p1-visualization-extended-views` 已合并到控制面 `main`。未满足依赖前不得进入实现阶段。

### Requirement: 自动识别与建议添加 [MODIFIED]

KG-3 必须在 autosave 后异步执行实体识别，并将识别结果以建议卡形式推送到 KG 面板。

触发与执行契约：

- 触发条件：文档 autosave 完成后（主进程后台异步）
- 执行约束：不阻塞编辑器输入与保存流程
- 并发上限：4（超限任务排队并支持取消）
- LLM 调用策略：通过 AI Service mock 适配层执行识别，测试中禁止真实 LLM 配额

建议 IPC 契约：

| IPC 通道                       | 通信模式          | 用途                   |
| ------------------------------ | ----------------- | ---------------------- |
| `knowledge:suggestion:new`     | Push Notification | 推送新识别建议         |
| `knowledge:suggestion:accept`  | Request-Response  | 接受建议并写入 KG      |
| `knowledge:suggestion:dismiss` | Fire-and-Forget   | 忽略建议并记录会话去重 |

去重策略：

- 同一编辑会话内，被 `dismiss` 的候选实体不再重复推送。
- 会话边界以 `sessionId` 切分，不跨会话持久抑制。

#### Scenario: KG3-R1-S1 autosave 后自动识别新角色 [MODIFIED]

- **假设** 用户编辑文本并触发 autosave
- **当** 后台识别到新角色「林小雨」且该实体不存在于当前项目
- **则** 主进程通过 `knowledge:suggestion:new` 推送建议卡
- **并且** 编辑器继续可编辑，不等待识别完成

#### Scenario: KG3-R1-S2 用户接受建议并创建实体 [MODIFIED]

- **假设** KG 面板显示建议卡
- **当** 用户点击「添加到图谱」
- **则** 系统调用 `knowledge:suggestion:accept` 创建实体
- **并且** 默认填充名称与实体类型
- **并且** 跳转实体详情页补充属性

#### Scenario: KG3-R1-S3 用户忽略建议后同会话不重复推送 [MODIFIED]

- **假设** 建议卡显示新地点「废弃仓库」
- **当** 用户点击「忽略」
- **则** 系统调用 `knowledge:suggestion:dismiss` 记录去重
- **并且** 同一 `sessionId` 内不再推送该候选实体

#### Scenario: KG3-R1-S4 识别服务不可用时静默降级 [MODIFIED]

- **假设** 识别依赖的 AI mock 适配层返回服务不可用
- **当** autosave 触发识别
- **则** 流程静默失败（不弹 Toast）并记录结构化日志
- **并且** 用户仍可手动创建实体

### Requirement: AI 续写中的知识图谱利用 [MODIFIED]

KG-3 必须定义 KG 数据注入 Rules 层的接口契约，并通过 mock 验证注入行为。

相关实体查询契约：

| IPC 通道                   | 通信模式         | 用途                                 |
| -------------------------- | ---------------- | ------------------------------------ |
| `knowledge:query:relevant` | Request-Response | 按语义相似度或关键词匹配筛选相关实体 |
| `knowledge:query:byIds`    | Request-Response | 批量获取实体详情                     |

Rules 注入接口（CE 未落地阶段的 mock contract）：

```typescript
interface KgRulesInjectionRequest {
  projectId: string;
  documentId: string;
  excerpt: string;
  traceId: string;
  maxEntities?: number;
}

interface KgRulesInjectionResult {
  ok: true;
  data: {
    injectedEntities: Array<{
      id: string;
      name: string;
      type: "character" | "location" | "event" | "item" | "faction";
      attributes: Record<string, string>;
      relationsSummary: string[];
    }>;
    source: "kg-rules-mock";
  };
} | {
  ok: false;
  error: { code: string; message: string; traceId: string };
};
```

注入优先级：

- 与当前编辑内容相关实体优先注入（`knowledge:query:relevant` 排序结果）。
- 若角色设定缺失，仅注入已知字段，禁止补造未定义背景。

#### Scenario: KG3-R2-S1 续写时注入角色设定 [MODIFIED]

- **假设** KG 中角色「林远」存在完整设定
- **当** 用户续写文本涉及「林远」
- **则** 系统先调用 `knowledge:query:relevant`，再通过 `KgRulesInjectionResult` 生成 Rules 块
- **并且** 注入内容包含名称、类型、关键属性、关系摘要

#### Scenario: KG3-R2-S2 未填写设定时避免胡编 [MODIFIED]

- **假设** KG 中角色仅有名称，无属性与描述
- **当** 续写涉及该角色
- **则** 注入层仅传递已定义字段
- **并且** 输出约束提示 AI 不得编造未定义背景

#### Scenario: KG3-R2-S3 KG 为空时续写降级 [MODIFIED]

- **假设** 当前项目 KG 为空
- **当** 用户触发续写
- **则** KG 注入结果为空集合（`ok: true`）
- **并且** 续写流程继续，不返回错误

### Requirement: 模块级可验收标准（KG-3 适用子集） [MODIFIED]

KG-3 覆盖范围必须满足：

- 识别任务执行不阻塞 autosave 主流程
- 并发识别任务上限 4，超限进入排队背压
- `knowledge:query:relevant` 维持 p95 < 250ms 基线
- LLM 依赖链路全部可 mock，禁止真实配额调用

#### Scenario: KG3-A-S1 并发识别背压不影响手动操作 [MODIFIED]

- **假设** 瞬时识别任务达到 20 个
- **当** 系统执行并发控制
- **则** 仅 4 个任务并行，其余进入队列
- **并且** 手动实体创建流程不受阻塞

### Requirement: 异常与边界覆盖矩阵（KG-3 相关） [MODIFIED]

KG-3 必须覆盖：网络/IO 失败、并发冲突、权限/安全。

#### Scenario: KG3-X-S1 识别或相关实体查询失败时降级 [MODIFIED]

- **假设** 识别服务调用失败或 `knowledge:query:relevant` 查询失败
- **当** 自动识别或注入流程执行
- **则** 返回可判定错误码（如 `KG_RECOGNITION_UNAVAILABLE` / `KG_RELEVANT_QUERY_FAILED`）
- **并且** 自动识别路径静默降级，续写路径回退为空注入

#### Scenario: KG3-X-S2 识别并发超限触发排队与取消 [MODIFIED]

- **假设** 并发任务数超过 4
- **当** 新识别任务进入队列
- **则** 系统返回排队状态并支持取消
- **并且** 队列任务不会饿死且保序执行

#### Scenario: KG3-X-S3 跨项目实体访问被阻断 [MODIFIED]

- **假设** 请求使用 `projectId=A` 但尝试读取 `projectId=B` 的实体
- **当** 执行 `knowledge:query:relevant` 或注入构建
- **则** 返回 `KG_SCOPE_VIOLATION`
- **并且** 写入安全日志并拒绝注入

## Out of Scope

- Context Engine 实际 Rules 层注入编排。
- AI Service 真实 provider 调用。
- Memory System 交互联动。
