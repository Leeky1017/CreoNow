# Workbench Specification Delta

## Change: s2-store-race-fix

### Requirement: Workbench Store 必须阻断异步竞态导致的旧结果覆盖 [ADDED]

`kgStore` 与 `searchStore` 在并发请求下必须保证“最新上下文优先提交”，旧请求结果不得覆盖当前有效状态。

#### Scenario: WB-S2-SRF-S1 项目快速切换时 kgStore 忽略旧请求结果 [ADDED]

- **假设** 用户连续切换项目触发多次 KG 异步加载
- **当** 先发请求晚于后发请求返回
- **则** `kgStore` 仅允许与当前 `projectId`/最新请求标记一致的结果写入
- **并且** 不得出现旧项目数据覆盖当前项目状态

#### Scenario: WB-S2-SRF-S2 快速输入查询时 searchStore 仅提交最新结果 [ADDED]

- **假设** 用户快速输入触发多次搜索请求
- **当** 早期请求在后期请求之后返回
- **则** `searchStore` 必须通过 `AbortController` 与请求标记校验阻断旧结果提交
- **并且** 最终状态必须对应最新查询条件

## Out of Scope

- 重构 KG/Search 的业务查询接口。
- 调整 Workbench 其他 store 的状态模型。
- 修改与竞态控制无关的 UI 行为。
