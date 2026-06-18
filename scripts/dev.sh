#!/usr/bin/env bash
# 一键启动前端 + 后端开发服务器（单窗口，日志混合输出，Ctrl+C 一起停）
cd "$(dirname "$0")/.." || exit 1
trap 'kill 0' EXIT
(cd server && npm run dev) &
(cd client && npm run dev) &
wait
