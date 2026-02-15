# Workbench Specification Delta

## Change: s3-i18n-extract

### Requirement: Workbench 可见文案必须由 locale key 驱动 [MODIFIED]

Workbench 相关 renderer 组件中的硬编码中文文案必须迁移为 `t('key')` 调用，并由 locale 资源统一管理。

#### Scenario: S3-I18N-EXTRACT-S1 组件文案由硬编码迁移为 key 渲染 [MODIFIED]

- **假设** 组件存在硬编码中文文案
- **当** 执行文案抽取变更
- **则** 组件通过 `t('key')` 渲染文案
- **并且** 原有功能行为与交互语义保持不变

### Requirement: locale 资源必须保持双语对齐与去重治理 [ADDED]

locale 资源文件必须维护 `zh-CN` 与 `en` 的键集一致性，并避免同义重复 key 造成维护分叉。

#### Scenario: S3-I18N-EXTRACT-S2 `zh-CN` 与 `en` 键集保持一致 [ADDED]

- **假设** 新增或修改了一批文案 key
- **当** 更新 locale 资源文件
- **则** `zh-CN` 与 `en` 文件包含一致的 key 集合
- **并且** 不出现缺失翻译导致的运行时裸 key 渲染

#### Scenario: S3-I18N-EXTRACT-S3 新增 key 避免同义重复定义 [ADDED]

- **假设** 组件需要新增一个文案 key
- **当** 开发者提交 locale 变更
- **则** 应复用既有语义 key 或在统一命名空间新增唯一 key
- **并且** 不得为同一语义引入并行重复 key

## Out of Scope

- i18n 初始化机制调整
- 新增语言切换功能或语言偏好设置
- 非 Workbench 范围的后端与 IPC 变更
