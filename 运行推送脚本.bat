@echo off
chcp 65001 >nul
echo ========================================
echo   智能刷题系统 - GitHub自动推送工具
echo ========================================
echo.

REM 检查是否在正确目录
if not exist "app.py" (
    echo ❌ 错误：请在 quiz_system 目录运行此脚本
    echo 当前目录：%CD%
    echo.
    pause
    exit /b 1
)

echo ✅ 当前目录正确：%CD%
echo.

REM 运行PowerShell脚本并保持窗口打开
powershell -ExecutionPolicy Bypass -NoExit -File "%~dp0自动推送脚本.ps1"

REM 如果上面命令退出了，这里会暂停
pause
