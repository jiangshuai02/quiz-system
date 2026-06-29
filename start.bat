@echo off
chcp 65001 >nul
echo ================================================
echo           智能刷题系统 - 启动脚本
echo ================================================
echo.

REM 检查Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 未找到Python，请先安装Python 3.6+
    pause
    exit /b 1
)

echo ✅ Python已安装
echo.

REM 安装依赖
echo 📦 安装依赖包...
pip install -q flask python-docx

REM 启动应用
echo.
echo 🚀 启动刷题系统...
echo 📱 访问地址: http://localhost:5000
echo ⏹️  按 Ctrl+C 停止服务
echo.
echo ================================================
echo.

python app.py
pause
