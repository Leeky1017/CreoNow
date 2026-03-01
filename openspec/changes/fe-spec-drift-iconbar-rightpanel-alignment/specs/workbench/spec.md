# Workbench Specification Delta

更新时间：2026-03-01 09:55

## Change: fe-spec-drift-iconbar-rightpanel-alignment

### Requirement: IconBar 面板 ID 与顺序必须为 SSOT [MODIFIED]

- IconBar 必须以单一面板 ID 集合为 SSOT，禁止同义双栈（如 `graph` 与 `knowledgeGraph` 并存）。
- 当前实现入口集合/顺序（顶部）定义为：`files → search → outline → versionHistory → memory → characters → knowledgeGraph`。
- `media` 入口保留在契约中并标注为 `[FUTURE]`：它属于未来入口，不计入“当前实现入口顺序”校验，待能力上线后再并入当前序列。
- 入口呈现形态变化（Sidebar → Dialog/Spotlight）属于呈现层改变，不影响入口 ID 的一致性约束。

#### Scenario: 同一语义面板不得存在两个 ID [ADDED]

- **假设** 某面板语义为“知识图谱”
- **当** 系统定义其面板 ID
- **则** 该语义必须且只能使用一个 ID（`knowledgeGraph`）
- **并且** 不得出现将 `graph` 作为最终 ID 的描述

### Requirement: RightPanel tab 集合必须与枚举一致 [MODIFIED]

- RightPanel 的 tab 集合（文档描述）与 `activeRightPanel` 枚举必须一致。
- RightPanel 明确为 `AI` / `Info` / `Quality` 三 tab（对应 `ai` / `info` / `quality`）。
- 不允许出现“文本仅 AI/Info 两项，但枚举含 quality”的矛盾状态。

#### Scenario: spec 文本与枚举不得自相矛盾 [ADDED]

- **假设** spec 声明 RightPanel 支持的 tab 集合
- **当** spec 同时给出枚举定义与文字描述
- **则** 两者必须一致
- **并且** 不得出现“文字说两项、枚举含三项”的矛盾状态
