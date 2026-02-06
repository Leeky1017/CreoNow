# Design 04 — Design System & Tokens

## Scope

- CNAUD-REQ-007
- CNAUD-REQ-012
- CNAUD-REQ-013
- CNAUD-REQ-031
- CNAUD-REQ-032
- CNAUD-REQ-036

## Current-State Evidence

- renderer tokens.css 与 design/system/01-tokens.css 存在双源。
- renderer token 中缺失 --color-accent，但业务组件已消费该 token。
- 业务界面仍存在大量硬编码色值与 arbitrary color classes。
- ExportDialog 仍存在 important 样式。
- accent 命名存在语义重叠与维护成本。

## Target Design

1. Token SSOT
   - 以 design/system/01-tokens.css 为单一事实源。
   - renderer token 文件改为导入或生成产物，禁止手工双写。

2. Tailwind Mapping
   - 在 theme 层建立语义色映射（bg/fg/border/accent）。
   - 新增 lint 约束禁止新增非白名单 arbitrary color。

3. Color Debt Burn-down
   - 建立分批清理清单（P1/P2 分段）。
   - 每批变更附带组件快照与视觉回归。

4. Style Policy
   - 禁止 important 作为常规样式策略。

## Verification Gates

- token 对齐检查（design vs renderer）。
- 静态扫描：颜色字面量与 important 门禁。
- Storybook 视觉回归快照。
