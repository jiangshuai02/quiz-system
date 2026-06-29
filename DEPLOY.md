# 智能刷题系统 - 完整部署指南

## 📦 系统文件清单

```
quiz_system/
├── app.py              # Flask后端主程序
├── templates/
│   └── index.html      # 前端界面
├── start.bat           # Windows启动脚本
├── start.sh            # Linux/Mac启动脚本
├── generate_sample.py  # 示例Word生成脚本
├── README.md           # 使用说明
└── DEPLOY.md           # 本部署指南
```

## 🚀 快速部署（3步）

### 第1步：安装Python依赖

**方法A - 使用pip（推荐）:**
```bash
pip install flask python-docx
```

**方法B - 使用国内镜像（如果方法A慢）:**
```bash
pip install -i https://pypi.tuna.tsinghua.edu.cn/simple flask python-docx
```

**方法C - 用户级安装（如果权限不足）:**
```bash
pip install --user flask python-docx
```

### 第2步：启动系统

**Windows用户:**
```bash
双击 start.bat
```

**或手动启动:**
```bash
cd D:\shuati\quiz_system
python app.py
```

### 第3步：访问系统

打开浏览器，访问: http://localhost:5000

---

## 📝 Word题库格式规范

### 标准格式示例

创建一个Word文档（.docx格式），按以下格式编写：

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

### 格式要点

1. **题目编号** - 以数字开头（1. 2. 3.）
2. **选项格式** - A. B. C. D. （支持.、、）、）
3. **答案标识** - 必须包含"答案："或"正确答案："
4. **多选题** - 答案用逗号分隔（A,B,D）
5. **判断题** - 答案为"对/错"或"正确/错误"

---

## 🎯 功能使用指南

### 1. 首页
- 查看系统功能介绍
- 快速入口按钮

### 2. Word导入
- 点击"📥 导入"页面
- 拖拽Word文档到上传区域
- 或点击上传区域选择文件
- 等待导入完成提示

### 3. 刷题练习
- 点击"✍️ 刷题"页面
- 系统自动加载题目
- 选择/输入答案
- 点击"提交答案"查看结果
- 点击"下一题"继续

### 4. 题库管理
- 点击"📖 题库"页面
- 查看所有题目
- 删除不需要的题目

### 5. 错题本
- 点击"❌ 错题本"页面
- 查看答错的题目
- 重新练习

### 6. 统计分析
- 点击"📊 统计"页面
- 查看总题数、已答数、正确率
- 查看各题型分布

---

## 🔧 手动添加题目

如果不想使用Word导入，可以手动添加：

1. 点击"📥 导入"页面
2. 滚动到"手动添加题目"部分
3. 选择题型
4. 填写题目内容
5. 填写选项（单选/多选需要）
6. 填写正确答案
7. 点击"添加题目"

---

## 🐛 常见问题

### Q1: 启动失败，提示"No module named 'flask'"
**解决方法:**
```bash
pip install flask
```

### Q2: Word导入失败
**可能原因:**
- 文件不是.docx格式
- 文件格式不符合规范
- python-docx未安装

**解决方法:**
```bash
pip install python-docx
```
然后检查Word文档格式是否规范。

### Q3: 题型识别错误
**解决方法:**
- 在题目中明确标注题型（如"多选题"）
- 手动编辑题目修正题型

### Q4: 端口5000被占用
**解决方法:**
修改app.py最后一行：
```python
app.run(debug=True, port=5001)  # 改为其他端口
```

---

## 📊 数据库说明

系统使用SQLite数据库，文件名为`quiz.db`，自动创建在程序目录。

**表结构:**

1. **questions表（题目表）**
   - id: 题目ID
   - type: 题型（single/multiple/judge/fill/essay）
   - question: 题目内容
   - options: 选项（用|分隔）
   - answer: 正确答案
   - explanation: 解释说明
   - created_at: 创建时间

2. **records表（答题记录表）**
   - id: 记录ID
   - question_id: 题目ID
   - user_answer: 用户答案
   - is_correct: 是否正确（0/1）
   - created_at: 答题时间

---

## 🎨 自定义样式

如果想修改界面样式，编辑`templates/index.html`中的`<style>`部分。

**主要样式类:**
- `.container` - 主容器
- `.header` - 头部
- `.nav` - 导航栏
- `.btn` - 按钮
- `.card` - 卡片
- `.option` - 选项

---

## 🚀 性能优化建议

1. **大量题目导入** - 建议分批导入，每批100题以内
2. **数据库备份** - 定期备份quiz.db文件
3. **题目去重** - 导入前检查是否有重复题目

---

## 📞 技术支持

如遇问题，请检查：
1. Python版本（推荐3.6+）
2. 依赖包是否安装成功
3. Word文档格式是否规范
4. 端口是否被占用

---

## ✅ 部署检查清单

- [ ] Python已安装（3.6+）
- [ ] Flask已安装
- [ ] python-docx已安装
- [ ] 端口5000未被占用
- [ ] Word文档格式规范
- [ ] 系统成功启动
- [ ] 浏览器可访问 http://localhost:5000

---

**祝使用愉快！ 🎉**

如需更多功能，可在此基础上二次开发。
