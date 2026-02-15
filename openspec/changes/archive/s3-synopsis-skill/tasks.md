## 1. Specification

- [x] 1.1 审阅并确认 `s3-synopsis-skill` 范围：新增 `synopsis` 内置技能定义与加载契约
- [x] 1.2 审阅并确认边界路径：输出长度、格式、schema 不合法等异常行为
- [x] 1.3 审阅并确认不可变契约：既有技能执行 envelope 与 loader 机制保持不变
- [x] 1.4 在进入 Red 前完成依赖同步检查（Dependency Sync Check），记录“无漂移/已更新”；无上游依赖时标注 N/A

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → 测试映射

- [x] S3-SYN-SKILL-S1 `skill loader 加载 synopsis 内置技能 [ADDED]`
  - 测试文件：`apps/desktop/main/src/services/skills/__tests__/skillLoader.synopsis.test.ts`
  - 测试名：`loads builtin synopsis skill definition`
- [x] S3-SYN-SKILL-S2 `synopsis 输出遵守 200-300 字单段摘要约束 [ADDED]`
  - 测试文件：`apps/desktop/main/src/services/skills/__tests__/synopsisSkill.execution.test.ts`
  - 测试名：`generates synopsis within 200-300 chars as single paragraph`
- [x] S3-SYN-SKILL-S3 `无效 synopsis 定义在加载阶段失败并报错 [ADDED]`
  - 测试文件：`apps/desktop/main/src/services/skills/__tests__/skillLoader.synopsis.test.ts`
  - 测试名：`fails fast when synopsis skill definition violates schema`

## 3. Red（先写失败测试）

- [x] 3.1 编写 S3-SYN-SKILL-S1 失败测试，确认当前无 `synopsis` 技能
- [x] 3.2 编写 S3-SYN-SKILL-S2 失败测试，确认输出约束未建立
- [x] 3.3 编写 S3-SYN-SKILL-S3 失败测试，确认无效定义未被阻断
- [x] 3.4 运行最小测试集并记录 Red 证据

## 4. Green（最小实现通过）

- [x] 4.1 新增 `builtin/synopsis/SKILL.md` 并通过 loader 识别
- [x] 4.2 实现摘要长度与格式约束的最小执行逻辑
- [x] 4.3 建立无效定义 fail-fast 错误路径

## 5. Refactor（保持绿灯）

- [x] 5.1 去除定义文件中的噪音注释与无效模板段落
- [x] 5.2 对齐内置技能元数据风格，避免命名/字段漂移

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [x] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作（无漂移/已更新）
- [x] 6.3 记录 `synopsis` 技能加载与输出约束验证证据
