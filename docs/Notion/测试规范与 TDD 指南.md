# 测试规范与 TDD 指南

本文档定义 CreoNow 项目的测试策略、TDD 工作流程、各层级测试要求及编写规范。所有参与开发的 AI Agent 必须严格遵守本文档中的规则。

---

# 一、TDD（测试驱动开发）工作流程

## 1.1 核心循环

TDD 遵循严格的三步循环，不得跳过任何一步：

1. **Red（红灯）**：先编写一个描述期望行为的测试用例。此时测试必然失败，因为功能尚未实现。如果测试在没有实现代码的情况下就通过了，说明测试本身有问题，必须修正。
2. **Green（绿灯）**：编写最少量的实现代码，使测试通过。此阶段不追求代码优雅，只追求测试通过。
3. **Refactor（重构）**：在测试全部通过的保护下，重构实现代码——消除重复、改善命名、优化结构。重构后必须再次运行测试，确认全部通过。

完成一轮循环后，进入下一个测试用例，重复上述过程。

## 1.2 Agent 执行 TDD 的具体步骤

每当 Agent 收到一个功能实现任务时，必须按以下顺序执行：

1. 阅读需求规格（Spec），明确函数/模块的输入、输出、边界条件和错误情况
2. 根据规格编写测试文件，包含所有测试用例（正常路径、边界情况、错误路径）
3. 运行测试，确认全部失败（Red）
4. 编写实现代码，逐个让测试通过（Green）
5. 所有测试通过后，审视实现代码，进行重构（Refactor）
6. 再次运行全部测试，确认通过
7. 输出最终的测试文件和实现文件

**禁止行为**：

- 禁止先写实现再补测试
- 禁止编写永远通过的测试（空断言、断言 truthy 常量等）
- 禁止为了提高覆盖率而编写不验证任何行为的测试
- 禁止在测试中硬编码实现细节（如依赖内部变量名、私有方法调用顺序）

---

# 二、测试编写通用规范

## 2.1 命名规范

测试名称必须清晰描述：被测行为 + 前置条件 + 期望结果。

```tsx
// 正确示范
it('should return trimmed context when total tokens exceed budget limit')
it('should throw InvalidEntityError when entity type is not recognized')
it('should fallback to rule-based strategy when embedding service is unavailable')

// 错误示范
it('test context engine')        // 太模糊
it('works')                      // 无信息量
it('should work correctly')      // 没有描述具体行为
```

## 2.2 结构规范（AAA 模式）

每个测试用例必须遵循 Arrange-Act-Assert 三段式：

```tsx
it('should allocate higher budget to immediate layer when total is limited', () => {
  // Arrange：准备输入和依赖
  const config = { totalBudget: 500, layers: ['rules', 'settings', 'retrieved', 'immediate'] }

  // Act：执行被测行为
  const result = allocateTokenBudget(config)

  // Assert：验证结果
  expect(result.immediate).toBeGreaterThan(result.rules)
  expect(result.immediate).toBeGreaterThan(result.settings)
})
```

段与段之间用空行分隔。不要在一个测试中混合多个 Act 和 Assert。

## 2.3 独立性要求

- 每个测试必须独立运行，不依赖其他测试的执行顺序
- 每个测试在运行前后不得残留状态（数据库记录、文件、全局变量）
- 使用 `beforeEach` / `afterEach` 进行环境初始化和清理
- 禁止测试之间共享可变状态

## 2.4 确定性要求

- 同一测试在同一代码上运行 N 次，必须产生完全相同的结果
- 禁止依赖系统时间、随机数、网络请求等不确定因素
- 如需时间敏感测试，使用 fake timer（如 `vi.useFakeTimers()`）
- 如需随机数，使用固定种子

## 2.5 断言规范

- 每个测试必须包含至少一个有意义的断言
- 优先使用具体断言而非宽泛断言：

```tsx
// 正确：具体断言
expect(result.status).toBe('completed')
expect(result.entities).toHaveLength(3)
expect(result.entities[0].name).toBe('Lin Daiyu')

// 避免：宽泛断言
expect(result).toBeTruthy()
expect(result.entities.length).toBeGreaterThan(0)
```

- 错误路径测试必须验证错误类型和错误信息：

```tsx
expect(() => allocate({ total: -1 })).toThrow(InvalidBudgetError)
expect(() => allocate({ total: -1 })).toThrow('Budget must be a positive number')
```

## 2.6 测试覆盖的三条路径

每个被测函数/方法至少覆盖以下三类情况：

1. **正常路径（Happy Path）**：标准输入，预期输出
2. **边界情况（Edge Cases）**：空数组、零值、极大值、单元素、刚好等于阈值
3. **错误路径（Error Path）**：无效输入、依赖服务不可用、超时、格式错误

---

# 三、架构分层与测试分层的关系

## 3.1 CreoNow 架构分层

CreoNow 作为 Electron 桌面应用，架构分为三层：

| **架构层** | **位置** | **运行环境** | **包含内容** |
| --- | --- | --- | --- |
| 前端（渲染层） | src/renderer/ | Electron 渲染进程 | React 组件、TipTap 编辑器、UI 状态管理（Zustand store）、用户交互逻辑 |
| API（通信层） | src/ipc/ | 进程间桥梁 | IPC 通道定义、消息类型、序列化/反序列化、参数校验 |
| 后端（业务层） | src/main/ | Electron 主进程 | 上下文引擎、知识图谱、记忆系统、技能系统、SQLite DAO、LLM 调用 |

## 3.2 测试分层

测试分为四个层级，形成金字塔结构（底层多而快，顶层少而慢）：

| **测试层级** | **目的** | **数量级** | **速度要求** | **运行时机** |
| --- | --- | --- | --- | --- |
| 单元测试 | 验证单个函数/类/模块的内部逻辑 | 数百个 | 全套 30 秒内 | 每次保存 |
| 集成测试 | 验证多个模块之间的协作和数据流 | 数十个 | 全套 2 分钟内 | 每次提交 |
| 端到端测试 | 验证完整的用户操作流程 | 十余个 | 全套 10 分钟内 | 每次合并 / 日构建 |
| AI 输出质量测试 | 验证 LLM 输出的质量和一致性 | 数十个 | 取决于 API 响应 | Prompt 或上下文逻辑变更时 |

## 3.3 架构层 x 测试层 交叉矩阵

| **架构层 \ 测试层** | **单元测试** | **集成测试** | **端到端测试** | **AI Eval** |
| --- | --- | --- | --- | --- |
| 前端（渲染层） | 需要 | 需要 | 需要 | 不涉及 |
| API（通信层） | 需要 | 需要 | 需要 | 不涉及 |
| 后端（业务层） | 需要 | 需要 | 需要 | 需要 |

---

# 四、各测试层级详细规范

## 4.1 单元测试

### 定义

测试单个函数、方法或类的行为，完全隔离外部依赖。

### 隔离要求

- 所有外部依赖（数据库、文件系统、网络请求、LLM API、Electron IPC）必须使用 mock 或 stub 替代
- 使用 `vi.mock()` 模拟模块级依赖，使用 `vi.fn()` 创建函数级 stub
- 被测模块应通过依赖注入接收外部依赖，而非直接导入，以便于测试替换

### 覆盖率要求

覆盖率按模块重要性分级：

| **模块类别** | **覆盖率要求** | **示例** |
| --- | --- | --- |
| 核心业务逻辑 | 不低于 90% | TokenBudgetAllocator, ContextLayerManager, KnowledgeGraphQuery, MemoryDecayCalculator |
| 一般业务模块 | 不低于 80% | DAO 层, SkillExecutor, VersionSnapshotManager |
| UI 组件和胶水代码 | 不低于 60% | React 展示组件, Provider 包裹层, 配置文件加载 |

说明：覆盖率是下限而非目标。追求的是行为被充分验证，而非数字达标。从 80% 到 100% 的边际成本极高，且容易产生脆弱测试（测试实现细节而非行为，一重构就失败）。核心模块设定 90% 而非 100%，是因为剩余部分通常是防御性异常处理和框架样板代码，测试价值低。

### 各架构层的单元测试要求

**前端层单元测试：**

- 使用 React Testing Library 测试组件行为（不测试实现细节）
- 测试用户交互：点击、输入、键盘事件触发的状态变化
- 测试条件渲染：不同 props / state 下的 UI 输出
- Zustand store 的 action 和 selector 独立测试
- 禁止测试 CSS 类名、DOM 结构等实现细节

```tsx
// 前端单元测试示例：工具栏按钮
describe('SkillToolbarButton', () => {
  it('should trigger skill execution when clicked and editor has selection', async () => {
    const onExecute = vi.fn()
    render(<SkillToolbarButton skillId="rewrite" onExecute={onExecute} hasSelection={true} />)
    
    await userEvent.click(screen.getByRole('button', { name: /改写/ }))
    
    expect(onExecute).toHaveBeenCalledWith('rewrite')
  })

  it('should be disabled when editor has no selection', () => {
    render(<SkillToolbarButton skillId="rewrite" onExecute={vi.fn()} hasSelection={false} />)
    
    expect(screen.getByRole('button', { name: /改写/ })).toBeDisabled()
  })
})
```

**API 层单元测试：**

- 测试 IPC 消息的序列化和反序列化
- 测试参数校验逻辑：缺少必填字段、类型错误、值越界
- 测试错误消息的格式化

```tsx
// API 层单元测试示例：IPC 参数校验
describe('validateEntityQuery', () => {
  it('should pass when all required fields are present and valid', () => {
    const query = { type: 'character', projectId: 'proj-001' }
    expect(() => validateEntityQuery(query)).not.toThrow()
  })

  it('should reject when entity type is not in allowed list', () => {
    const query = { type: 'unknown_type', projectId: 'proj-001' }
    expect(() => validateEntityQuery(query)).toThrow(InvalidEntityTypeError)
  })

  it('should reject when projectId is empty string', () => {
    const query = { type: 'character', projectId: '' }
    expect(() => validateEntityQuery(query)).toThrow('projectId must not be empty')
  })
})
```

**后端层单元测试：**

- 核心算法必须有详尽的单元测试（Token 分配、上下文裁剪、记忆衰减、知识图谱遍历）
- SQLite 操作使用内存数据库（`:memory:`）或 mock
- LLM API 调用必须 mock，返回预设的固定响应

```tsx
// 后端单元测试示例：Token 预算分配
describe('TokenBudgetAllocator', () => {
  it('should distribute tokens across all four layers within budget', () => {
    const result = allocate({ total: 4000 })
    const sum = result.rules + result.settings + result.retrieved + result.immediate
    expect(sum).toBeLessThanOrEqual(4000)
    expect(sum).toBeGreaterThan(0)
  })

  it('should guarantee minimum allocation for immediate layer', () => {
    const result = allocate({ total: 200 })
    expect(result.immediate).toBeGreaterThanOrEqual(100)
  })

  it('should throw when budget is zero', () => {
    expect(() => allocate({ total: 0 })).toThrow(InvalidBudgetError)
  })

  it('should throw when budget is negative', () => {
    expect(() => allocate({ total: -500 })).toThrow(InvalidBudgetError)
  })
})
```

---

## 4.2 集成测试

### 定义

测试两个或多个模块协同工作时的行为，验证模块之间的接口契约和数据流转。

### 隔离边界

- 可以使用真实的 SQLite 数据库（内存模式）
- 可以使用真实的模块组合
- 必须 mock 的：外部网络请求（LLM API）、文件系统写入、系统级 API
- IPC 通信可以使用真实的 Electron IPC（如果在 Electron 测试环境中）或模拟 IPC 层

### 各架构层的集成测试要求

**后端层集成测试（重点）：**

```tsx
// 知识图谱 + 上下文引擎集成测试
describe('KnowledgeGraph + ContextEngine integration', () => {
  let db: Database
  let kg: KnowledgeGraph
  let contextEngine: ContextEngine

  beforeEach(async () => {
    db = new Database(':memory:')
    kg = new KnowledgeGraph(db)
    contextEngine = new ContextEngine({ knowledgeGraph: kg, llmClient: mockLlmClient })
    
    await kg.addEntity({ type: 'character', name: 'Lin Daiyu', traits: ['melancholic', 'poetic'] })
    await kg.addEntity({ type: 'location', name: 'Grand View Garden' })
    await kg.addRelation({ from: 'Lin Daiyu', to: 'Grand View Garden', type: 'resides_in' })
  })

  afterEach(() => db.close())

  it('should include related entities in retrieved context layer', async () => {
    const context = await contextEngine.buildContext({
      currentText: 'Lin Daiyu walked alone through the garden...',
      projectId: 'test-project'
    })
    
    expect(context.retrieved).toContainEqual(
      expect.objectContaining({ name: 'Lin Daiyu', type: 'character' })
    )
    expect(context.retrieved).toContainEqual(
      expect.objectContaining({ name: 'Grand View Garden', type: 'location' })
    )
  })

  it('should respect token budget when injecting graph data', async () => {
    const context = await contextEngine.buildContext({
      currentText: 'test',
      projectId: 'test-project',
      budgetOverride: { retrieved: 50 }
    })
    
    const retrievedTokens = countTokens(JSON.stringify(context.retrieved))
    expect(retrievedTokens).toBeLessThanOrEqual(50)
  })
})
```

**API 层契约测试：**

契约测试验证前后端对 IPC 消息格式的理解是否一致。

```tsx
// IPC 契约测试
describe('IPC Contract: entity:query', () => {
  it('should accept EntityQuery and return Entity array', async () => {
    const request: EntityQuery = { type: 'character', projectId: 'proj-001' }
    const response = await ipcInvoke('entity:query', request)
    
    expect(Array.isArray(response)).toBe(true)
    response.forEach(entity => {
      expect(entity).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          type: expect.any(String),
          name: expect.any(String),
        })
      )
    })
  })

  it('should return IpcError with code INVALID_PARAMS when type is missing', async () => {
    const request = { projectId: 'proj-001' }
    const response = await ipcInvoke('entity:query', request)
    
    expect(response.error).toBeDefined()
    expect(response.error.code).toBe('INVALID_PARAMS')
  })
})
```

**前端层集成测试：**

```tsx
// 侧边栏 + 编辑器联动
describe('Sidebar + Editor integration', () => {
  it('should load chapter content in editor when sidebar item is clicked', async () => {
    render(<AppShell />, { wrapper: TestProviders })
    
    await userEvent.click(screen.getByText('Chapter 1'))
    
    await waitFor(() => {
      expect(screen.getByTestId('editor-content')).toHaveTextContent('It was a dark and stormy night')
    })
  })
})
```

---

## 4.3 端到端测试（E2E）

### 定义

模拟真实用户操作，验证从 UI 交互到数据持久化的完整流程。

### 工具选型

使用 Playwright 配合 Electron 测试能力（`electron.launch()`）。

### 隔离边界

- 使用真实的 Electron 应用实例
- 使用真实的 SQLite 数据库（临时文件，测试后清理）
- LLM API 使用 mock server（返回预设响应），不消耗真实 API 额度

### 核心用户旅程覆盖

以下为必须覆盖的关键路径，Agent 在开发对应功能时必须同步编写：

**项目管理流程：**

- 新建项目，设置项目名称和创作规则，保存成功
- 重启应用后，项目数据完整加载

**编辑器核心流程：**

- 创建章节，在编辑器中输入文字，保存，关闭后重新打开内容一致
- 使用富文本格式（加粗、斜体、标题），保存后格式保留

**AI 协作流程：**

- 选中文本，触发 AI 续写技能，结果出现在编辑器中
- AI 生成的内容被标记为 actor=ai
- 添加知识图谱实体后，AI 续写能感知到该实体（验证上下文注入）

**版本管理流程：**

- 编辑内容，创建快照，继续编辑
- 打开版本历史，对比两个版本的 diff
- 恢复到历史版本，编辑器内容回退

### E2E 测试编写规范

```tsx
// E2E 测试示例
test('complete writing flow: create project, write chapter, AI continue, version snapshot', async () => {
  // Create project
  await app.sidebar.clickNewProject()
  await app.projectDialog.setName('Test Novel')
  await app.projectDialog.confirm()
  
  // Create chapter and write
  await app.sidebar.clickNewChapter()
  await app.editor.type('The old house stood at the end of the road.')
  await app.editor.save()
  
  // Trigger AI continuation
  await app.editor.selectAll()
  await app.aiPanel.triggerSkill('continue')
  await app.aiPanel.waitForResult()
  await app.aiPanel.acceptResult()
  
  // Verify AI content is marked
  const content = await app.editor.getContent()
  expect(content.length).toBeGreaterThan('The old house stood at the end of the road.'.length)
  
  // Create snapshot and verify
  await app.versionPanel.createSnapshot('Before revision')
  await app.editor.clear()
  await app.editor.type('Completely new content.')
  await app.versionPanel.open()
  await app.versionPanel.restoreSnapshot('Before revision')
  
  const restored = await app.editor.getContent()
  expect(restored).toContain('The old house stood at the end of the road.')
})
```

---

## 4.4 AI 输出质量测试（AI Eval）

### 定义

专门验证 LLM 输出质量的测试层。与传统测试不同，AI Eval 不要求 100% 通过率，而是追踪通过率趋势——确保每次 Prompt 或上下文逻辑变更不会导致输出质量下降。

### 适用范围

仅适用于后端业务层中与 LLM 交互相关的模块：

- 上下文引擎的 Prompt 组装
- 技能系统的 Prompt 模板
- 记忆系统对输出的影响

### 黄金测试集（Golden Test Set）

维护一组固定的输入场景和人工标注的质量基线：

```tsx
// golden-tests/continue-writing.json
[
  {
    "id": "cw-001",
    "description": "Continue a melancholic scene with established character",
    "input": {
      "text": "Lin Daiyu stood by the window, watching petals fall...",
      "knownEntities": ["Lin Daiyu"],
      "styleProfile": { "sentenceLength": "long", "tone": "melancholic" }
    },
    "criteria": {
      "mustNotIntroduceUnknownCharacters": true,
      "mustMaintainTone": "melancholic",
      "mustContinueScene": true,
      "maxLengthTokens": 500
    }
  }
]
```

### 评估维度

| **维度** | **评估方法** | **通过标准** |
| --- | --- | --- |
| 一致性 | 检查输出是否引入知识图谱中不存在的实体 | 不引入未知实体 |
| 风格匹配 | 对比输出与风格 Profile 的匹配度（可用另一个 LLM 做评判） | 匹配度不低于 70% |
| 连贯性 | 检查输出与前文的叙事连贯性 | 不出现逻辑断裂 |
| 长度控制 | 检查输出 token 数是否在预期范围内 | 不超过指定上限 |
| 格式正确性 | 检查输出是否符合预期格式（纯文本 / 带标记等） | 格式完全正确 |

### AI Eval 测试示例

```tsx
describe('AI Eval: Continue Writing Skill', () => {
  const goldenTests = loadGoldenTests('continue-writing.json')

  goldenTests.forEach(testCase => {
    it(`[${testCase.id}] ${testCase.description}`, async () => {
      const result = await continueWritingSkill.execute(testCase.input)

      // Hard constraints (must pass)
      if (testCase.criteria.mustNotIntroduceUnknownCharacters) {
        const mentioned = extractCharacterNames(result.text)
        const known = testCase.input.knownEntities
        mentioned.forEach(name => {
          expect(known).toContain(name)
        })
      }

      if (testCase.criteria.maxLengthTokens) {
        expect(countTokens(result.text)).toBeLessThanOrEqual(testCase.criteria.maxLengthTokens)
      }

      // Soft constraints (tracked as metrics, not hard fail)
      const toneScore = await evaluateTone(result.text, testCase.criteria.mustMaintainTone)
      reportMetric(`${testCase.id}_tone_score`, toneScore)
    })
  })
})
```

### 运行策略

- 不纳入常规 CI（因为依赖真实 LLM API，耗时且有成本）
- 在以下时机手动或通过专门的 CI job 触发：Prompt 模板变更、上下文组装逻辑变更、LLM 模型切换
- 记录每次运行结果，生成趋势报告
- 如果通过率较上次下降超过 10 个百分点，必须阻断合并并排查原因

---

# 五、工具链配置

| **用途** | **工具** | **说明** |
| --- | --- | --- |
| 测试框架 | Vitest | 与 Vite 构建工具原生集成，兼容 Jest API |
| 前端组件测试 | React Testing Library | 测试组件行为而非实现细节 |
| E2E 测试 | Playwright | 支持 Electron 应用测试 |
| 覆盖率报告 | Vitest 内置 (c8/istanbul) | 生成覆盖率报告并在 CI 中检查阈值 |
| Mock 工具 | Vitest 内置 (vi.mock / vi.fn) | 模块级和函数级 mock |

---

# 六、文件组织规范

测试文件与源文件并置，使用 `.test.ts` 或 `.spec.ts` 后缀：

```
src/
  main/
    context-engine/
      allocator.ts
      allocator.test.ts          <-- 单元测试
      context-engine.ts
      context-engine.test.ts     <-- 单元测试
    knowledge-graph/
      graph.ts
      graph.test.ts
  renderer/
    components/
      SkillToolbar.tsx
      SkillToolbar.test.tsx
  ipc/
    channels.ts
    channels.test.ts

tests/
  integration/                   <-- 集成测试
    context-kg.integration.test.ts
    ipc-contract.integration.test.ts
  e2e/                           <-- 端到端测试
    writing-flow.e2e.test.ts
    version-control.e2e.test.ts
  ai-eval/                       <-- AI 输出质量测试
    continue-writing.eval.test.ts
    golden-tests/
      continue-writing.json
```

---

# 七、CI 集成规则

| **阶段** | **运行内容** | **失败策略** |
| --- | --- | --- |
| Pre-commit | 受影响的单元测试 | 阻断提交 |
| Push / PR | 全部单元测试 + 全部集成测试 + 覆盖率检查 | 阻断合并 |
| Merge to main | 全部 E2E 测试 | 阻断发布 |
| 手动触发 | AI Eval 测试 | 通过率下降超过 10% 则阻断 |

---

本文档为 CreoNow 项目的测试基准文件。所有 AI Agent 在生成代码时必须遵守上述规范，任何偏离须在交接文档中明确说明原因。