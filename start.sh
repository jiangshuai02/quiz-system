#!/bin/bash
# 刷题系统启动脚本

echo "================================================"
echo "          智能刷题系统 - 启动脚本"
echo "================================================"
echo ""

# 检查Python
if ! command -v python3 &> /dev/null; then
    echo "❌ 未找到Python，请先安装Python 3.6+"
    exit 1
fi

echo "✅ Python已安装"

# 安装依赖
echo "📦 安装依赖包..."
pip3 install -q flask python-docx 2>/dev/null || pip install -q flask python-docx

# 启动应用
echo ""
echo "🚀 启动刷题系统..."
echo "📱 访问地址: http://localhost:5000"
echo "⏹️  按 Ctrl+C 停止服务"
echo ""
echo "================================================"
echo ""

python3 app.py
