# 🐍 PythonAnywhere 部署指南

PythonAnywhere 提供免费的 Python Web 托管，适合小型应用。

## 📋 部署步骤

### 第1步：注册账号

1. 访问 https://www.pythonanywhere.com
2. 点击 "Create a Beginner Account"（免费）
3. 填写用户名、密码、邮箱
4. 选择 "Beginner account (free)"

---

### 第2步：上传代码

**方法A - 通过 Web 界面上传：**

1. 登录 PythonAnywhere 控制台
2. 点击 "Files" 标签
3. 点击 "Upload a file"
4. 上传以下文件：
   - `app.py`
   - `templates/index.html`
   - `requirements.txt`

**方法B - 通过 Git 克隆（推荐）：**

1. 点击 "Consoles" 标签
2. 点击 "Bash" 启动终端
3. 执行：
   ```bash
   git clone https://github.com/你的用户名/quiz-system.git
   cd quiz-system
   ```

---

### 第3步：安装依赖

1. 在 "Consoles" 标签，启动 "Bash" 终端
2. 进入项目目录：
   ```bash
   cd quiz-system
   ```
3. 安装依赖：
   ```bash
   pip3 install --user -r requirements.txt
   ```
   **注意**: PythonAnywhere 免费版不能使用 `sudo` 或全局安装，必须使用 `--user`

---

### 第4步：创建 Web 应用

1. 点击 "Web" 标签
2. 点击 "Add a new web app"
3. 选择：
   - **Framework**: `Flask`
   - **Python version**: `3.11`
   - **Path**: `/home/你的用户名/quiz-system`
4. 点击 "Next" 完成配置

---

### 第5步：配置 WSGI 文件

1. 在 "Web" 标签，找到 "WSGI configuration file"
2. 点击链接编辑（如 `/var/www/你的用户名_pythonanywhere_com_wsgi.py`）
3. 替换为以下内容：

```python
import sys
import os

# 项目路径
path = '/home/你的用户名/quiz-system'
if path not in sys.path:
    sys.path.append(path)

# 导入应用
from app import app as application
```

4. 点击 "Save"

---

### 第6步：设置静态文件（可选）

1. 在 "Web" 标签，找到 "Static files"
2. 添加：
   - **URL**: `/static/`
   - **Path**: `/home/你的用户名/quiz-system/static/`

---

### 第7步：重启应用

1. 在 "Web" 标签，点击 "Reload" 按钮
2. 等待应用重启（约10-30秒）

---

### 第8步：访问应用

访问地址：
```
http://你的用户名.pythonanywhere.com
```

🎉 **成功！** 你的刷题系统已上线！

---

## 🗄️ 数据库配置

PythonAnywhere 免费版不支持外部数据库，但可以使用 SQLite。

**修改 app.py 使用 SQLite：**

在 `app.py` 开头添加：

```python
import os

# 使用 SQLite（PythonAnywhere 免费版）
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'quiz.db')
```

---

## 🔧 常见问题

### Q1: 应用启动后显示 "Internal Server Error"

**原因**: WSGI 配置错误或依赖未安装

**解决**:
1. 检查 "Web" 标签的 "Error log"
2. 确保依赖已安装（`pip3 list --user`）
3. 确保 WSGI 文件路径正确

---

### Q2: 静态文件（CSS/JS）加载失败

**原因**: 静态文件路径未配置

**解决**:
1. 在 "Web" 标签，配置 "Static files"
2. 确保 `static/` 目录存在

---

### Q3: 如何更新应用？

**方法**: 上传新文件后，点击 "Reload" 按钮

```bash
# 或通过 Git 更新
cd ~/quiz-system
git pull origin main
# 然后在 Web 标签点击 "Reload"
```

---

### Q4: 免费版限制

| 资源 | 限制 |
|------|------|
| CPU 时间 | 100 秒/天 |
| 磁盘空间 | 512 MB |
| 数据库 | SQLite（不支持外部数据库） |
| 带宽 | 无限制（但速度受限） |
| 自定义域名 | 不支持（免费版） |

---

## 📊 免费版 vs 付费版

| 功能 | 免费版 | $5/月版 | $12/月版 |
|------|---------|----------|-----------|
| CPU 时间 | 100秒/天 | 无限制 | 无限制 |
| 磁盘空间 | 512 MB | 10 GB | 20 GB |
| 数据库 | SQLite | MySQL | MySQL |
| 自定义域名 | ❌ | ✅ | ✅ |
|  Always-on | ❌ | ✅ | ✅ |

**建议**: 如果用于生产环境，推荐 $5/月版。

---

## 🔗 相关链接

- PythonAnywhere 官网: https://www.pythonanywhere.com
- PythonAnywhere 文档: https://help.pythonanywhere.com
- Flask 部署指南: https://help.pythonanywhere.com/pages/Flask/

---

## ✅ 部署检查清单

- [ ] 账号已注册（Beginner Account）
- [ ] 代码已上传（通过 Git 或 Web 界面）
- [ ] 依赖已安装（`pip3 install --user -r requirements.txt`）
- [ ] Web 应用已创建（Flask + Python 3.11）
- [ ] WSGI 文件已配置
- [ ] 应用已重启
- [ ] 访问 `http://你的用户名.pythonanywhere.com` 成功
- [ ] 测试刷题功能
- [ ] 测试 Word 导入功能（可能需要升级到付费版）

---

## 💡 进阶技巧

### 1. 使用 MySQL 数据库（付费版）

1. 在 "Databases" 标签创建 MySQL 数据库
2. 修改 `app.py`：
   ```python
   app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://用户名:密码@mysql.pythonanywhere-services.com/数据库名'
   ```

### 2. 设置 Always-on（付费版）

在 "Web" 标签，勾选 "Always on"，应用将不会休眠。

### 3. 查看日志

在 "Web" 标签，点击：
- "Error log" - 错误日志
- "Server log" - 服务器日志
- "Access log" - 访问日志

---

**🎉 部署成功！你的刷题系统已在 PythonAnywhere 上线！**

访问地址: `http://你的用户名.pythonanywhere.com`
