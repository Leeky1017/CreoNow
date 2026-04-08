> 本文件是 gates-design 的一部分，完整索引见 [docs/references/gates-design/README.md](README.md)

# L3 — 发布门禁（远景，尚未实现）

- 触发时机：合并到 main（CD）
- 优先级：P3（远景）
- 状态：**尚未实现**

---

## 检查项

- 自动版本号 + Changelog
- 构建 Electron 产物
- 灰度发布
- error rate 检查

## 失败行为

自动回滚

## 与其他层级的关系

L3 是 L1（本地门禁，见 [l1-local-gates.md](l1-local-gates.md)）和 L2（PR 门禁，见 [l2-pr-gates.md](l2-pr-gates.md)）之后的最后防线。只有通过 L1 + L2 的代码才会进入 L3 流程。
