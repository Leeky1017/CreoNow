# 测试指南

> **前置阅读**：`AGENTS.md`（必读）→ 本文档
> **用途**：测试理念、类型选择、编写规范的完整指引。
> **何时阅读**：写测试前（必读）。

---

## 一、TDD 铁律

```
Red → Green → Refactor
```

1. **Red**：先写测试，看到它因「行为缺失」而失败（不是语法错误）
2. **Green**：写最少的代码让测试通过
3. **Refactor**：在测试保护下重构，保持绿灯

### 核心信念

- 测试验证**行为**，不验证实现细节
- 测试必须**独立、确定、有意义**
- Spec 中的 Scenario 必须有对应测试

---

## 二、五大反模式（违反即打回）

| # | 反模式 | 为什么有害 | 正确做法 |
|---|--------|-----------|---------|
| 1 | 字符串匹配源码（`source.includes('xxx')`） | 测的是文本不是行为 | 调用函数 → 断言返回值/副作用 |
| 2 | 只验证存在性（`toBeTruthy()`） | 不验证对不对 | 使用 `toEqual()`/`toContain()` 等精确断言 |
| 3 | 过度 mock（mock 了被测对象本身） | 测的是 mock 不是代码 | 只 mock 边界依赖（网络/文件/LLM） |
| 4 | 只测 happy path | 真实 bug 在 edge/error 路径 | 每个函数至少覆盖 happy + edge + error |
| 5 | 无意义测试名（`test1`、`should work`） | 失败时不知道什么坏了 | `[前置条件] → [预期行为]` 命名 |

---

## 三、测试类型决策树

```
需要测什么？
├── 单函数 / Store / Hook        → 单元测试（Vitest）
├── 多模块协作                    → 集成测试（Vitest）
├── 关键用户路径                  → E2E 测试（Playwright）
│   （启动/编辑/保存/AI/导出/设置）
├── 跨文件架构约束                → Guard 测试
│   （能用 ESLint 解决的 → ESLint 规则，不写 Guard）
└── 跨模块接口契约                → Contract 测试
```

### 各类型详解

| 类型 | 框架 | 运行位置 | 文件命名 | 速度 |
|------|------|---------|---------|------|
| 单元测试 | Vitest | Node / jsdom | `*.test.ts(x)` | 快 |
| 集成测试 | Vitest | Node / jsdom | `*.integration.test.ts` | 中 |
| E2E 测试 | Playwright | Electron | `*.e2e.test.ts` | 慢 |
| Guard | Vitest + AST/FS | Node | `*.guard.test.ts` | 快 |
| Contract | Vitest | Node | `*.contract.test.ts` | 快 |

---

## 四、前端测试规范

### 查询优先级（严格按此顺序）

```
getByRole > getByLabelText > getByTestId >> getByText
```

- `getByRole`：最接近用户感知，优先使用
- `getByLabelText`：表单元素
- `getByTestId`：无语义标记时的 fallback
- `getByText`：最脆弱，避免使用

### 组件测试核心要点

```typescript
// ✅ 正确：测行为
it('提交表单后显示成功消息', async () => {
  render(<Form />);
  await userEvent.type(getByRole('textbox'), 'hello');
  await userEvent.click(getByRole('button', { name: /提交/ }));
  expect(getByRole('alert')).toHaveTextContent('成功');
});

// ❌ 错误：测实现
it('调用 setState', () => {
  const spy = vi.spyOn(component, 'setState');
  // ...
});
```

### Store 测试模式（Zustand）

```typescript
// 直接调用 action → 断言 state 变化
it('addItem 增加列表长度', () => {
  const store = createTestStore();
  store.getState().addItem({ id: '1', name: 'test' });
  expect(store.getState().items).toHaveLength(1);
});
```

---

## 五、后端测试规范

### Service 隔离测试

```typescript
// mock 外部依赖，只测 service 逻辑
const mockDB = createMockDB();
const service = new DocumentService(mockDB);

it('保存文档时更新时间戳', async () => {
  await service.save(doc);
  expect(mockDB.put).toHaveBeenCalledWith(
    expect.objectContaining({ updatedAt: expect.any(Number) })
  );
});
```

### IPC 契约测试

```typescript
// 验证 channel 名称 + 参数类型 + 返回类型的一致性
it('document:save 契约', () => {
  const schema = getIPCSchema('document:save');
  expect(schema.params).toMatchObject({ id: 'string', content: 'string' });
  expect(schema.returns).toMatchObject({ success: 'boolean' });
});
```

### AI 相关测试

```typescript
// LLM 在测试中必须 mock，不能调真实 API
const mockLLM = createMockLLM({
  responses: [{ content: '生成的文本' }],
});
```

---

## 六、ESLint vs Guard 边界

| 检测类型 | 使用 ESLint | 使用 Guard |
|---------|------------|-----------|
| 单文件内的代码规范 | ✅ | ❌ |
| 禁止某个 API 调用 | ✅ | ❌ |
| 跨文件依赖关系 | ❌ | ✅ |
| 架构分层约束 | ❌ | ✅ |
| 命名约定（单文件） | ✅ | ❌ |
| 模块间接口契约 | ❌ | ✅（Contract） |

### 判定原则

- 能用 ESLint AST visitor 解决的 → ESLint 规则
- 需要跨文件/跨模块/需要 FS 操作的 → Guard 测试

---

## 七、测试确定性要求

测试不得依赖：

| 禁止依赖 | 替代方案 |
|---------|---------|
| 真实时间 | `vi.useFakeTimers()` |
| 随机数 | 固定种子 / mock `Math.random` |
| 网络请求 | mock HTTP client |
| 文件系统 | mock FS 或内存 FS |
| LLM API | mock 固定响应 |
| 环境变量 | 测试内显式设置 |

