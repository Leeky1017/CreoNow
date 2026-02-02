# 文件树面板组合验收

## 涉及组件

- TreeItem (文件/文件夹节点)
- Icon (文件类型图标)
- ContextMenu (右键菜单)
- EmptyState (空状态)
- Skeleton (加载状态)

---

## 验收点

### 基础渲染

- [ ] 文件夹和文件正确区分显示
- [ ] 文件类型图标正确
- [ ] 层级缩进正确（每级 16px）
- [ ] 树形结构正确展示

### 交互状态

- [ ] 选中项高亮 (--color-bg-selected)
- [ ] 悬停项背景变化 (--color-bg-hover)
- [ ] 展开/折叠动画流畅
- [ ] 键盘导航 (↑↓←→)

### 展开折叠

- [ ] 点击展开/折叠图标切换
- [ ] 点击文件夹行展开/折叠
- [ ] 展开状态持久化
- [ ] 动画时长 var(--duration-normal)

### 选中行为

- [ ] 单击选中文件
- [ ] 双击打开文件
- [ ] 多选支持 (Cmd/Ctrl+Click)
- [ ] 范围选择 (Shift+Click)

### 右键菜单

- [ ] 右键显示上下文菜单
- [ ] 菜单项：新建、重命名、删除、复制、粘贴
- [ ] 点击菜单外区域关闭
- [ ] Escape 键关闭

### 拖拽排序

- [ ] 拖拽开始: 源项目 opacity: 0.5
- [ ] 拖拽中: 目标位置显示 2px 指示线
- [ ] 放置区域: 目标文件夹 background 变化
- [ ] 禁止拖入自身子节点

### 边界状态

- [ ] 空状态显示引导 ("暂无文件" + 新建按钮)
- [ ] 加载中显示 Skeleton
- [ ] 加载失败显示错误 + 重试

### 内容边界

- [ ] 超长文件名截断 (text-ellipsis)
- [ ] 特殊字符正确显示
- [ ] 深层嵌套（10+ 层）正确缩进

---

## Props 接口

```typescript
interface FileTreeProps {
  items: FileTreeItem[];
  selectedId?: string;
  expandedIds: string[];
  onSelect: (id: string) => void;
  onExpand: (id: string) => void;
  onCollapse: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, targetId: string) => void;
  onContextMenu: (id: string, event: React.MouseEvent) => void;
}

interface FileTreeItem {
  id: string;
  name: string;
  type: "file" | "folder";
  children?: FileTreeItem[];
}
```

---

## Story 文件

`features/file-tree/FileTree.stories.tsx`

```typescript
export const Default: Story = {
  args: {
    items: mockFileTree,
  },
};

export const Empty: Story = {
  args: {
    items: [],
  },
};

export const Loading: Story = {
  args: {
    loading: true,
  },
};

export const DeepNesting: Story = {
  args: {
    items: deepNestedTree, // 10 层嵌套
  },
};

export const LongNames: Story = {
  args: {
    items: longNamedFiles, // 超长文件名
  },
};
```

---

## 常见陷阱

| 陷阱                | 检查项                       |
| ------------------- | ---------------------------- |
| 空状态未处理 (#6)   | items=[] 时显示 EmptyState   |
| 加载状态未处理 (#7) | loading=true 时显示 Skeleton |
| 超长文本 (#16)      | 长文件名是否截断             |
| 键盘导航缺失 (#13)  | 方向键是否可用               |

---

## 验收状态

- [ ] AI 自检通过
- [ ] 用户验收通过
