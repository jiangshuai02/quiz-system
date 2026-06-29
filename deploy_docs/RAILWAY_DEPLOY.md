# 🚂 Railway 部署指南

Railway 提供简单的 Python Web 服务托管，支持多种数据库。

## 📋 部署步骤

### 第1步：准备代码仓库

1. 在 GitHub 创建新仓库
2. 上传以下文件：
   - `app.py`
   - `templates/index.html`
   - `requirements.txt`
   - `railway.json`
   - `Procfile`
   - `runtime.txt`

---

### 第2步：注册 Railway 账号

1. 访问 https://railway.app
2. 点击 "Start a New Project"
3. 使用 GitHub 账号注册（推荐）

---

### 第3步：创建项目

**方法A - 从 GitHub 部署（推荐）：**

1. 登录 Railway 控制台
2. 点击 "New Project"
3. 选择 "Deploy from GitHub repo"
4. 授权 Railway 访问你的 GitHub
5. 选择你的 `quiz-system` 仓库
6. Railway 会自动检测 Python 项目并部署

**方法B - 使用 Railway CLI：**

```bash
# 安装 Railway CLI
npm install -g @railway/cli

# 登录
railway login

# 初始化项目
railway init

# 部署
railway up
```

---

### 第4步：添加数据库

1. 在 Railway 项目页面，点击 "New"
2. 选择 "Database"
3. 选择 "PostgreSQL"
4. Railway 会自动创建数据库并注入 `DATABASE_URL` 环境变量

**等待数据库创建完成（约1-2分钟）**

---

### 第5步：配置环境变量

Railway 会自动设置 `DATABASE_URL`，你还需要设置：

1. 在项目页面，点击你的 Web 服务
2. 选择 "Variables" 标签
3. 点击 "New Variable"
4. 添加：
   - **Name**: `SECRET_KEY`
   - **Value**: 一个随机字符串（如 `my-quiz-system-secret-2026`）

---

### 第6步：访问应用

部署完成后，Railway 会生成一个 `.railway.app` 域名，如：
```
https://quiz-system-production.up.railway.app
```

点击 "View" 按钮访问你的应用！

---

## 🔧 常见问题

### Q1: 部署失败，提示 "No Procfile found"

**原因**: `Procfile` 文件不存在或格式错误

**解决**:
1. 确保 `Procfile` 在仓库根目录
2. 文件内容应为：`web: gunicorn app:app`
3. 注意 `P` 大写，`rocfile` 小写

---

### Q2: 应用启动后显示 "Application crashed"

**原因**: 依赖包未安装或代码错误

**解决**:
1. 检查 "Deployments" 标签的日志
2. 确保 `requirements.txt` 包含所有依赖
3. 本地测试 `gunicorn app:app` 是否能启动

---

### Q3: 如何更新应用？

**方法**: 推送代码到 GitHub，Railway 会自动重新部署。

```bash
git add .
git commit -m "更新内容"
git push origin main
```

---

### Q4: 免费版限制

Railway 提供 **$5 免费额度/月**，相当于：
- 约 500 小时的运行时间
- 或 1 个小应用在免费额度内可运行约 20 天

**建议**: 
- 使用 PostgreSQL 的免费层
- 不使用时暂停服务（在 Railway 控制台）

---

## 📊 免费版限制

| 资源 | 限制 |
|------|------|
| 免费额度 | $5/月 |
| Web Service | 自动休眠（无流量时） |
| PostgreSQL | 1 GB 存储 |
| 带宽 | 无限（但受额度限制） |
| 自定义域名 | 支持 |

---

## 🔗 相关链接

- Railway 官网: https://railway.app
- Railway 文档: https://docs.railway.app
- Railway CLI: https://docs.railway.app/develop/cli

---

## ✅ 部署检查清单

- [ ] GitHub 仓库已创建并上传代码
- [ ] Railway 账号已注册
- [ ] 项目已创建并从 GitHub 部署
- [ ] PostgreSQL 数据库已添加
- [ ] `DATABASE_URL` 环境变量已自动设置
- [ ] `SECRET_KEY` 环境变量已设置
- [ ] 应用成功部署并可访问
- [ ] 测试 Word 导入功能
- [ ] 测试刷题功能

---

## 💡 进阶技巧

### 1. 自定义域名

1. 在项目页面，点击 Web 服务
2. 选择 "Settings" 标签
3. 点击 "Domains"
4. 添加你的域名并按提示配置 DNS

### 2. 查看日志

1. 在项目页面，点击 Web 服务
2. 选择 "Deployments" 标签
3. 点击最新的部署，查看日志

### 3. 回滚到之前的版本

1. 在 "Deployments" 标签
2. 找到想要回滚的版本
3. 点击 "..." 按钮，选择 "Redeploy"

---

**🎉 部署成功！你的刷题系统已上线！**

访问地址: `https://your-app-name.up.railway.app`
