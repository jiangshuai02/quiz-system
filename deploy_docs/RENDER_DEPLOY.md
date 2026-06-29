# 🚀 Render.com 部署指南

Render 提供免费的 Python Web 服务托管，支持 PostgreSQL 数据库。

## 📋 部署步骤

### 第1步：准备代码仓库

1. 在 GitHub 创建新仓库（如 `quiz-system`）
2. 上传以下文件到仓库：
   - `app.py`
   - `templates/index.html`
   - `requirements.txt`
   - `render.yaml`
   - `Procfile`
   - `runtime.txt`

**或者直接使用本目录的文件**

---

### 第2步：注册 Render 账号

1. 访问 https://render.com
2. 点击 "Get Started for Free"
3. 使用 GitHub/Google 账号注册（推荐 GitHub）

---

### 第3步：创建 Web Service

1. 登录 Render 控制台
2. 点击 "New +" 按钮
3. 选择 "Web Service"
4. 连接你的 GitHub 仓库
5. 配置服务：
   - **Name**: `quiz-system`（可自定义）
   - **Environment**: `Python 3`
   - **Region**: 选择最近的（如 `Oregon (US West)`）
   - **Branch**: `main`（或你的默认分支）
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
   - **Plan**: `Free`

6. 点击 "Advanced" 展开高级设置
7. 添加环境变量（可选）：
   - `SECRET_KEY`: 设置一个随机字符串

8. 点击 "Create Web Service"

**等待部署完成（约2-5分钟）**

---

### 第4步：添加数据库

1. 在 Render 控制台，点击 "New +"
2. 选择 "PostgreSQL"
3. 配置数据库：
   - **Name**: `quiz-db`
   - **Database**: `quiz`
   - **User**: `quiz_user`
   - **Plan**: `Free`
   - **Region**: 与 Web Service 相同

4. 点击 "Create Database"
5. 创建完成后，复制 "Internal Database URL"
6. 回到 Web Service 设置
7. 添加环境变量：
   - **Key**: `DATABASE_URL`
   - **Value**: 粘贴数据库 URL

8. 点击 "Save Changes"
9. 等待服务重新部署

---

### 第5步：访问应用

部署完成后，Render 会提供一个 `.onrender.com` 域名，如：
```
https://quiz-system-xxx.onrender.com
```

点击链接访问你的刷题系统！

---

## 🔧 常见问题

### Q1: 部署失败，提示 "ModuleNotFoundError: No module named 'flask'"

**原因**: `requirements.txt` 文件未正确上传或格式错误

**解决**:
1. 检查 `requirements.txt` 是否在仓库根目录
2. 确保文件内容格式正确（每行一个包）
3. 重新部署

---

### Q2: 应用启动后显示 "Application Error"

**原因**: 数据库未连接或环境变量未设置

**解决**:
1. 检查 `DATABASE_URL` 环境变量是否正确
2. 检查日志（Render 控制台的 "Logs" 标签）
3. 确保 PostgreSQL 数据库已创建并连接

---

### Q3: 免费版服务会自动休眠

**说明**: Render 免费版在 15 分钟无访问后会自动休眠，下次访问需要等待 30-60 秒唤醒。

**解决**: 
- 升级到付费版（7$/月）可避免休眠
- 或使用 [UptimeRobot](https://uptimerobot.com) 定时 ping 你的服务

---

### Q4: 如何更新应用？

**方法**: 推送代码到 GitHub 仓库，Render 会自动重新部署。

```bash
git add .
git commit -m "更新内容"
git push origin main
```

---

## 📊 免费版限制

| 资源 | 限制 |
|------|------|
| Web Service | 750 小时/月，自动休眠 |
| PostgreSQL | 1 GB 存储，90 天删除闲置数据库 |
| 带宽 | 100 GB/月 |
| 自定义域名 | 支持 |

---

## 🔗 相关链接

- Render 官网: https://render.com
- Render 文档: https://render.com/docs
- 本系统 GitHub 模板: （待创建）

---

## ✅ 部署检查清单

- [ ] GitHub 仓库已创建并上传代码
- [ ] Render 账号已注册
- [ ] Web Service 已创建
- [ ] PostgreSQL 数据库已创建
- [ ] `DATABASE_URL` 环境变量已设置
- [ ] 应用成功部署并可访问
- [ ] 测试 Word 导入功能
- [ ] 测试刷题功能

---

**🎉 部署成功！你的刷题系统已上线！**

访问地址: `https://your-app-name.onrender.com`
