# Workbench Specification Delta

## Change: workbench-p5-00-contract-sync

### Requirement: Icon Bar（图标栏）[MODIFIED]

Icon Bar 按以下固定顺序排列入口（对齐 P2–P4 实际实现）：

| 位置     | ID               | 图标     | 说明                   | 状态        |
| -------- | ---------------- | -------- | ---------------------- | ----------- |
| 顶部 1   | `files`          | 文件夹   | 文件树（默认）         | 原有        |
| 顶部 2   | `search`         | 搜索     | 全文检索（P2）         | [ADDED]     |
| 顶部 3   | `outline`        | 列表     | 大纲                   | 原有        |
| 顶部 4   | `versionHistory` | 时钟     | 版本历史（P3）         | [ADDED]     |
| 顶部 5   | `memory`         | 大脑     | 记忆面板（P3）         | [ADDED]     |
| 顶部 6   | `characters`     | 人物     | 角色管理               | 原有        |
| 顶部 7   | `knowledgeGraph` | 节点图   | 知识图谱               | [MODIFIED] 原 `graph` |
| ~~顶部~~ | ~~`media`~~      | ~~图片~~ | ~~媒体~~               | [DEFERRED] V1 不交付，底层模块不存在 |
| 底部固定 | `settings`       | 齿轮     | 设置                   | 原有        |

> 变更理由：`search`、`versionHistory`、`memory` 在 P2–P4 实现中已加入代码并稳定运行。`media` 对应模块在 V1 范围内无 spec.md 定义，延后交付。`graph` → `knowledgeGraph` 与代码统一。

---

### Requirement: 右侧面板（AI 面板 / Info 面板 / Quality 面板）[MODIFIED]

右侧面板包含三个标签页：**AI 面板**、**Info 面板**和 **Quality 面板**，通过顶部标签切换。

`RightPanelType = "ai" | "info" | "quality"` [MODIFIED]

| 标签页         | 说明                                              | 状态    |
| -------------- | ------------------------------------------------- | ------- |
| AI 面板        | 对话交互区 + 技能按钮区 + AI 建议展示区           | 原有    |
| Info 面板      | 当前文档元信息（名称、字数、创建/修改时间、状态） | 原有    |
| Quality 面板   | Quality Gates 质量评估面板（P4）                   | [ADDED] |

> 变更理由：Quality 面板在 P4 Quality Gates 期间添加，功能已稳定，正式纳入 Spec。原 Spec "仅包含两个标签页" 描述更新为三个。

---

### Requirement: 项目切换器 [MODIFIED]

项目切换通过 IPC 通道完成（修正通道名以匹配实际契约）：

| IPC 通道                  | 通信模式         | 方向            | 用途                       | 状态       |
| ------------------------- | ---------------- | --------------- | -------------------------- | ---------- |
| `project:project:switch`  | Request-Response | Renderer → Main | 切换当前活动项目           | [MODIFIED] 原 `project:switch` |
| `project:project:list`    | Request-Response | Renderer → Main | 获取项目列表（按最近打开排序） | [MODIFIED] 原 `project:list:recent` |

> 变更理由：实际 IPC 契约（`ipc-generated.ts`、`ipc-contract.ts`、`projectStore.tsx`）统一使用 `project:project:` namespace 前缀。`project:list:recent` 不存在，最近项目通过 `project:project:list` 返回结果在前端排序实现。

---

## Out of Scope

- 不修改任何功能代码（本 change 仅对齐 Spec 文字）
- 不调整 IPC 契约本身
- IconBar UI 实现（→ workbench-p5-01）
- RightPanel 结构修正（→ workbench-p5-03）
- 项目切换器组件重写（→ workbench-p5-02）
