# Workbench Specification Delta

## Change: s3-i18n-setup

### Requirement: Workbench 必须提供可复用的 i18n 初始化基线 [ADDED]

Workbench 启动流程必须装配 `react-i18next` 初始化入口，并提供默认语言与回退语言策略，以支持后续文案抽取批次在稳定基线上迭代。

#### Scenario: S3-I18N-SETUP-S1 应用启动时装配 i18n 默认语言与回退语言 [ADDED]

- **假设** 应用首次启动且存在 `zh-CN` 与 `en` 资源骨架
- **当** Workbench 入口完成渲染初始化
- **则** i18n 默认语言为 `zh-CN`
- **并且** 回退语言为 `en`
- **并且** 组件文案通过 i18n provider 渲染链路提供

#### Scenario: S3-I18N-SETUP-S2 缺失 key 时遵循可观测回退策略 [ADDED]

- **假设** 当前语言资源中缺失某个文案 key
- **当** 组件请求该 key
- **则** 系统按回退语言策略解析该 key
- **并且** 不得返回静默空串作为默认结果

### Requirement: Workbench 文案渲染入口改为 key 驱动路径 [MODIFIED]

Workbench 入口和公共外壳中的可见文案渲染路径必须可被 `t('key')` 接管，避免继续依赖硬编码字符串作为基础能力。

#### Scenario: S3-I18N-SETUP-S3 外壳组件可接入 key 渲染链路 [MODIFIED]

- **假设** App Shell 已接入 i18n provider
- **当** 渲染含可见文案的基础组件
- **则** 文案可通过 locale key 解析
- **并且** 不破坏现有 Workbench 布局与交互行为

## Out of Scope

- 全量 renderer 文案抽取与替换
- 语言切换设置 UI 与偏好持久化
- 主进程与 IPC 层改动
