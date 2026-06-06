@echo off
rem 一键启动前端 + 后端开发服务器（单窗口，日志混合输出，关窗即停）
cd /d "%~dp0.."
start /b cmd /c "cd /d server && npm run dev"
cd /d client && npm run dev
