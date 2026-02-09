## 1. Specification

- [x] 1.1 审阅并确认 SR-1 仅覆盖 FTS（索引、查询、重建、面板三态）
- [x] 1.2 审阅并确认错误路径：索引损坏、空结果、重建中状态可见
- [x] 1.3 审阅并确认验收阈值：FTS 查询 p95 < 300ms
- [x] 1.4 依赖同步检查（Dependency Sync Check）：核对 `search`/`workbench`/`ipc` 的数据结构、IPC 契约、错误码、阈值；结论 `NO_DRIFT`
- [x] 1.5 Out-of-scope 守卫：不进入语义、RAG、替换、混合重排

## 2. TDD Mapping（先测前提）

- [x] 2.0 设定门禁：未出现 Red（失败测试）不得进入实现
- [x] 2.1 将 SR1-R1-S1~S4 全量映射为测试用例
- [x] 2.2 为每个测试标注 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red 失败证据不得进入实现

### Scenario → Test 映射

- [x] SR1-R1-S1 用户关键词检索
  - `apps/desktop/tests/integration/search/fts-query-panel.test.ts`
  - `it('should return highlighted snippets when querying fts panel')`
- [x] SR1-R1-S2 点击结果跳转定位
  - `apps/desktop/tests/integration/search/fts-result-jump.test.ts`
  - `it('should open document and jump to anchor when clicking result')`
- [x] SR1-R1-S3 无结果空态
  - `apps/desktop/renderer/src/features/search/__tests__/search-panel-empty.test.tsx`
  - `it('should render empty hint when no fts match exists')`
- [x] SR1-R1-S4 索引损坏触发重建
  - `apps/desktop/tests/integration/search/fts-reindex-recovery.test.ts`
  - `it('should trigger reindex and expose rebuilding state when index is corrupted')`

## 3. Red（先写失败测试）

- [x] 3.1 先编写 SR1-R1-S1/S2 的失败测试并记录 Red 证据
- [x] 3.2 再编写 SR1-R1-S3 的失败测试并记录 Red 证据
- [x] 3.3 最后编写 SR1-R1-S4 的失败测试并记录 Red 证据

## 4. Green（最小实现通过）

- [x] 4.1 仅实现最小 FTS5 索引与查询能力使 Red 转绿
- [x] 4.2 仅实现重建状态回传与 UI 提示所需最小代码
- [x] 4.3 补齐搜索面板 Storybook 三态并保持契约一致

## 5. Refactor（保持绿灯）

- [x] 5.1 抽离 FTS DTO 与 Zod schema，避免 renderer/main 双份定义
- [x] 5.2 统一 query/reindex 错误映射，保持 `IPCResponse` 外部契约不变

## 6. Evidence

- [x] 6.1 在 RUN_LOG 记录 Scenario 映射、Red 失败证据、Green 通过证据
- [x] 6.2 记录 Dependency Sync Check 的输入、核对项与 `NO_DRIFT` 结论
- [x] 6.3 记录 Storybook 三态截图或构建日志证据
