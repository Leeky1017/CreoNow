# Rulebook Spec Link — context-engine

- Source of truth: `openspec/changes/s3-synopsis-injection/specs/context-engine-delta.md`
- Covered scenarios:
  - `S3-SYN-INJ-S1` 续写时按章节顺序注入前几章摘要
  - `S3-SYN-INJ-S2` 无摘要数据时续写流程保持正常
  - `S3-SYN-INJ-S3` 存储或检索失败时返回结构化降级信号
- Contract note: 保持 Context Engine 四层组装顺序不变；synopsis 通过 retrieved 注入路径进入统一 budget/truncation 策略。
