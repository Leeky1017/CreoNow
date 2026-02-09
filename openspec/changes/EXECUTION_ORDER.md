# Active Changes Execution Order

更新时间：2026-02-09 13:55

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **4**。
- 执行模式：**串行**。

## 执行顺序

1. `issue-326-layer2-layer3-integration-gate`（已合并，待归档）
   - 目标：完成 Layer2 + Layer3 里程碑集成检查并输出 delta report
   - 依赖：无上游活跃 change 依赖
2. `issue-328-cross-module-contract-alignment-gate`（已合并，待归档）
   - 目标：新增 cross-module 契约自动门禁（CI + preflight）
   - 依赖：`issue-326-layer2-layer3-integration-gate`
3. `issue-330-cross-module-gate-autofix-classification`（已合并，待归档）
   - 目标：新增开发分支失败后自动分类 + 安全自动修复 + 可选自动提交
   - 依赖：`issue-328-cross-module-contract-alignment-gate`
4. `issue-332-cross-module-drift-zero`（进行中）
   - 目标：清零 16 项已登记漂移并移除对应 baseline 例外
   - 依赖：`issue-328-cross-module-contract-alignment-gate`、`issue-330-cross-module-gate-autofix-classification`

## 依赖说明

- `issue-326-layer2-layer3-integration-gate`：无上游活跃依赖，Dependency Sync Check = `N/A`。
- `issue-328-cross-module-contract-alignment-gate`：
  - Dependency Sync Check 输入：`issue-326` delta report
  - 核对项：通道命名、envelope、错误码、缺失通道
  - 结论：`无漂移`
- `issue-330-cross-module-gate-autofix-classification`：
  - Dependency Sync Check 输入：`issue-328` 门禁脚本与 baseline 语义
  - 核对项：失败判定、baseline 字段、CI 只校验约束
  - 结论：`无漂移`
- `issue-332-cross-module-drift-zero`：
  - Dependency Sync Check 输入：`issue-328` / `issue-330` 产物（gate + autofix + baseline）
  - 核对项：
    - 数据结构：baseline 字段与 gate/autofix 读取一致
    - IPC 契约：命名治理与跨模块期望的一致性
    - 错误码：跨模块 required codes 在 SSOT 中的覆盖
    - envelope：`desiredEnvelope` 与生成类型语义一致
  - 结论：`发现既有漂移，已在 issue-332 change 文档中同步更新并进入 Red`

## 最近归档

- `memory-system-p3-isolation-degradation`
- `knowledge-graph-p2-auto-recognition-ai-utilization`

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 对有上游依赖的 change，进入 Red 前必须完成并落盘依赖同步检查（Dependency Sync Check）；若发现漂移先更新 change 文档再实现。
- 未同步更新本文件时，不得宣称执行顺序已确认。
