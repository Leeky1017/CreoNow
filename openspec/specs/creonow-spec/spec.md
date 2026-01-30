# CreoNow 规范

## 1. 项目定位

CreoNow 是一个 AI 驱动的文字创作 IDE，为创作者提供类似 Cursor 的智能写作体验。

## 2. 核心功能

- 富文本编辑器（基于 TipTap）
- AI 辅助写作
- 项目/文档管理
- 版本历史
- 导出功能

## 3. 技术架构

### 3.1 Monorepo 结构

- `apps/desktop/main` - Electron 主进程（后端）
- `apps/desktop/renderer` - Electron 渲染进程（前端）
- `packages/shared` - 共享类型和工具

### 3.2 技术栈锁定

以下技术选型已锁定，禁止替换：

| 技术 | 用途 | 状态 |
|-----|------|------|
| React 18 | 前端框架 | 锁定 |
| TypeScript | 类型系统 | 锁定 |
| Vite | 构建工具 | 锁定 |
| Tailwind CSS 4 | 样式 | 锁定 |
| Radix UI | 组件原语 | 锁定 |
| TipTap 2 | 富文本编辑器 | 锁定 |
| Zustand | 状态管理 | 锁定 |
| Electron | 桌面框架 | 锁定 |
| SQLite | 本地数据库 | 锁定 |

## 4. 设计规范

设计基准文档：`design/Variant/DESIGN_SPEC.md`

所有 UI 实现必须严格遵循设计规范。
