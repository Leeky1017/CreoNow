#!/usr/bin/env bash
# wsl_storybook_url.sh — 输出 WSL IP 与 Storybook 访问 URL
# 
# Usage:
#   ./scripts/wsl_storybook_url.sh
#
# Output (示例):
#   WSL IP: 172.25.160.1
#   Storybook URL: http://172.25.160.1:6006
#
# 用途：
#   在 Windows 浏览器中访问 WSL 内运行的 Storybook，用于 QA Gate 验收。

set -euo pipefail

PORT="${STORYBOOK_PORT:-6006}"

# 动态获取 WSL IP（每次运行都重新读取，不写死）
# 优先使用 hostname -I 的第一个 IP
WSL_IP=$(hostname -I | awk '{print $1}')

if [[ -z "${WSL_IP}" ]]; then
    echo "Error: 无法获取 WSL IP 地址" >&2
    exit 1
fi

echo "WSL IP: ${WSL_IP}"
echo "Storybook URL: http://${WSL_IP}:${PORT}"
