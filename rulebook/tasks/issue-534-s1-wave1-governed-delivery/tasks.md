## 1. Implementation

- [x] 1.1 完成 `s1-break-context-cycle`：类型与格式化函数抽取、fetcher 依赖解环
- [x] 1.2 完成 `s1-break-panel-cycle`：OpenSettingsContext 提取与兼容导出
- [x] 1.3 完成 `s1-scheduler-error-ctx`：错误上下文保留 + 终态单次收敛
- [x] 1.4 完成 `s1-path-alias`：`@shared` 配置 + 全量导入迁移

## 2. Testing

- [x] 2.1 执行四个 change 的 Red→Green 映射测试并复验
- [x] 2.2 运行关键回归：renderer 相关 vitest、scheduler/context 单测、`pnpm typecheck`
- [x] 2.3 运行路径迁移守卫：`scripts/tests/path-alias-migration-check.test.ts`

## 3. Governance

- [x] 3.1 更新并勾选四个 change 的 `tasks.md`
- [x] 3.2 将四个已完成 change 归档到 `openspec/changes/archive/`
- [x] 3.3 同步 `openspec/changes/EXECUTION_ORDER.md` 活跃拓扑
- [ ] 3.4 记录 RUN_LOG 与 Main Session Audit，完成 preflight / PR / auto-merge / main 同步收口
