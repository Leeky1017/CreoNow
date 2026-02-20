# context-engine Specification Delta

## Change: aud-h2b-main-io-offload-guard

### Requirement: Context FS 大文件读取必须采用阈值策略与硬上限守卫（Wave1 / H2B）[ADDED]

Context FS 在读取文本文件时必须基于文件大小采用确定性的读取策略，避免大文件直接读入导致内存/阻塞风险，并对 stream 读取设置硬上限，超限必须返回可审计错误。

#### Scenario: CE-AUD-H2B-S1 阈值策略在固定输入下确定选择 direct/stream [ADDED]

- **假设** 给定 `sizeBytes`
- **当** 调用 `resolveContextFsReadStrategy(sizeBytes)`
- **则** 必须满足：
  - `sizeBytes <= CONTEXT_FS_STREAM_READ_THRESHOLD_BYTES` 返回 `"direct"`
  - `sizeBytes > CONTEXT_FS_STREAM_READ_THRESHOLD_BYTES` 返回 `"stream"`

#### Scenario: CE-AUD-H2B-S2 stream 读取超硬上限必须返回确定性 IO_ERROR [ADDED]

- **假设** 目标文件大小大于 `CONTEXT_FS_STREAM_READ_HARD_LIMIT_BYTES`
- **当** 调用 `readCreonowTextFileAsync({ projectRootPath, path })`
- **则** 返回 `{ ok: false, error: { code: "IO_ERROR", message: "File exceeds stream read hard limit", details: { limitBytes: CONTEXT_FS_STREAM_READ_HARD_LIMIT_BYTES } } }`
