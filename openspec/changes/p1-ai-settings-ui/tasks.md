## 1. Specification

- [ ] 1.1 审阅并确认需求边界：`AiSettingsSection` 组件包含 provider 选择、base URL、API Key、保存、测试连接 5 个核心元素
- [ ] 1.2 审阅并确认错误路径与边界路径：IPC 失败显示 errorText；测试连接失败显示错误码和消息；空 API Key 不发送到后端
- [ ] 1.3 审阅并确认验收阈值与不可变契约：所有交互元素有 `data-testid`；password 类型输入框；placeholder 反映配置状态
- [ ] 1.4 上游依赖 `p1-apikey-storage`，Dependency Sync Check 结论：`NO_DRIFT`（IPC 契约 `ai:config:get`/`update`/`test` 对齐）

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [ ] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

| Scenario ID | 测试文件 | 测试用例名 | 断言要点 |
|-------------|---------|-----------|----------|
| S0 | `apps/desktop/renderer/src/features/settings/__tests__/AiSettingsSection.test.tsx` | `should show "未配置" and no error when no key configured` | placeholder === "未配置"，无 `ai-error` 元素 |
| S1 | `apps/desktop/renderer/src/features/settings/__tests__/AiSettingsSection.test.tsx` | `should render all required elements` | `getByTestId("ai-provider-mode")`、`getByTestId("ai-api-key")`、`getByTestId("ai-base-url")`、`getByTestId("ai-save-btn")`、`getByTestId("ai-test-btn")` |
| S2 | `apps/desktop/renderer/src/features/settings/__tests__/AiSettingsSection.test.tsx` | `should show success message after test connection` | `expect(testResult).toContain("连接成功")`、`expect(testResult).toContain("42ms")` |
| S3 | `apps/desktop/renderer/src/features/settings/__tests__/AiSettingsSection.test.tsx` | `should show error on failed test connection` | `expect(testResult).toContain("AI_AUTH_FAILED")` |
| S4 | `apps/desktop/renderer/src/features/settings/__tests__/AiSettingsSection.test.tsx` | `should call ai:config:update on save` | `expect(invoke).toHaveBeenCalledWith("ai:config:update", expect.objectContaining({}))` |
| S5 | `apps/desktop/renderer/src/features/settings/__tests__/AiSettingsSection.test.tsx` | `should show "已配置" placeholder when key exists` | `expect(input.placeholder).toBe("已配置")` |
| S6 | `apps/desktop/renderer/src/features/settings/__tests__/AiSettingsSection.test.tsx` | `should show "未配置" placeholder when no key` | `expect(input.placeholder).toBe("未配置")` |

## 3. Red（先写失败测试）

<!-- Codex 填写 -->

## 4. Green（最小实现通过）

<!-- Codex 填写 -->

## 5. Refactor（保持绿灯）

<!-- Codex 填写 -->

## 6. Evidence

<!-- Codex 填写 -->
