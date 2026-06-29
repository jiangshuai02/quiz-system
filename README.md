# 智能刷题系统

## 功能特性

✅ **Word一键导入** - 自动解析题库文档  
✅ **题型自动识别** - 支持单选、多选、判断、填空、简答  
✅ **实时判错** - 答题即时反馈  
✅ **错题本** - 自动收集错题  
✅ **统计分析** - 学习进度可视化  

## 快速开始

### 1. 安装依赖

```bash
pip install flask python-docx
```

### 2. 启动系统

**Windows:**
```bash
双击 start.bat
```

**Linux/Mac:**
```bash
bash start.sh
```

### 3. 访问系统

打开浏览器访问: http://localhost:5000

## Word文档格式规范

### 单选题格式
```
1. 下列哪个是Python的Web框架？
A. Django
B. NumPy
C. Pandas
D. Matplotlib
答案：A
```

### 多选题格式
```
2. 下列哪些是Python的Web框架？（多选）
A. Django
B. Flask
C. NumPy
D. Tornado
答案：A,B,D
```

### 判断题格式
```
3. Python是一种编译型语言。
答案：错
```

### 填空题格式
```
4. Python的Web框架____可以快速开发Web应用。
答案：Django
```

### 简答题格式
```
5. 简述Django的MVT架构。
答案：Model（模型）负责数据处理，View（视图）负责业务逻辑，Template（模板）负责页面展示。
```

## 功能说明

### 首页
- 系统功能介绍
- 快速开始引导

### 刷题页面
- 顺序答题
- 实时判错
- 进度显示

### 题库管理
- 查看所有题目
- 删除题目
- 手动添加题目

### Word导入
- 拖拽上传
- 点击上传
- 自动识别题型

### 错题本
- 查看错题
- 重新练习

### 统计分析
- 总题数
- 已答题数
- 正确率
- 按题型统计

## 技术架构

**后端:**
- Flask - Web框架
- SQLite - 数据库
- python-docx - Word解析

**前端:**
- 原生HTML/CSS/JS
- 响应式布局
- AJAX异步交互

## 数据库结构

**questions表:**
- id - 题目ID
- type - 题型（single/multiple/judge/fill/essay）
- question - 题目内容
- options - 选项（用|分隔）
- answer - 正确答案
- explanation - 解释说明
- created_at - 创建时间

**records表:**
- id - 记录ID
- question_id - 题目ID
- user_answer - 用户答案
- is_correct - 是否正确
- created_at - 答题时间

## 题型识别规则

系统会自动识别以下题型：

1. **单选题** - 有A、B、C、D选项
2. **多选题** - 题目含"多选"标识或多个正确选项
3. **判断题** - 答案为"对/错"或"True/False"
4. **填空题** - 题目含下划线或空格
5. **简答题** - 无明确选项，需文字回答

## 注意事项

1. Word文档必须是`.docx`格式
2. 题目编号建议连续
3. 答案格式要规范（见上方示例）
4. 简答题暂不支持自动判分，需人工批改

## 扩展功能建议

- [ ] 用户系统（注册/登录）
- [ ] 题目分类/标签
- [ ] 随机刷题模式
- [ ] 定时刷题提醒
- [ ] 导出错题PDF
- [ ] 移动端适配优化

## 常见问题

**Q: Word导入失败？**  
A: 检查文档格式是否符合规范，确保是`.docx`格式。

**Q: 题型识别错误？**  
A: 手动编辑题目，或在Word中明确标注题型（如"多选题"）。

**Q: 如何批量删除题目？**  
A: 目前需逐个删除，后续版本将支持批量操作。

## 开发者

- 技术栈: Python Flask + SQLite + 原生JS
- 版本: 1.0
- 日期: 2026-06-29

## 许可证

MIT License - 可自由使用和修改
