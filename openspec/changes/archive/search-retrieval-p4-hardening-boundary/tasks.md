## 1. Specification

- [x] 1.1 审阅并确认 SR-5 仅覆盖模块验收标准与异常边界矩阵
- [x] 1.2 审阅并确认超时降级契约：`SEARCH_TIMEOUT` + `fallback` + 可见提示
- [x] 1.3 审阅并确认矩阵覆盖：网络/IO、数据异常、并发冲突、容量溢出、权限安全
- [x] 1.4 依赖同步检查（Dependency Sync Check）：核对 `SR-1/SR-2/SR-3/SR-4` 与 `ipc/context-engine` 在数据结构/契约/错误码/阈值上的一致性；结论 `NO_DRIFT`
- [x] 1.5 Out-of-scope 守卫：不引入新算法、不改 Owner 固定参数

## 2. TDD Mapping（先测前提）

- [x] 2.0 设定门禁：未出现 Red（失败测试）不得进入实现
- [x] 2.1 将 SR5-R1-S1~S2、SR5-R2-S1~S5 映射为测试
- [x] 2.2 为每个测试标注 Scenario ID，保持一一对应
- [x] 2.3 未记录 Red 失败证据前禁止进入 Green

### Scenario → Test 映射

- [x] SR5-R1-S1 性能阈值达标
  - `apps/desktop/tests/perf/search/search-retrieval-slo.benchmark.test.ts`
  - `it('should satisfy p95 latency and reindex throughput thresholds under load')`
- [x] SR5-R1-S2 超时可见降级
  - `apps/desktop/tests/integration/search/search-timeout-visible-fallback.test.ts`
  - `it('should return SEARCH_TIMEOUT and show visible fts fallback message')`
- [x] SR5-R2-S1 网络/IO 失败
  - `apps/desktop/tests/integration/search/search-reindex-io-error.test.ts`
  - `it('should return SEARCH_REINDEX_IO_ERROR with retryable flag on reindex io failure')`
- [x] SR5-R2-S2 数据异常隔离
  - `apps/desktop/tests/integration/search/search-data-corruption-isolation.test.ts`
  - `it('should isolate corrupted chunks and keep online query available')`
- [x] SR5-R2-S3 并发冲突
  - `apps/desktop/tests/integration/search/search-replace-autosave-conflict.test.ts`
  - `it('should return SEARCH_CONCURRENT_WRITE_CONFLICT on replace and autosave conflict')`
- [x] SR5-R2-S4 容量溢出
  - `apps/desktop/tests/integration/search/search-capacity-backpressure.test.ts`
  - `it('should trigger capacity/backpressure protection when candidate or storage limit is exceeded')`
- [x] SR5-R2-S5 跨项目阻断
  - `apps/desktop/tests/integration/search/search-cross-project-forbidden.test.ts`
  - `it('should block cross-project query with SEARCH_PROJECT_FORBIDDEN')`

## 3. Red（先写失败测试）

- [x] 3.1 先编写阈值与超时降级失败测试并记录 Red
- [x] 3.2 再编写矩阵异常场景失败测试并记录 Red
- [x] 3.3 记录跨项目阻断与审计字段断言失败证据

## 4. Green（最小实现通过）

- [x] 4.1 仅实现阈值观测与超时降级最小路径
- [x] 4.2 仅实现矩阵错误码与边界保护最小路径
- [x] 4.3 仅实现跨项目阻断校验与审计落盘最小路径

## 5. Refactor（保持绿灯）

- [x] 5.1 统一检索域错误码映射与可见提示映射表
- [x] 5.2 抽离并复用容量/并发守卫逻辑，保持外部契约不变

## 6. Evidence

- [x] 6.1 RUN_LOG 记录 Scenario 映射、Red/Green 证据与关键命令输出
- [x] 6.2 记录 Dependency Sync Check 输入、核对项与 `NO_DRIFT` 结论
- [x] 6.3 记录超时降级提示、矩阵错误码与跨项目阻断审计证据
