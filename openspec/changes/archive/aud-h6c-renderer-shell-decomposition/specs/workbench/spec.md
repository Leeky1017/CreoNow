# workbench Specification Delta

## Change: aud-h6c-renderer-shell-decomposition

### Requirement: Renderer 超大组件拆分为可测试 helper 模块（Wave3 / H6C）[ADDED]

系统必须将 Renderer 中的“高频、纯逻辑、与 UI 渲染无关”的 helper 行为从超大组件中拆分出来，形成可独立回归的 helper 模块，满足：

- helper 在固定输入下输出必须确定性（不依赖真实时间、随机数、网络）。
- 拆分不得改变外部行为语义（用户可观察行为保持一致）。
- helper 行为必须存在直接的、可回归的单元测试证据。

#### Scenario: WB-AUD-H6C-S1 zen mode 内容提取确定且可验证 [ADDED]

- **假设** 输入为 TipTap JSON 字符串（包含 heading 与 paragraph）
- **当** 调用 `extractZenModeContent(json)`
- **则** 返回稳定的 `title` / `paragraphs` / `wordCount`
- **并且** 结果不依赖 UI 渲染路径即可回归

#### Scenario: WB-AUD-H6C-S2 layout 最大宽度计算具备最小约束 [ADDED]

- **假设** 给定固定的 viewport/panel/sidebar 宽度
- **当** 调用 `computeSidebarMax` / `computePanelMax`
- **则** 返回的最大值必须满足最小可用约束（避免计算出不可交互的极小值）

#### Scenario: WB-AUD-H6C-S3 AI 面板格式化 helper 输出确定 [ADDED]

- **假设** 输入为固定的 token/price/selection 文本
- **当** 调用 `formatTokenValue` / `formatUsd` / `formatSelectionPreview`
- **则** 输出必须为确定性的格式化文本（例如千分位、四位小数、截断省略）
- **并且** 不出现 silent failure 或格式漂移

#### Scenario: WB-AUD-H6C-S4 Judge 严重度映射使用语义化 design token class [ADDED]

- **假设** 输入 severity 为 `high`
- **当** 调用 `judgeSeverityClass("high")`
- **则** 返回的 class 必须使用语义化 token（例如 `text-[var(--color-error)]`）
