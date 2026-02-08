# Document Management Specification Delta

## Change: document-management-p0-crud-types-status

### Requirement: 文档 CRUD 的 IPC 通道 [MODIFIED]

P0 基线阶段，文档管理必须先具备基础 CRUD IPC 能力，采用 Request-Response 通信模式，并保持跨进程契约一致：

| IPC 通道                   | 用途           |
| -------------------------- | -------------- |
| `file:document:create`     | 创建文档       |
| `file:document:read`       | 读取文档内容   |
| `file:document:update`     | 更新文档元信息 |
| `file:document:save`       | 保存文档内容   |
| `file:document:delete`     | 删除文档       |
| `file:document:list`       | 列出项目文档   |
| `file:document:getcurrent` | 获取当前文档   |
| `file:document:reorder`    | 调整排序       |

所有通道必须使用共享 TypeScript 类型合同，且 Renderer -> Main 输入必须经过运行时校验并返回可判定结果（`ok: true | false`）。

#### Scenario: CRUD IPC 通道在主进程与渲染进程保持同一份类型合同 [MODIFIED]

- **假设** 主进程 handler 与渲染进程调用都依赖共享 IPC 类型映射
- **当** 系统编译并运行契约校验测试
- **则** `create/read/update/save/delete/list/getcurrent/reorder` 八个通道的请求与响应类型保持一致
- **并且** 通道失败时返回 `ok: false` 与明确错误信息

#### Scenario: 删除文档时执行确认并保证项目至少保留一个文档 [MODIFIED]

- **假设** 项目内仅剩一个文档
- **当** 用户确认执行删除操作
- **则** 系统通过 `file:document:delete` 删除当前文档
- **并且** 自动创建一个新的空白章节文档并加载到编辑器

### Requirement: 文档类型体系 [MODIFIED]

P0 基线阶段必须支持以下文档类型及其创建入口：`chapter`、`note`、`setting`、`timeline`、`character`。

文档数据结构必须包含：`id`、`projectId`、`type`、`title`、`content`、`status`、`sortOrder`、`parentId`、`createdAt`、`updatedAt`。

类型体系必须支持扩展：新增文档类型时，不要求重写核心 CRUD 逻辑。

#### Scenario: 用户创建章节类型文档 [MODIFIED]

- **假设** 用户位于文件树面板
- **当** 用户选择「新建 -> 章节」
- **则** 系统通过 `file:document:create` 创建 `chapter` 类型文档
- **并且** 新文档以「未命名章节」加入文件树并进入可重命名状态

#### Scenario: 用户创建笔记类型文档 [MODIFIED]

- **假设** 用户位于文件树面板
- **当** 用户选择「新建 -> 笔记」
- **则** 系统创建 `note` 类型文档
- **并且** 文件树中以笔记图标区分显示

### Requirement: 文档状态管理 [MODIFIED]

P0 基线阶段必须支持 `draft` 与 `final` 两种状态，默认状态为 `draft`。状态切换通过 `file:document:updatestatus` 完成，并在文件树中可见（`final` 显示绿色圆点）。

#### Scenario: 用户将文档标记为定稿 [MODIFIED]

- **假设** 文档当前状态为 `draft`
- **当** 用户选择「标记为定稿」
- **则** 系统通过 `file:document:updatestatus` 更新为 `final`
- **并且** 文件树显示定稿标记，版本历史记录状态变更

#### Scenario: 编辑定稿文档时的确认与取消路径 [MODIFIED]

- **假设** 文档状态为 `final`
- **当** 用户尝试编辑文档
- **则** 系统弹出确认提示，说明继续编辑将回退为草稿
- **当** 用户确认
- **则** 文档状态切回 `draft` 并允许编辑
- **当** 用户取消
- **则** 文档内容不变且状态保持 `final`
