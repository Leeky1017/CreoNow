# 技术选型（锁定）

以下技术已锁定，禁止替换。如需变更，必须先提交 RFC 并获得 Owner 批准。

## 前端（Renderer）

| 技术         | 版本 / 约束       | 用途                 |
| ------------ | ----------------- | -------------------- |
| React        | 18                | UI 框架              |
| TypeScript   | strict mode       | 类型系统（全栈）     |
| Vite         | via electron-vite | 构建与 HMR           |
| Tailwind CSS | 4（CSS-first）    | 原子化样式           |
| Radix UI     | —                 | 无样式组件原语       |
| TipTap       | 2                 | 富文本编辑器         |
| Zustand      | —                 | 轻量状态管理         |
| Storybook    | —                 | 组件开发与可视化契约 |

## 后端（Main）

| 技术       | 版本 / 约束    | 用途           |
| ---------- | -------------- | -------------- |
| Electron   | —              | 桌面框架       |
| SQLite     | better-sqlite3 | 本地数据库     |
| sqlite-vec | —              | 向量搜索扩展   |
| Zod        | —              | 运行时参数校验 |

## 共享（Shared）

| 技术       | 版本 / 约束 | 用途                   |
| ---------- | ----------- | ---------------------- |
| TypeScript | strict mode | IPC 类型定义、共享常量 |

## 平台约束

- **Windows-first**：主要交付平台
- **Electron 安全模型**：渲染进程通过 `contextBridge` 暴露 IPC，禁止直接使用 `ipcRenderer`
- **本地优先**：数据存储在本地 SQLite，无云依赖
