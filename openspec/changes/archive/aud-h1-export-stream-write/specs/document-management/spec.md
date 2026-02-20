# document-management Specification Delta

## Change: aud-h1-export-stream-write

### Requirement: project bundle 导出必须流式写入，禁止一次性 join 缓冲（Wave0 / H1）[ADDED]

系统必须将 project bundle 的导出写入路径改为流式写入（write-through），以避免将全部内容 materialize 到内存。至少满足：

- 导出写入必须使用 stream API（例如 `createWriteStream`）。
- 不得对 sections 做 `join` 以一次性拼接为大字符串再写入。

#### Scenario: DOC-AUD-H1-S1 导出写入必须使用 stream API 且不得 join sections [ADDED]

- **假设** `exportProjectBundle` 需要写入多个 section
- **当** 执行导出写入实现
- **则** 必须使用 `createWriteStream(...)` 等 stream API 写入
- **并且** 源码中不得出现 `sections.join(...)` 的一次性拼接
