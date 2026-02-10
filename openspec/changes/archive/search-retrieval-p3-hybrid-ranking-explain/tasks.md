## 1. Specification

- [x] 1.1 审阅并确认 SR-4 仅覆盖检索算法与排序策略 requirement
- [x] 1.2 审阅并确认两阶段召回、融合公式、Top50 与分页规则
- [x] 1.3 审阅并确认 explain 与 strategy 契约的可判定返回结构
- [x] 1.4 依赖同步检查（Dependency Sync Check）：核对 `SR-1/SR-2/SR-3` 与 `ipc` 在数据结构/契约/错误码/阈值上的一致性；结论 `NO_DRIFT`
- [x] 1.5 Out-of-scope 守卫：不改 Owner 固定权重与阈值

## 2. TDD Mapping（先测前提）

- [x] 2.0 设定门禁：未出现 Red（失败测试）不得进入实现
- [x] 2.1 将 SR4-R1-S1~S2 映射为测试用例
- [x] 2.2 为每个测试标注 Scenario ID 并建立追踪
- [x] 2.3 未记录 Red 失败证据前禁止进入 Green

### Scenario → Test 映射

- [x] SR4-R1-S1 Hybrid 可解释排序
  - `apps/desktop/tests/integration/search/hybrid-ranking-explain.test.ts`
  - `it('should return top50 ranked results with score breakdown in hybrid mode')`
- [x] SR4-R1-S2 分页与同分稳定规则
  - `apps/desktop/tests/integration/search/hybrid-pagination-tie-break.test.ts`
  - `it('should paginate large result sets and tie-break by updatedAt desc')`

## 3. Red（先写失败测试）

- [x] 3.1 编写 hybrid explain 失败测试并记录 Red
- [x] 3.2 编写大结果集分页失败测试并记录 Red
- [x] 3.3 编写同分排序稳定性失败断言并记录 Red

## 4. Green（最小实现通过）

- [x] 4.1 仅实现两阶段召回与融合重排最小链路
- [x] 4.2 仅实现 Top50 首屏与分页返回最小链路
- [x] 4.3 仅实现 explain/strategy IPC 最小契约满足 Red

## 5. Refactor（保持绿灯）

- [x] 5.1 抽离重排计算与解释构造器，统一字段命名
- [x] 5.2 对候选截断与分页游标逻辑去重，保持外部行为不变

## 6. Evidence

- [x] 6.1 RUN_LOG 记录 Scenario 映射、Red/Green 证据与关键命令输出
- [x] 6.2 记录 Dependency Sync Check 输入、核对项与 `NO_DRIFT` 结论
- [x] 6.3 记录公式稳定性、分页结果和 explain 输出证据
