# AI Service Specification Delta

## Change: db-native-binding-doctor

### Requirement: AI 面板在 DB 不可用时提供可执行修复指引 [ADDED]

当 AI 面板依赖的技能注册或代理配置因数据库不可用失败时，系统必须返回并展示可执行的修复建议，而非仅展示通用错误。

修复建议至少包含：

- 失败分类（如 `native_module_abi_mismatch`、`native_module_missing_binding`、`db_init_failed`）
- 建议命令：`pnpm -C apps/desktop rebuild:native`
- 重启建议：修复后重启应用

#### Scenario: Skills 列表加载失败时显示 native 修复指引 [ADDED]

- **假设** 主进程数据库初始化失败，失败原因为 native 模块 ABI 不匹配
- **当** AI 面板请求技能列表
- **则** 返回 `DB_ERROR`
- **并且** 错误 `details` 中包含分类与修复命令
- **并且** AI 面板错误卡片展示可复制的修复步骤

#### Scenario: 未命中已知 native 模式时提供通用 DB 诊断 [ADDED]

- **假设** 数据库初始化失败，但错误不匹配 native ABI/绑定缺失模式
- **当** AI 面板请求技能列表
- **则** 返回 `DB_ERROR`
- **并且** 错误 `details` 中分类为 `db_init_failed`
- **并且** 保留通用重试/检查日志路径提示

