# 快速开始指南 - 3分钟部署刷题系统

## 🎯 系统功能一览

✅ **Word一键导入** - 自动解析题库  
✅ **5种题型** - 单选、多选、判断、填空、简答  
✅ **实时判错** - 即时反馈答案对错  
✅ **错题本** - 自动收集错题  
✅ **统计分析** - 学习进度可视化  

---

## 🚀 立即开始（3步）

### 第1步：安装依赖（1分钟）

**打开命令行（CMD/PowerShell），执行：**

```bash
pip install flask python-docx
```

**如果上述命令慢，使用国内镜像：**

```bash
pip install -i https://pypi.tuna.tsinghua.edu.cn/simple flask python-docx
```

**如果提示权限错误，加`--user`：**

```bash
pip install --user flask python-docx
```

---

### 第2步：启动系统（10秒）

**方法A - 双击启动（推荐）：**
1. 打开文件夹 `D:\shuati\quiz_system`
2. 双击 `start.bat`
3. 等待显示"Running on http://127.0.0.1:5000"

**方法B - 命令行启动：**
```bash
cd D:\shuati\quiz_system
python app.py
```

---

### 第3步：访问系统（立即）

打开浏览器，访问：
```
http://localhost:5000
```

🎉 **成功！** 你现在可以看到刷题系统的首页了。

---

## 📝 第一次使用 - 导入题库

### 方法1：使用示例题库

1. 先生成示例Word文档：
   ```bash
   cd D:\shuati\quiz_system
   python generate_sample.py
   ```
2. 会生成 `示例题库.docx` 文件
3. 在刷题系统中点击 "📥 导入"
4. 拖拽 `示例题库.docx` 到上传区域
5. 等待导入完成提示

### 方法2：手动创建Word题库

创建一个Word文档（.docx格式），按以下格式编写：

```
1. 下列哪个是Python的Web框架？
A. Django
B. NumPy
C. Pandas
D. Matplotlib
答案：A

2. Python是一种编译型语言。
答案：错

3. Python的Web框架____可以快速开发Web应用。
答案：Django
```

保存后，按方法1的步骤4-5导入。

---

## 🎯 开始刷题

1. 点击顶部导航 "✍️ 刷题"
2. 系统自动加载题目
3. 选择/输入答案
4. 点击 "提交答案"
5. 查看即时反馈（✅正确 / ❌错误）
6. 点击 "下一题" 继续

---

## 📊 查看统计

点击顶部导航 "📊 统计"，查看：
- 总题数
- 已答题数
- 正确数
- 正确率

---

## 🔧 常见问题快速解决

| 问题 | 原因 | 解决方法 |
|------|------|----------|
| 启动失败，提示"No module named 'flask'" | Flask未安装 | `pip install flask` |
| Word导入失败 | python-docx未安装 | `pip install python-docx` |
| 端口被占用 | 5000端口被占用 | 修改app.py最后一行的端口号 |
| 题型识别错误 | Word格式不规范 | 参考下方"Word格式规范" |

---

## 📝 Word格式规范（重要！）

### ✅ 正确格式

```
1. 题目内容
A. 选项1
B. 选项2
C. 选项3
D. 选项4
答案：A
```

### ❌ 错误格式

```
1. 题目内容
A) 选项1          ← 错误：不能用")"
答案：选A         ← 错误：必须是"答案：A"
```

### 格式要点

1. **题目编号** - 必须以数字开头（1. 2. 3.）
2. **选项标识** - 必须是 "A. " "B. "（点号）
3. **答案标识** - 必须包含 "答案：" 或 "正确答案："
4. **文件格式** - 必须是 .docx（不支持.doc）

---

## 🎨 界面预览

系统包含6个页面：

1. **🏠 首页** - 功能介绍
2. **✍️ 刷题** - 答题练习
3. **📖 题库** - 题目管理
4. **📥 导入** - Word导入 + 手动添加
5. **❌ 错题本** - 错题回顾
6. **📊 统计** - 数据分析

---

## 💾 数据说明

- **数据库文件** - `quiz.db`（自动创建）
- **位置** - `D:\shuati\quiz_system\quiz.db`
- **备份建议** - 定期复制quiz.db文件备份

---

## 🆘 需要帮助？

**问题1：我不知道如何打开命令行？**
- Windows：按 `Win + R`，输入 `cmd`，回车

**问题2：pip命令不存在？**
- 说明Python未安装或未添加到PATH
- 重新安装Python，勾选"Add Python to PATH"

**问题3：想要更多功能？**
- 本系统支持二次开发
- 可添加用户系统、题目分类、随机刷题等功能

---

## ✅ 检查清单

部署前确认：
- [ ] Python已安装（命令行输入 `python --version`）
- [ ] Flask已安装（`pip show flask`）
- [ ] python-docx已安装（`pip show python-docx`）
- [ ] 端口5000未被占用
- [ ] Word文档格式规范

---

## 🎉 完成！

现在你可以：
1. 导入题库
2. 开始刷题
3. 查看统计
4. 复习错题

**祝学习愉快！** 📚✨

---

**项目路径：** `D:\shuati\quiz_system`  
**访问地址：<ADDRESS_REMOVE>http://localhost:5000</ADDRESS_REMOVE>  
**问题反馈：** 查看 `DEPLOY.md` 或 `PROJECT_SUMMARY.md`
