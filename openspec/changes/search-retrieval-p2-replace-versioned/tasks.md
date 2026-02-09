## 1. Specification

- [ ] 1.1 审阅并确认 SR-3 仅覆盖搜索替换 requirement
- [ ] 1.2 审阅并确认关键安全路径：预览必经、确认必经、全项目快照先行
- [ ] 1.3 审阅并确认替换参数边界：范围与三开关（regex/caseSensitive/wholeWord）
- [ ] 1.4 依赖同步检查（Dependency Sync Check）：核对 `SR-1`、`version-control`、`ipc` 在数据结构/契约/错误码/阈值上的一致性；结论 `NO_DRIFT`
- [ ] 1.5 Out-of-scope 守卫：不扩展回滚 UI 细节与重排策略

## 2. TDD Mapping（先测前提）

- [ ] 2.0 设定门禁：未出现 Red（失败测试）不得进入实现
- [ ] 2.1 将 SR3-R1-S1~S3 映射为可追踪测试
- [ ] 2.2 每个测试显式标注 Scenario ID
- [ ] 2.3 未记录 Red 失败证据前禁止进入 Green

### Scenario → Test 映射

- [ ] SR3-R1-S1 当前文档替换
  - `apps/desktop/tests/integration/search/replace-current-document.test.ts`
  - `it('should replace all matches in current document with selected flags')`
- [ ] SR3-R1-S2 全项目预览与确认
  - `apps/desktop/tests/integration/search/replace-preview-confirm.test.ts`
  - `it('should require preview before execute in whole-project scope')`
- [ ] SR3-R1-S3 全项目替换前版本快照
  - `apps/desktop/tests/integration/search/replace-version-snapshot.test.ts`
  - `it('should create per-document snapshots before whole-project replacement')`

## 3. Red（先写失败测试）

- [ ] 3.1 先编写当前文档替换失败测试并记录 Red
- [ ] 3.2 再编写全项目预览/确认失败测试并记录 Red
- [ ] 3.3 最后编写快照先行失败测试并记录 Red

## 4. Green（最小实现通过）

- [ ] 4.1 仅实现 preview/execute 最小链路使 Red 转绿
- [ ] 4.2 仅实现范围/开关解析最小路径并保持 IPC 契约稳定
- [ ] 4.3 仅实现全项目替换前快照创建最小路径

## 5. Refactor（保持绿灯）

- [ ] 5.1 统一替换请求参数解析与校验逻辑，减少重复分支
- [ ] 5.2 统一替换回执与 Version Control 关联字段命名

## 6. Evidence

- [ ] 6.1 RUN_LOG 记录 Scenario 映射、Red/Green 证据与关键命令输出
- [ ] 6.2 记录 Dependency Sync Check 输入、核对项与 `NO_DRIFT` 结论
- [ ] 6.3 记录快照创建顺序与失败回执证据
