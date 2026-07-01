@echo off
chcp 65001 >nul
title GitHub代码推送工具

:START
cls
echo ========================================
echo  智能刷题系统 - GitHub推送工具
echo ========================================
echo.
echo 请选择操作方式：
echo.
echo  [1] 自动推送（需要GitHub CLI）
echo  [2] 手动推送（提供详细步骤）
echo  [3] 退出
echo.
set /p choice="请输入选项 (1-3): "

if "%choice%"=="1" goto AUTO
if "%choice%"=="2" goto MANUAL
if "%choice%"=="3" goto END

echo.
echo ❌ 无效选项，请重新选择
pause
goto START

:AUTO
cls
echo.
echo 🔧 自动推送模式
echo.
echo 正在检查环境...
echo.

REM 检查Git
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Git未安装
    echo    请访问：https://git-scm.com/download/win
    pause
    goto START
)

REM 检查GitHub CLI
gh --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  GitHub CLI未安装
    echo    正在打开下载页面...
    start https://cli.github.com/
    echo.
    echo 请安装后重新运行此脚本
    pause
    goto START
)

echo ✅ 环境检查通过
echo.
echo 🔐 即将打开浏览器进行GitHub登录...
pause

REM 登录GitHub
gh auth login --web --git-protocol https --hostname github.com
if %errorlevel% neq 0 (
    echo.
    echo ❌ 登录失败
    pause
    goto START
)

echo.
echo ✅ 登录成功！
echo.
echo 📝 正在创建仓库并推送代码...
echo.

REM 创建仓库并推送
gh repo create quiz-system --public --push --source=. --remote=origin
if %errorlevel% neq 0 (
    echo.
    echo ⚠️  创建失败，尝试仅推送...
    git push -u origin master
)

echo.
echo ========================================
echo  ✅ 完成！代码已推送到GitHub
echo ========================================
echo.
echo 仓库地址：
for /f "tokens=*" %%a in ('gh repo view --json url --jq .url') do echo     %%a
echo.
pause
goto START

:MANUAL
cls
echo.
echo 📖 手动推送步骤
echo ========================================
echo.
echo 步骤1：在GitHub创建仓库
echo   1. 访问 https://github.com
echo   2. 登录（2992393861@qq.com）
echo   3. 点击右上角 + → New repository
echo   4. 名称：quiz-system
echo   5. 选择 Public
echo   6. 不要勾选初始化选项
echo   7. 点击 Create repository
echo.
echo 步骤2：生成访问令牌
echo   1. 点击右上角头像 → Settings
echo   2. 滚动到底部 → Developer settings
echo   3. Personal access tokens → Tokens (classic)
echo   4. Generate new token
echo   5. 勾选 repo 权限
echo   6. 点击 Generate token
echo   7. 复制令牌（ghp_开头）
echo.
echo 步骤3：推送代码
echo   1. 打开Git Bash
echo   2. 运行以下命令：
echo.
echo      cd D:/shuati/quiz_system
echo      git remote add origin https://github.com/你的用户名/quiz-system.git
echo      git push -u origin master
echo.
echo   3. 用户名：输入你的GitHub用户名
echo   4. 密码：粘贴刚才复制的令牌
echo.
echo 完成后，访问你的GitHub仓库查看代码
echo.
pause
goto START

:END
exit
