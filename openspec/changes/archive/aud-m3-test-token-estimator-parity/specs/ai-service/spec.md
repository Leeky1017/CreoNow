# ai-service Specification Delta

## Change: aud-m3-test-token-estimator-parity

### Requirement: LLM mock 的 token 统计必须与生产口径一致（Wave1 / M3）[ADDED]

测试环境的 LLM mock（`createMockLlmClient`）必须使用与生产一致的 token 估算口径（`@shared/tokenBudget`），并保证 complete/stream 两条路径返回的 token 统计一致，避免测试绿灯掩盖生产漂移。

#### Scenario: AIS-AUD-M3-S1 complete/stream 的 token 统计与 shared estimator 一致 [ADDED]

- **假设** mock 输出为固定 ASCII 文本（例如 `"x".repeat(17)`）
- **当** 调用 `llm.complete(prompt)` 与 `llm.stream(prompt, onChunk)`
- **则** `completed.tokens` 与 `streamed.totalTokens` 必须都等于 `estimateUtf8TokenCount(output)`

#### Scenario: AIS-AUD-M3-S2 多字节 UTF-8 文本的 token 统计必须保持一致 [ADDED]

- **假设** mock 输出为多字节 UTF-8 文本（例如 `"你好，世界"`）
- **当** 调用 complete/stream 两条路径
- **则** token 统计必须与 `estimateUtf8TokenCount(output)` 一致

#### Scenario: AIS-AUD-M3-S3 空输出必须返回 0 token [ADDED]

- **假设** mock 输出为空字符串
- **当** 调用 complete/stream 两条路径
- **则** `tokens/totalTokens` 都必须为 `0`
