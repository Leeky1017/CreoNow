# Search & Retrieval Specification Delta

## Change: a0-10-search-mvp

### Requirement: 搜索入口与发现性 [MODIFIED]

搜索面板**必须**可通过以下方式打开：

- IconBar 图标点击（已有）
- `Cmd/Ctrl+Shift+F` 全局快捷键（新增）
- 命令面板中输入"搜索"或"Search"（新增）

搜索结果点击后**必须**跳转到对应文档，并尽可能定位到匹配位置。

#### Scenario: Cmd+Shift+F opens search panel [ADDED]

- **假设** 用户正在编辑文档
- **当** 用户按下 `Cmd/Ctrl+Shift+F`
- **则** SearchPanel 打开并获得焦点
- **并且** 用户可以立即开始输入关键词

#### Scenario: Search result click navigates to document [ADDED]

- **假设** 搜索结果包含 3 篇匹配文档
- **当** 用户点击第 2 个结果
- **则** 编辑器切换到该文档
- **并且** SearchPanel 保持打开或根据用户偏好关闭
