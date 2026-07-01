# 🚀 推送到GitHub - 详细指南

## 📋 目录
1. [方案A：网页创建+令牌推送（推荐）](#方案a网页创建令牌推送推荐)
2. [方案B：安装GitHub CLI（最简单）](#方案b安装github-cli最简单)
3. [方案C：使用GitHub Desktop](#方案c使用github-desktop)

---

## 方案A：网页创建+令牌推送（推荐） ⭐⭐⭐⭐⭐

### 步骤1：在GitHub创建仓库

1. 访问 [GitHub](https://github.com) 并登录
   - 账号：`2992393861@qq.com`
   - 密码：`Js17539363075`

2. 点击右上角 `+` → `New repository`

3. 填写仓库信息：
   - **Repository name**: `quiz-system`（或你喜欢的名字）
   - **Description**: `智能刷题系统 - 支持Word导入、题型识别、实时判错`
   - 选择 `Public`（免费账号只能创建公开仓库）
   - ⚠️ **不要**勾选 `Initialize this repository with a README`
   - 点击 `Create repository`

4. 创建成功后，GitHub会显示一个页面，包含推送命令

### 步骤2：生成个人访问令牌（PAT）

⚠️ **为什么需要令牌？** GitHub不再支持用密码推送代码，需要用令牌代替密码。

1. 点击右上角头像 → `Settings`

2. 在左侧菜单，滚动到底部，点击 `Developer settings`

3. 点击 `Personal access tokens` → `Tokens (classic)`

4. 点击 `Generate new token` → `Generate new token (classic)`

5. 填写令牌信息：
   - **Note**: `quiz-system deploy`（令牌名称，随便写）
   - **Expiration**: 选择 `90 days`（90天后过期）或 `No expiration`（不过期）
   - **勾选权限**：
     - ✅ `repo`（完整仓库权限）
     - ✅ `workflow`（如果需要GitHub Actions）

6. 滚动到底部，点击 `Generate token`

7. ⚠️ **重要**：立即复制生成的令牌！
   - 它以 `ghp_` 开头
   - 例如：`ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - **只显示一次**，如果没复制，需要重新生成

### 步骤3：推送代码到GitHub

回到Git Bash，执行以下命令：

```bash
# 进入项目目录
cd D:/shuati/quiz_system

# 添加远程仓库（替换成你的GitHub用户名和仓库名）
git remote add origin https://github.com/你的用户名/quiz-system.git

# 推送代码到GitHub
git push -u origin master
```

**当提示输入用户名和密码时：**
- **Username**: 输入你的GitHub用户名（不是邮箱）
- **Password**: 粘贴刚才复制的令牌（⚠️ 输入时不会显示，这是正常的）

✅ 推送成功后，访问 `https://github.com/你的用户名/quiz-system`，就能看到你的代码了！

---

## 方案B：安装GitHub CLI（最简单） ⭐⭐⭐⭐⭐

### 为什么推荐？
- 自动处理认证
- 可以直接在命令行创建仓库
- 不需要手动生成令牌

### 安装步骤

#### Windows安装

1. 下载GitHub CLI安装包：
   - 访问：https://cli.github.com/
   - 点击 `Download for Windows`
   - 下载并安装

2. 安装完成后，打开**新的** Git Bash窗口，执行：

```bash
# 认证GitHub账号
gh auth login
```

3. 按照提示操作：
   - `What account do you want to log into?` → 选择 `GitHub.com`
   - `What is your preferred protocol for Git operations?` → 选择 `HTTPS`
   - `Authenticate Git with your GitHub credentials?` → 选择 `Y`
   - `How would you like to authenticate GitHub CLI?` → 选择 `Login with a web browser`

4. GitHub CLI会显示一个代码，例如：
   ```
   ! First copy your one-time code: XXXX-XXXX
   Press Enter to open github.com in your browser...
   ```

5. 按回车，浏览器会自动打开GitHub登录页面

6. 输入显示的代码（`XXXX-XXXX`），点击 `Continue`

7. 授权成功后，回到Git Bash，你会看到：
   ```
   Authentication complete.
   ✓ Logged in as 你的用户名
   ```

8. 创建GitHub仓库并推送：

```bash
# 进入项目目录
cd D:/shuati/quiz_system

# 创建GitHub仓库（会自动创建并推送）
gh repo create quiz-system --public --push
```

或者，如果仓库已经手动创建了：

```bash
# 添加远程仓库
git remote add origin https://github.com/你的用户名/quiz-system.git

# 推送代码
git push -u origin master
```

✅ 完成！现在你的代码已经在GitHub上了。

---

## 方案C：使用GitHub Desktop（图形界面） ⭐⭐⭐⭐

### 适合不喜欢命令行的用户

1. 下载并安装 [GitHub Desktop](https://desktop.github.com/)

2. 登录你的GitHub账号

3. 点击 `File` → `Add local repository`

4. 选择 `D:\shuati\quiz_system` 目录

5. 点击 `Publish repository`

6. 填写仓库信息：
   - **Name**: `quiz-system`
   - **Description**: `智能刷题系统`
   - 勾选 `Keep this code private`（如果想要私有仓库，需要付费）

7. 点击 `Publish repository`

✅ 完成！代码会自动推送到GitHub。

---

## 🔧 常见问题

### ❓ 推送时出现403错误

**原因**：令牌权限不足或已过期

**解决**：
1. 重新生成令牌，确保勾选 `repo` 权限
2. 更新本地存储的凭据：
   ```bash
   git config --global credential.helper wincred
   ```
   然后重新推送，会提示输入用户名和令牌

### ❓ 忘记复制令牌

**解决**：重新生成令牌
1. 访问 [GitHub Settings](https://github.com/settings/tokens)
2. 删除旧的令牌
3. 重新生成新令牌
4. 立即复制保存

### ❓ 推送后GitHub显示空白

**原因**：分支名称不匹配

**解决**：
```bash
# 查看当前分支
git branch

# 如果是 master，重命名为 main
git branch -M main

# 推送
git push -u origin main
```

### ❓ 想删除远程仓库

**解决**：
1. 访问你的GitHub仓库
2. 点击 `Settings` → 滚动到底部
3. 点击 `Delete this repository`
4. 输入仓库名称确认删除

---

## ✅ 推送成功检查清单

- [ ] 代码已提交到本地仓库（`git commit`）
- [ ] 远程仓库已创建（GitHub上能看到仓库）
- [ ] 已添加远程地址（`git remote add origin ...`）
- [ ] 代码已推送（`git push -u origin master`）
- [ ] GitHub上能看到所有文件

---

## 🎯 下一步：部署到云平台

代码推送到GitHub后，就可以部署到免费云平台了：

1. **Render.com**（推荐）
   - 访问 https://render.com
   - 用GitHub登录
   - 点击 `New +` → `Web Service`
   - 选择 `quiz-system` 仓库
   - 按照 `免费部署指南.md` 操作

2. **Railway.app**
   - 访问 https://railway.app
   - 用GitHub登录
   - 点击 `New Project` → `Deploy from GitHub repo`
   - 选择 `quiz-system` 仓库

---

## 📞 需要帮助？

如果遇到问题，告诉我：
- 执行到哪一步失败了
- 完整的错误信息（截图或复制文本）

我会帮你解决！
