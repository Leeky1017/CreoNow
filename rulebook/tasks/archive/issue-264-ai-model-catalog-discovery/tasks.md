## 1. Specification

- [x] 1.1 定义 `ai:models:list` 通道与响应结构
- [x] 1.2 定义 `ai:skill:run.model` 兼容策略

## 2. TDD Mapping（先测前提）

- [x] 2.1 Scenario → unit test mapping 完成
- [x] 2.2 Red 证据记录
- [x] 2.3 URL 前缀拼接与非 JSON 错误映射场景映射

## 3. Red（先写失败测试）

- [x] 3.1 新增 `ai-service-model-catalog` Red 用例
- [x] 3.2 新增 `ai-service-run-options` Red 用例（路径前缀 + 非 JSON）

## 4. Green（最小实现通过）

- [x] 4.1 Main AI Service + IPC handler 实现
- [x] 4.2 Renderer settings/picker 联动
- [x] 4.3 Proxy settings 支持 providerMode + BYOK 分 provider 字段

## 5. Refactor（保持绿灯）

- [x] 5.1 解析逻辑去重并补 fallback
- [x] 5.2 URL join 统一逻辑（避免 `/v1/v1`、保留 `/api/*`）
- [x] 5.3 ModelPicker 升级为搜索/分组/最近使用

## 6. Evidence

- [x] 6.1 typecheck + targeted tests 通过
- [x] 6.2 `ai-service-model-catalog` / `ai-service-run-options` / `ai-store-run-request-options` 通过
