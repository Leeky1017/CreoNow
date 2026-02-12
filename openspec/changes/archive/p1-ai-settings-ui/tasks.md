## 1. Specification

- [x] 1.1 审阅并确认需求边界：`AiSettingsSection` 提供 provider 选择、base URL、API Key、保存、测试连接五个核心交互。
- [x] 1.2 审阅并确认错误与边界：测试连接失败展示错误码；IPC 异常展示 `ai-error`；空 API Key 不下发到 `ai:config:update` patch。
- [x] 1.3 审阅并确认不可变契约：关键交互节点具备 `data-testid`；API Key 输入框为 `type="password"`；placeholder 正确反映已配置/未配置。
- [x] 1.4 上游依赖 `p1-apikey-storage` 已完成，依赖同步检查（Dependency Sync Check）结论：`NO_DRIFT`（`ai:config:get`/`ai:config:update`/`ai:config:test` 契约对齐）。

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的 S0-S6 全量映射到 `AiSettingsSection.test.tsx`。
- [x] 2.2 测试名显式包含 Scenario ID（`S0`~`S6`），建立可追踪关系。
- [x] 2.3 严格执行 Red gate：在 `SettingsDialog` 增加契约测试后先出现失败（Red），再进入实现（Green）。

### Scenario → Test 映射

| Scenario ID | 测试文件                                                                           | 测试用例名                                                    | 断言要点                                                                   |
| ----------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- |
| S0          | `apps/desktop/renderer/src/features/settings/__tests__/AiSettingsSection.test.tsx` | `S0 should show "未配置" and no error when no key configured` | placeholder=`未配置`，且不存在 `ai-error`                                  |
| S1          | `apps/desktop/renderer/src/features/settings/__tests__/AiSettingsSection.test.tsx` | `S1 should render all required elements`                      | provider/base-url/api-key/save/test 五元素存在，且 api-key `type=password` |
| S2          | `apps/desktop/renderer/src/features/settings/__tests__/AiSettingsSection.test.tsx` | `S2 should show success message after test connection`        | `ai:config:test` 被调用，结果含 `连接成功` 与 `42ms`                       |
| S3          | `apps/desktop/renderer/src/features/settings/__tests__/AiSettingsSection.test.tsx` | `S3 should show error on failed test connection`              | 失败结果含 `AI_AUTH_FAILED`                                                |
| S4          | `apps/desktop/renderer/src/features/settings/__tests__/AiSettingsSection.test.tsx` | `S4 should call ai:config:update on save`                     | `ai:config:update` patch 包含 `providerMode: openai-byok`                  |
| S5          | `apps/desktop/renderer/src/features/settings/__tests__/AiSettingsSection.test.tsx` | `S5 should show "已配置" placeholder when key exists`         | placeholder=`已配置`                                                       |
| S6          | `apps/desktop/renderer/src/features/settings/__tests__/AiSettingsSection.test.tsx` | `S6 should show "未配置" placeholder when no key`             | placeholder=`未配置`                                                       |

## 3. Red（先写失败测试）

- 新增失败测试：`SettingsDialog` 的 `proxy` 标签应渲染 `AiSettingsSection`。
- Red 命令：
  - `pnpm -C apps/desktop test:run renderer/src/features/settings-dialog/SettingsDialog.test.tsx`
- Red 结果（失败摘要）：
  - `TestingLibraryElementError: Unable to find an element by: [data-testid="mock-ai-settings-section"]`
  - 失败用例：`SettingsDialog > switches tabs on click`
- 结论：当前实现仍渲染 `ProxySection`，与本 change 的设置面板契约不一致。

## 4. Green（最小实现通过）

- 最小实现：
  - `apps/desktop/renderer/src/features/settings-dialog/SettingsDialog.tsx`
  - 将 `proxy` 标签页内容从 `ProxySection` 切换为 `AiSettingsSection`。
- 同步测试：
  - `apps/desktop/renderer/src/features/settings-dialog/SettingsDialog.test.tsx`
  - 更新 `proxy` 标签断言为 `mock-ai-settings-section`。
- Green 验证命令：
  - `pnpm -C apps/desktop test:run renderer/src/features/settings/__tests__/AiSettingsSection.test.tsx renderer/src/features/settings-dialog/SettingsDialog.test.tsx`
- Green 结果：2 个测试文件共 14 个测试全部通过。

## 5. Refactor（保持绿灯）

- 重整 `AiSettingsSection` 测试结构：统一默认 IPC mock，减少重复样板并保持 AAA。
- 增加边界回归：`does not send empty api key in patch`，防止空 key 回归下发。
- Refactor 后回归：同 Green 命令保持全绿（14/14）。

## 6. Evidence

- 依赖安装：`pnpm install --frozen-lockfile`（worktree 首次执行，依赖可用）。
- 场景测试：`pnpm -C apps/desktop test:run renderer/src/features/settings/__tests__/AiSettingsSection.test.tsx`。
- Red 证据：`pnpm -C apps/desktop test:run renderer/src/features/settings-dialog/SettingsDialog.test.tsx`（先失败）。
- Green 证据：`pnpm -C apps/desktop test:run renderer/src/features/settings/__tests__/AiSettingsSection.test.tsx renderer/src/features/settings-dialog/SettingsDialog.test.tsx`（全通过）。
- 交付门禁：`scripts/agent_pr_preflight.sh`（在 PR 链接回填后执行并记录于 RUN_LOG）。
