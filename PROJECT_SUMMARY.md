# 智能刷题系统 - 项目总结

## ✅ 已完成功能

### 核心功能
✅ **Word一键导入** - 支持.docx格式，自动解析题目  
✅ **题型自动识别** - 单选题、多选题、判断题、填空题、简答题  
✅ **实时判错** - 提交答案后立即显示对错  
✅ **错题本** - 自动收集答错题目  
✅ **统计分析** - 正确率、答题数、按题型统计  
✅ **手动添加** - 支持界面手动添加题目  
✅ **题库管理** - 查看、删除题目  

### 技术特性
- **后端:** Python Flask + SQLite
- **前端:** 原生HTML/CSS/JS（单文件，响应式）
- **解析:** python-docx（Word解析）
- **部署:** 一键启动脚本

---

## 📂 项目文件结构

```
D:\shuati\quiz_system\
├── app.py              ← Flask后端主程序（数据库初始化、题型识别、路由）
├── templates\
│   └── index.html      ← 前端界面（单文件，内联样式）
├── start.bat           ← Windows启动脚本
├── start.sh            ← Linux/Mac启动脚本
├── generate_sample.py  ← 示例Word文档生成脚本
├── README.md           ← 使用说明
├── DEPLOY.md           ← 部署指南
└── PROJECT_SUMMARY.md ← 本文件
```

---

## 🚀 使用步骤

### 1. 安装依赖
```bash
pip install flask python-docx
```

### 2. 启动系统
**Windows:**
```bash
双击 start.bat
```

**或命令行:**
```bash
cd D:\shuati\quiz_system
python app.py
```

### 3. 访问系统
打开浏览器访问: http://localhost:5000

---

## 📝 Word题库格式示例

创建一个Word文档（.docx），按以下格式编写：

```
1. 下列哪个是Python的Web框架？
A. Django
B. NumPy
C. Pandas
D. Matplotlib
答案：A

2. 下列哪些是Python的Web框架？（多选）
A. Django
B. Flask
C. NumPy
D. Tornado
答案：A,B,D

3. Python是一种编译型语言。
答案：错

4. Python的Web框架____可以快速开发Web应用。
答案：Django

5. 简述Django的MVT架构。
答案：Model负责数据处理，View负责业务逻辑，Template负责页面展示。
```

---

## 🎯 功能页面说明

### 首页（🏠 首页）
- 系统功能介绍
- 快速开始引导

### 刷题页面（✍️ 刷题）
- 顺序显示题目
- 选择/填写答案
- 实时判错反馈
- 进度条显示

### 题库管理（📖 题库）
- 查看所有题目列表
- 按题型筛选
- 删除题目

### Word导入（📥 导入）
- 拖拽上传Word文档
- 点击上传
- 自动解析并导入数据库
- 手动添加题目表单

### 错题本（❌ 错题本）
- 查看所有答错题目
- 重新练习

### 统计分析（📊 统计）
- 总题数
- 已答题数
- 正确数
- 正确率
- 按题型分布

---

## 🔍 题型识别规则

系统会自动识别题型，规则如下：

| 题型 | 识别规则 | 答案格式 |
|------|----------|----------|
| 单选题 | 有A、B、C、D选项 | A / B / C / D |
| 多选题 | 题目含"多选"标识 | A,B,D（逗号分隔） |
| 判断题 | 答案为"对/错" | 对 / 错 |
| 填空题 | 题目含下划线或空格 | 文本答案 |
| 简答题 | 无明确选项 | 文本答案（需人工批改） |

---

## 💾 数据库结构

系统使用SQLite数据库（quiz.db），包含两张表：

### questions表（题目表）
```sql
CREATE TABLE questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,              -- 题型
    question TEXT NOT NULL,          -- 题目内容
    options TEXT,                   -- 选项（用|分隔）
    answer TEXT NOT NULL,           -- 正确答案
    explanation TEXT,              -- 解释说明
    created_at TIMESTAMP           -- 创建时间
);
```

### records表（答题记录表）
```sql
CREATE TABLE records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER,           -- 题目ID
    user_answer TEXT,             -- 用户答案
    is_correct INTEGER,           -- 是否正确（0/1）
    created_at TIMESTAMP,         -- 答题时间
    FOREIGN KEY (question_id) REFERENCES questions (id)
);
```

---

## 🎨 界面特性

- **响应式设计** - 支持桌面和移动端
- **渐变主题** - 紫色渐变配色
- **卡片布局** - 现代化卡片设计
- **即时反馈** - 绿色正确、红色错误
- **进度显示** - 实时显示答题进度

---

## 🔧 自定义修改

### 修改端口
编辑`app.py`最后一行：
```python
app.run(debug=True, port=5001)  # 改为其他端口
```

### 修改界面样式
编辑`templates/index.html`中的`<style>`部分

### 添加新题型
1. 修改`app.py`中的`identify_question_type()`函数
2. 修改前端界面添加新题型选项

---

## 📈 扩展功能建议

- [ ] 用户系统（注册/登录）
- [ ] 题目分类/标签管理
- [ ] 随机刷题模式
- [ ] 定时刷题提醒
- [ ] 导出错题PDF
- [ ] 题目搜索功能
- [ ] 批量删除题目
- [ ] 数据导入导出
- [ ] 移动端APP

---

## ⚠️ 注意事项

1. **Word格式** - 必须是`.docx`格式，不支持`.doc`
2. **答案格式** - 必须包含"答案："或"正确答案："标识
3. **编码问题** - Word文档建议使用UTF-8编码
4. **简答题** - 目前不支持自动判分，需人工批改
5. **数据备份** - 定期备份`quiz.db`数据库文件

---

## 🐛 故障排除

### 问题1: 启动失败
**原因:** Flask未安装  
**解决:** `pip install flask`

### 问题2: Word导入失败
**原因:** python-docx未安装或Word格式错误  
**解决:** `pip install python-docx`，检查Word格式

### 问题3: 端口被占用
**原因:** 5000端口已被其他程序占用  
**解决:** 修改app.py中的端口号

### 问题4: 题型识别错误
**原因:** Word格式不规范  
**解决:** 参考本文档的Word格式示例，规范编写

---

## 📞 技术支持

如遇问题，请按顺序检查：
1. Python版本（推荐3.6+）
2. 依赖包安装情况
3. Word文档格式
4. 端口占用情况
5. 浏览器兼容性

---

## ✨ 项目亮点

1. **一键部署** - 双击启动脚本即可运行
2. **格式智能** - 自动识别5种题型
3. **界面美观** - 现代化渐变设计
4. **功能完整** - 导入、刷题、统计全覆盖
5. **易于扩展** - 代码结构清晰，便于二次开发

---

**项目完成时间:** 2026-06-29  
**开发者:** WorkBuddy AI Assistant  
**技术栈:** Python Flask + SQLite + 原生JS  

🎉 **祝使用愉快！**
