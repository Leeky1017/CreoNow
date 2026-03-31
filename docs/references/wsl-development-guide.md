# CreoNow WSL2 开发指南

> 本项目在 **WSL2 (Windows Subsystem for Linux 2)** 环境下开发。
> Windows 浏览器访问 WSL 内服务时，有特殊的网络和路径规则。
> 本文档是所有开发者和 AI Agent 的必读参考。

---

## 一、环境概览

| 项目 | 值 |
|------|-----|
| OS | Ubuntu on WSL2 (kernel 6.6.87+) |
| 项目根目录 | `/home/leeky/work/CreoNow/` |
| 前端项目 | `/home/leeky/work/CreoNow/creonow-app/` |
| WSL2 IP | 动态分配（`hostname -I` 查看，通常 `172.18.x.x`） |
| Windows host IP | `172.18.240.1`（WSL 网关） |
| localhost 转发 | ✅ 已启用（`.wslconfig` 中 `localhostForwarding=true`） |

---

## 二、从 Windows 浏览器访问 WSL 服务

### 规则：直接用 `localhost`

由于 `.wslconfig` 已配置 `localhostForwarding=true`，Windows 浏览器可以直接使用：

```
http://localhost:<port>
```

**前提条件**：WSL 内的服务必须绑定到 `0.0.0.0`（而非仅 `127.0.0.1`）。

### 如果 `localhost` 不通

1. 检查服务是否绑定到 `0.0.0.0`：
   ```bash
   lsof -i :<port> | grep LISTEN
   # 应该看到 *:<port> 而非 127.0.0.1:<port>
   ```

2. 如果服务只绑定了 `127.0.0.1`，用 `--host 0.0.0.0` 参数重启。

3. 备选方案——使用 WSL IP：
   ```bash
   hostname -I | awk '{print $1}'
   # 在 Windows 浏览器中使用 http://<WSL-IP>:<port>
   ```

---

## 三、常用开发命令

### ⚠️ 重要：所有命令必须在 WSL 终端中运行

不要在 Windows CMD/PowerShell 中运行这些命令。如果你从 Agent 输出中复制命令，确保粘贴到 **WSL 终端**（Windows Terminal 中的 Ubuntu tab）。

### 进入项目

```bash
cd /home/leeky/work/CreoNow/creonow-app
```

> 注意：不是 `cd creonow-app`（除非你已经在 `/home/leeky/work/CreoNow/` 目录下）。
> 从 Windows 复制的命令可能包含不可见的 BOM 字符（`﻿`），导致 `Command not found`。
> 如果遇到此类错误，手动重新输入命令。

### 启动 Storybook

```bash
cd /home/leeky/work/CreoNow/creonow-app
npx storybook dev -p 6006 --host 0.0.0.0 --no-open
```

然后在 Windows 浏览器打开：**http://localhost:6006**

### 启动 Next.js 开发服务器

```bash
cd /home/leeky/work/CreoNow/creonow-app
npm run dev -- --hostname 0.0.0.0
```

然后在 Windows 浏览器打开：**http://localhost:3000**

### 构建验证

```bash
cd /home/leeky/work/CreoNow/creonow-app

# TypeScript 类型检查
npx tsc --noEmit

# Next.js 生产构建
npm run build

# Storybook 构建（仅检查，不启动服务器）
npx storybook build --quiet
```

---

## 四、端口占用排查

```bash
# 查看某端口是否被占用
lsof -i :<port> | grep LISTEN

# 查看所有开发相关端口
lsof -i :3000 -i :6006 -i :6007 2>/dev/null | grep LISTEN

# 结束占用进程（用实际 PID 替换）
kill <PID>
```

---

## 五、常见问题

### Q: 复制的命令报 `Command not found`
**A**: 从网页/文档复制的命令可能包含不可见的 Unicode 字符（如 BOM `﻿` 或零宽空格）。解决：在终端手动输入命令，不要复制粘贴。

### Q: Storybook 左侧有目录，但右侧一直转圈（Preview 永远 Loading）
**A**: 这通常是 Storybook(Vite) 的模块解析失败（常见是 `@/` alias 未生效）导致的。症状是左侧 stories 正常显示，但 iframe 无法真正加载 story 代码。

按下面顺序排查：

1. 查看 Storybook 终端日志是否有类似报错：
   ```text
   Failed to resolve import "@/lib/utils" ...
   Failed to resolve import "@/components/..." ...
   ```

2. 确保 `.storybook/main.ts` 中配置了 Vite alias：
   ```ts
   import { dirname, resolve } from "node:path";
   import { fileURLToPath } from "node:url";
   const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
   const srcRoot = resolve(projectRoot, "src");

   viteFinal: async (config) => {
     config.root = projectRoot;
     config.resolve = {
       ...config.resolve,
       alias: {
         ...(Array.isArray(config.resolve?.alias) ? {} : (config.resolve?.alias ?? {})),
         "@": srcRoot,
       },
     };
     return config;
   };
   ```

3. 重启 Storybook（必须全停再起）：
   ```bash
   # 找到 PID
   ps -eo pid,cmd | rg 'storybook dev -p 6006'

   # 杀掉对应 PID
   kill <PID>

   # 重启
   cd /home/leeky/work/CreoNow/creonow-app
   npx storybook dev -p 6006 --host 0.0.0.0 --no-open
   ```

4. 在 WSL 内快速验证模块是否可加载：
   ```bash
   curl -i -s http://localhost:6006/src/stories/CnButton.stories.tsx | head
   curl -i -s http://localhost:6006/src/components/ui/cn-button.tsx | head
   ```
   两条命令都应返回 `HTTP/1.1 200 OK`。

### Q: `localhost` 在 Windows 浏览器中无法访问
**A**: 
1. 确认服务绑定到 `0.0.0.0`（见第二节）
2. 确认 `.wslconfig` 中 `localhostForwarding=true`
3. 重启 WSL：在 PowerShell 中运行 `wsl --shutdown`，然后重新打开 WSL

### Q: WSL IP 变了怎么办
**A**: WSL2 的 IP 在每次 Windows 重启后可能变化。但只要 `localhostForwarding=true`，始终可以用 `localhost` 访问，不受 IP 变化影响。

### Q: Agent 输出的路径是 `/work/CreoNow/` 但实际路径不对
**A**: WSL 中的完整路径是 `/home/leeky/work/CreoNow/`。如果 Agent 省略了 `/home/leeky` 前缀，请自行补全。

---

## 六、AI Agent 注意事项

1. **路径**：项目根目录是 `/home/leeky/work/CreoNow/`，前端项目在 `/home/leeky/work/CreoNow/creonow-app/`。绝对路径必须完整。
2. **启动服务**：所有 dev server 必须加 `--host 0.0.0.0` 参数，否则 Windows 浏览器无法访问。
3. **浏览器地址**：告诉用户使用 `http://localhost:<port>`（不是 WSL IP）。
4. **命令输出**：给用户的命令必须是完整的、可直接在 WSL 终端运行的命令，包含 `cd` 到正确目录。
5. **复制安全**：输出命令时避免特殊 Unicode 字符，用纯 ASCII。
6. **Figma MCP**：如果 Figma MCP 连接失败，Agent 应自行排查并重试，不要中断任务去询问用户。

---

*最后更新：2026-03-31*
