#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
import os
import re
from datetime import datetime, timedelta, timezone

app = Flask(__name__)

# ==================== 数据库配置 ====================
database_url = os.environ.get('DATABASE_URL', '')

if database_url:
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql+psycopg://', 1)
    elif database_url.startswith('postgresql://'):
        database_url = database_url.replace('postgresql://', 'postgresql+psycopg://', 1)
    if '?' not in database_url:
        database_url += '?sslmode=require'
    elif 'sslmode' not in database_url:
        database_url += '&sslmode=require'
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///quiz.db'

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'quiz-system-2026')

db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

# ==================== 数据模型 ====================
class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), default='user')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password, method='pbkdf2:sha256')

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class Subject(db.Model):
    """独立科目表：科目=学科分类（如数学、语文、英语）"""
    __tablename__ = 'subjects'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)  # 科目名称，唯一
    description = db.Column(db.String(200))  # 可选描述
    sort_order = db.Column(db.Integer, default=0)  # 排序顺序（越小越靠前）
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Question(db.Model):
    __tablename__ = 'questions'
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(20), nullable=False)
    question = db.Column(db.Text, nullable=False)
    options = db.Column(db.Text)
    answer = db.Column(db.Text, nullable=False)
    explanation = db.Column(db.Text)
    # 关联到Subject表，兼容旧数据用subject_name字段
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'))
    subject_name = db.Column(db.String(100), default='默认科目')  # 兼容旧数据
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @property
    def display_subject(self):
        """获取显示用的科目名称，优先从Subject表取"""
        if self.subject_id:
            sub = Subject.query.get(self.subject_id)
            if sub:
                return sub.name
        return self.subject_name or '默认科目'

class Record(db.Model):
    __tablename__ = 'records'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('questions.id'), nullable=False)
    user_answer = db.Column(db.Text)
    is_correct = db.Column(db.Boolean)
    display_name = db.Column(db.String(50))  # 用户自定义名称
    ip_address = db.Column(db.String(45))  # IP地址
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

@login_manager.user_loader
def load_user(user_id):
    try:
        return User.query.get(int(user_id))
    except:
        return None

# ==================== 初始化数据库（含自动迁移）====================
def migrate_db():
    """自动迁移：兼容已有数据库，添加缺失的表和列"""
    import sqlalchemy as sa

    inspector = sa.inspect(db.engine)

    # 1. 确保subjects表存在
    table_names = inspector.get_table_names()
    if 'subjects' not in table_names:
        print("MIGRATE: Creating subjects table...")
        db.session.execute(sa.text("""
            CREATE TABLE subjects (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) UNIQUE NOT NULL,
                description VARCHAR(200),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))

    # 2. 检查questions表是否有subject_id列
    has_subject_id = False
    has_subject_name = False
    has_sort_order = False
    if 'questions' in table_names:
        columns = [col['name'] for col in inspector.get_columns('questions')]
        has_subject_id = 'subject_id' in columns
        has_subject_name = 'subject_name' in columns

        if not has_subject_id:
            print("MIGRATE: Adding subject_id column to questions...")
            db.session.execute(
                sa.text("ALTER TABLE questions ADD COLUMN subject_id INTEGER REFERENCES subjects(id)")
            )
        if not has_subject_name:
            print("MIGRATE: Adding subject_name column to questions...")
            db.session.execute(
                sa.text("ALTER TABLE questions ADD COLUMN subject_name VARCHAR(100) DEFAULT '默认科目'")
            )

    # 2b. 检查subjects表是否有sort_order列
    if 'subjects' in table_names:
        sub_cols = [col['name'] for col in inspector.get_columns('subjects')]
        has_sort_order = 'sort_order' in sub_cols
        if not has_sort_order:
            print("MIGRATE: Adding sort_order column to subjects...")
            db.session.execute(
                sa.text("ALTER TABLE subjects ADD COLUMN sort_order INTEGER DEFAULT 0")
            )
            db.session.execute(
                sa.text("UPDATE subjects SET sort_order = id WHERE sort_order IS NULL OR sort_order = 0")
            )

    # 3. 创建默认科目
    default_subjects = ['数学', '语文', '英语', '物理', '化学', '生物',
                       '政治', '历史', '地理', '计算机', '默认科目']
    for sub_name in default_subjects:
        result = db.session.execute(
            sa.text("SELECT id FROM subjects WHERE name = :name"),
            {'name': sub_name}
        ).fetchone()
        if not result:
            db.session.execute(
                sa.text("INSERT INTO subjects (name, description, created_at) VALUES (:name, '', CURRENT_TIMESTAMP)"),
                {'name': sub_name}
            )

    # 4. 迁移旧数据：如果题目有subject_name但没subject_id，尝试匹配到subjects表
    if 'questions' in table_names and (has_subject_id or True):
        # 查出所有subject_name非空但subject_id为NULL的题目，迁移到对应的Subject记录
        rows = db.session.execute(
            sa.text("""SELECT id, subject_name FROM questions 
                      WHERE subject_name IS NOT NULL AND subject_name != '' 
                        AND (subject_id IS NULL OR subject_id = 0)""")
        ).fetchall()
        migrated = 0
        for row in rows:
            qid, sname = row[0], row[1].strip()
            target_sub = db.session.execute(
                sa.text("SELECT id FROM subjects WHERE name = :name LIMIT 1"),
                {'name': sname}
            ).fetchone()
            if target_sub:
                db.session.execute(
                    sa.text("UPDATE questions SET subject_id = :sid WHERE id = :qid"),
                    {'sid': target_sub[0], 'qid': qid}
                )
                migrated += 1
            else:
                # 如果subjects表中没有这个名称的科目，创建一个并关联
                try:
                    db.session.execute(
                        sa.text("INSERT INTO subjects (name, description, created_at) VALUES (:name, '', CURRENT_TIMESTAMP)"),
                        {'name': sname[:50]}
                    )
                    new_sub = db.session.execute(
                        sa.text("SELECT id FROM subjects WHERE name = :name LIMIT 1"),
                        {'name': sname[:50]}
                    ).fetchone()
                    if new_sub:
                        db.session.execute(
                            sa.text("UPDATE questions SET subject_id = :sid WHERE id = :qid"),
                            {'sid': new_sub[0], 'qid': qid}
                        )
                        migrated += 1
                except Exception:
                    pass  # 忽略重复键错误等

        if migrated > 0:
            print(f"MIGRATE: Migrated {migrated} legacy questions to subjects table")

    # 5. 清洗已有脏数据：题目文本中的答案泄露、选项只有字母等
    if 'questions' in table_names:
        dirty_qs = db.session.execute(
            sa.text("SELECT id, question, options FROM questions WHERE question LIKE '%答案%' OR question LIKE '%答案:%' OR options LIKE 'A|B|C|D%' OR options = 'A|B|C|D'")
        ).fetchall()
        cleaned_count = 0
        for row in dirty_qs:
            qid, qtext, opts = row[0], row[1], row[2] or ''
            new_qtext = re.sub(r'\s*[（(]?\s*\[?[单选|多选|判断|填空|简选|选择题]*\]?\s*[）)]?\s*', '', qtext)
            # 去掉末尾的"答案：xxx"（支持任意内容，包括示例/IP地址等）
            new_qtext = re.sub(r'\s*答案[：:]\s*.*$', '', new_qtext).strip()
            # 去掉末尾残留的括号答案标注
            new_qtext = re.sub(r'\s*[（(]\s*(正确|错误|[ABCD])\s*[）)]?\s*$', '', new_qtext).strip()
            # 去掉题号前缀
            new_qtext = re.sub(r'^\d+[\.\、\)\s]+', '', new_qtext).strip()
            
            # 修复只有字母的选项
            new_opts = opts
            if opts:
                opt_parts = opts.split('|')
                if all(len(p.strip()) <= 2 and p.strip().upper() in ('A','B','C','D') for p in opt_parts):
                    new_opts = ''  # 清空无效选项
            
            if new_qtext != qtext or new_opts != opts:
                db.session.execute(
                    sa.text("UPDATE questions SET question = :q, options = :o WHERE id = :id"),
                    {'id': qid, 'q': new_qtext, 'o': new_opts}
                )
                cleaned_count += 1
        
        if cleaned_count > 0:
            print(f"MIGRATE: Cleaned {cleaned_count} dirty questions (removed leaked answers, fixed empty options)")

    # 6. 修复单题/多选缺少选项的问题 - 自动删除（先清除外键关联）
    if 'questions' in table_names:
        no_opts = db.session.execute(
            sa.text("SELECT id, type, question FROM questions WHERE (type = 'single' OR type = 'multiple') AND (options IS NULL OR options = '' OR options = '|')")
        ).fetchall()
        for row in no_opts:
            # 先删除 records 表中的关联记录（PostgreSQL外键约束）
            db.session.execute(
                sa.text("DELETE FROM records WHERE question_id = :qid"), {'qid': row[0]}
            )
            db.session.execute(
                sa.text("DELETE FROM questions WHERE id = :id"), {'id': row[0]}
            )
        if len(no_opts) > 0:
            print(f"MIGRATE: Deleted {len(no_opts)} questions with no options")

    # 7. records表添加display_name和ip_address列
    if 'records' in table_names:
        rec_cols = [col['name'] for col in inspector.get_columns('records')]
        if 'display_name' not in rec_cols:
            print("MIGRATE: Adding display_name column to records...")
            db.session.execute(sa.text("ALTER TABLE records ADD COLUMN display_name VARCHAR(50)"))
        if 'ip_address' not in rec_cols:
            print("MIGRATE: Adding ip_address column to records...")
            db.session.execute(sa.text("ALTER TABLE records ADD COLUMN ip_address VARCHAR(45)"))

    db.session.commit()


with app.app_context():
    try:
        # 先创建基础表（不会覆盖已有表）
        db.create_all()

        # 执行迁移
        migrate_db()

        # 确保admin用户存在且密码正确
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            admin = User(username='admin', role='admin')
            admin.set_password('admin')
            db.session.add(admin)
        elif not admin.check_password('admin'):
            admin.set_password('admin')
        db.session.commit()
        print("DB OK")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print("DB INIT WARN: " + str(e))

# ==================== 题型识别 ====================
def identify_type(text, opts=''):
    full = text + ' ' + opts
    # 判断题检测：包含"对/错"或"正确/错误"关键词，且包含括号答案格式
    has_judge_keywords = bool(re.search(r'(对|错|正确|错误)', full))
    has_answer_format = bool(re.search(r'答案[：:]\s*(对|错|正确|错误|[AB])', text)) or \
                        bool(re.search(r'[（(]\s*(对|错|正确|错误|A|B)\s*[）)]', text))
    if has_judge_keywords and (has_answer_format or len(re.findall(r'(对|错)', full)) >= 2):
        return 'judge', ['正确', '错误'], extract_judge(text)
    # 多选题检测
    if '多选' in text:
        return 'multiple', extract_opts(opts), extract_multi(text)
    opts_list = extract_opts(opts)
    if opts_list and len(opts_list) >= 2:
        return 'single', opts_list, extract_single(text)
    if '____' in text or '\uff08\uff09' in text:
        return 'fill', [], extract_fill(text)
    return 'essay', [], extract_essay(text)

def extract_opts(text):
    """提取选项文本（返回选项内容，不含字母前缀）"""
    results = []
    for m in re.finditer(r'([A-D])[\.\u3001\)](.*?)(?=[A-D][\.\u3001\)]|$)', text + ' ', re.DOTALL):
        opt_text = m.group(2).strip()
        # 如果提取到的文本为空或只有字母，则保留 "字母.原始" 格式
        if not opt_text or len(opt_text) <= 2 and opt_text.upper() in ('A','B','C','D'):
            opt_text = m.group(0).strip()
        results.append(opt_text)
    return results

def extract_single(text):
    m = re.search(r'\u7b54\u6848[：:]\s*([A-D])', text)
    return m.group(1) if m else ''

def extract_multi(text):
    m = re.search(r'\u7b54\u6848[：:]\s*([A-D,\uff0c\u3001]+)', text)
    return [c for c in m.group(1) if c in 'ABCD'] if m else []

def extract_judge(text):
    # 匹配 "答案：正确/错误" 或 "答案：A/B" 或 "答案：A（正确）"
    m = re.search(r'\u7b54\u6848[：:]\s*(\u5bf9|\u6b63\u786e|\u9519\u8bef|[AB])', text)
    if m:
        ans = m.group(1)
        if ans in ['\u5bf9', '\u6b63\u786e', 'A']:
            return '\u6b63\u786e'
        else:
            return '\u9519\u8bef'
    # 如果没找到"答案："标记，检查括号内的内容
    m2 = re.search(r'[（(]\s*(\u5bf9|\u6b63\u786e|\u9519\u8bef|A|B)\s*[）)]', text)
    if m2:
        ans = m2.group(1)
        if ans in ['\u5bf9', '\u6b63\u786e', 'A']:
            return '\u6b63\u786e'
        else:
            return '\u9519\u8bef'
    return '\u6b63\u786e'  # 默认返回正确

def extract_fill(text):
    m = re.search(r'\u7b54\u6848[：:]\s*(.+)', text)
    return m.group(1).strip() if m else ''

def extract_essay(text):
    m = re.search(r'\u7b54\u6848[：:]\s*(.+)$', text, re.DOTALL)
    return m.group(1).strip() if m else ''

# ==================== 题目文本清洗 ====================
def clean_question_text(raw_text):
    """清洗题目原始文本，去掉题号、答案、题型标记等干扰信息"""
    text = raw_text.strip()

    # 去掉开头的题号前缀：如 "4. " "22. " "4、" "22、"
    text = re.sub(r'^\d+[\.\、\)\s]+', '', text)

    # 去掉末尾的"答案：xxx"/"答案:xxx"（含数字答案，如"答案：12"）
    # 扩展匹配：支持"答案："后面跟任意内容（包括示例、IP地址等长文本）
    text = re.sub(r'\s*答案[：:]\s*.*$', '', text)

    # 去掉末尾的"正确"/"错误"标注（判断题答案泄露）
    text = re.sub(r'\s*[（(]\s*(正确|错误|A|B)\s*[）)]\s*$', '', text)

    # 去掉单独的空括号"（）""( )"等，变成占位符
    text = re.sub(r'[（(]\s*[）)]', '（  ）', text)

    # 去掉多余空白
    text = re.sub(r'\s+', ' ', text).strip()

    return text


# ==================== 科目名称清洗 ====================
def clean_subject_name(raw_name):
    """清洗科目名称，去掉题数标注、题型说明等干扰信息"""
    name = raw_name.strip()

    # 去掉末尾的题数统计，如"（11题）" "(9道)" "（11题）"
    name = re.sub(r'[（(]\s*\d+\s*[题道][s]?\s*[）)]\s*$', '', name)

    # 去掉括号里的答题说明，如"（正确定A、错误选B）"
    name = re.sub(r'[（(][^）)]*(?:正确|错误|A|B|选择|选)[^）]*[）)]', '', name)

    name = name.strip()
    if len(name) < 2 or name in ['', '判断', '单选', '多选', '填空', '简答']:
        return '\u9ed8\u8ba4\u79d1\u76ee'

    if len(name) > 30:
        name = name[:30]

    return name


# ==================== 文件解析（通用）====================
def _parse_lines(lines):
    """
    通用行级题目解析器（Word/TXT共用）。
    输入：文本行列表
    输出：题目列表 [{'type','question','options','answer','subject'}]
    """
    qs = []
    cur = {}
    opts = []
    current_subject = '\u9ed8\u8ba4\u79d1\u76ee'

    for line in lines:
        t = line.strip()
        if not t:
            continue
        # 检测章节标题作为科目名
        if re.match(r'^[\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341]+[\u3001\.]', t) or \
           re.match(r'^\u7b2c.+[^\u9898]', t) or (len(t) < 20 and '\u7ae0' in t):
            current_subject = clean_subject_name(t)
            continue
        if re.match(r'^\d+[\.\u3001\)]', t):
            if cur:
                cur['type'], cur['options'], cur['answer'] = identify_type(cur.get('q', ''), ' '.join(opts))
                cur['question'] = clean_question_text(cur.get('q', ''))
                cur['subject'] = current_subject
                qs.append(cur)
            cur = {'q': t}
            opts = []
        elif re.match(r'^[A-D][\.\u3001\)]', t):
            opts.append(t)
        elif cur:
            cur['q'] = cur.get('q', '') + ' ' + t

    # 处理最后一道题
    if cur:
        cur['type'], cur['options'], cur['answer'] = identify_type(cur.get('q', ''), ' '.join(opts))
        cur['question'] = clean_question_text(cur.get('q', ''))
        cur['subject'] = current_subject
        qs.append(cur)

    return qs


def parse_word_from_bytes(file_bytes):
    """从内存字节流解析Word文档，兼容Render只读文件系统"""
    import io
    from docx import Document
    try:
        doc = Document(io.BytesIO(file_bytes))
    except Exception as e:
        raise Exception('Word\u89e3\u6790\u5931\u8d25: ' + str(e))

    return _parse_lines([p.text.strip() for p in doc.paragraphs])


def parse_txt_from_bytes(file_bytes):
    """从内存字节流解析纯文本文件（.txt），自动检测编码"""
    # 尝试多种编码解码
    text = None
    for enc in ('utf-8', 'gbk', 'gb2312', 'utf-16', 'latin-1'):
        try:
            text = file_bytes.decode(enc).replace('\r\n', '\n').replace('\r', '\n')
            break
        except (UnicodeDecodeError, UnicodeError):
            continue
    if text is None:
        raise Exception('\u6587\u4ef6\u7f16\u7801\u8bc6\u522b\u5931\u8d25\uff0c\u8bf7\u786e\u4fdd\u4e3aUTF-8\u6216GBK')

    return _parse_lines(text.splitlines())


def parse_word(path):
    """兼容旧接口：从文件路径解析"""
    with open(path, 'rb') as f:
        data = f.read()
        if path.lower().endswith('.txt'):
            return parse_txt_from_bytes(data)
        return parse_word_from_bytes(data)

# ==================== 路由 ====================
@app.route('/')
def index():
    if not current_user.is_authenticated:
        admin = User.query.filter_by(username='admin').first()
        if admin:
            login_user(admin)
    return render_template('index.html')


@app.route('/admin')
def admin_page():
    """管理后台独立页面（自动确保已登录）"""
    if not current_user.is_authenticated:
        admin = User.query.filter_by(username='admin').first()
        if admin:
            login_user(admin)
    return render_template('admin.html')


@app.route('/api/set_name', methods=['POST'])
def set_name():
    """设置用户名（无需登录即可调用）"""
    d = request.json or {}
    name = (d.get('name', '') or '').strip()
    if not name or len(name) < 1:
        return jsonify({'error': '请输入你的名字'}), 400
    if len(name) > 30:
        return jsonify({'error': '名字太长（最多30字）'}), 400
    session['display_name'] = name
    return jsonify({'success': True, 'name': name})

@app.route('/login', methods=['GET','POST'])
def login():
    if request.method == 'POST':
        u = User.query.filter_by(username=request.form.get('username', '').strip()).first()
        if u and u.check_password(request.form.get('password', '')):
            login_user(u)
            return redirect(url_for('index'))
        return render_template('login.html', error='Username or password incorrect')
    return render_template('login.html')

@app.route('/register', methods=['GET','POST'])
def register():
    if request.method == 'POST':
        un = request.form.get('username', '').strip()
        pw = request.form.get('password', '')
        if not un or not pw:
            return render_template('register.html', error='Required fields missing')
        if User.query.filter_by(username=un).first():
            return render_template('register.html', error='Username exists')
        u = User(username=un)
        u.set_password(pw)
        if User.query.count() == 0:
            u.role = 'admin'
        db.session.add(u)
        db.session.commit()
        login_user(u)
        return redirect(url_for('index'))
    return render_template('register.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/api/questions')
@login_required
def get_qs():
    qs = Question.query.order_by(Question.id.asc()).all()
    result = []
    for q in qs:
        result.append({
            'id': q.id,
            'type': q.type,
            'question': q.question,
            'options': q.options.split('|') if q.options else [],
            'answer': q.answer,
            'explanation': q.explanation or '',
            'subject': q.display_subject,
            'subject_id': q.subject_id
        })
    return jsonify(result)


@app.route('/api/subjects')
@login_required
def get_subjects():
    """获取所有科目列表（按sort_order排序）"""
    subjects = Subject.query.order_by(Subject.sort_order.asc(), Subject.id.asc()).all()
    result = []
    for sub in subjects:
        count = db.session.query(Question).filter(Question.subject_id == sub.id).count()
        result.append({
            'id': sub.id,
            'name': sub.name,
            'description': sub.description or '',
            'count': count,
            'sort_order': sub.sort_order or 0
        })
    return jsonify(result)




@app.route('/api/subjects_list')
@login_required
def subjects_list():
    """获取纯科目名称列表（用于下拉选择）"""
    subjects = Subject.query.order_by(Subject.name.asc()).all()
    return jsonify([{'id': s.id, 'name': s.name} for s in subjects])


@app.route('/api/subjects', methods=['POST'])
@login_required
def create_subject():
    """新建科目"""
    if current_user.role != 'admin':
        return jsonify({'error': '需要管理员权限'}), 403
    d = request.json
    name = d.get('name', '').strip()
    desc = d.get('description', '').strip()
    if not name:
        return jsonify({'error': '科目名称不能为空'}), 400
    if len(name) > 50:
        return jsonify({'error': '科目名称不能超过50个字符'}), 400
    if Subject.query.filter_by(name=name).first():
        return jsonify({'error': '科目"' + name + '"已存在'}), 400
    sub = Subject(name=name, description=desc)
    db.session.add(sub)
    db.session.commit()
    return jsonify({'success': True, 'id': sub.id, 'name': sub.name})


@app.route('/api/subjects/<int:sid>', methods=['PUT'])
@login_required
def update_subject(sid):
    """修改科目"""
    if current_user.role != 'admin':
        return jsonify({'error': '需要管理员权限'}), 403
    sub = Subject.query.get(sid)
    if not sub:
        return jsonify({'error': '科目不存在'}), 404
    d = request.json
    name = d.get('name', '').strip()
    if name and name != sub.name:
        if len(name) > 50:
            return jsonify({'error': '名称过长'}), 400
        if Subject.query.filter(Subject.name == name, Subject.id != sid).first():
            return jsonify({'error': '名称已存在'}), 400
        sub.name = name
    if 'description' in d:
        sub.description = d.get('description', '').strip()
    db.session.commit()
    return jsonify({'success': True, 'id': sub.id, 'name': sub.name})


@app.route('/api/subjects/reorder', methods=['POST'])
@login_required
def reorder_subjects():
    """调整科目顺序（上移/下移）"""
    if current_user.role != 'admin':
        return jsonify({'error': '需要管理员权限'}), 403
    d = request.json
    subject_id = d.get('id')
    direction = d.get('direction', '')  # 'up' or 'down'
    if not subject_id or direction not in ('up', 'down'):
        return jsonify({'error': '参数错误'}), 400

    sub = Subject.query.get(subject_id)
    if not sub:
        return jsonify({'error': '科目不存在'}), 404

    if direction == 'up':
        # 找到当前科目前面一个sort_order更小的科目，交换位置
        prev = Subject.query.filter(Subject.sort_order < sub.sort_order).order_by(Subject.sort_order.desc()).first()
        if prev:
            prev.sort_order, sub.sort_order = sub.sort_order, prev.sort_order
            db.session.commit()
    else:
        # 找到后面一个sort_order更大的科目，交换位置
        next_sub = Subject.query.filter(Subject.sort_order > sub.sort_order).order_by(Subject.sort_order.asc()).first()
        if next_sub:
            next_sub.sort_order, sub.sort_order = sub.sort_order, next_sub.sort_order
            db.session.commit()

    return jsonify({'success': True})


@app.route('/api/subjects/<int:sid>', methods=['DELETE'])
@login_required
def delete_subject_api(sid):
    """删除科目（同时将其下题目移到默认科目）"""
    if current_user.role != 'admin':
        return jsonify({'error': '需要管理员权限'}), 403
    sub = Subject.query.get(sid)
    if not sub:
        return jsonify({'error': '科目不存在'}), 404
    # 防止删除"默认科目"（系统保留科目）
    if sub.name == '\u9ed8\u8ba4\u79d1\u76ee':
        return jsonify({'error': '「默认科目」为系统保留科目，无法删除'}), 400
    count = Question.query.filter(Question.subject_id == sid).count()
    # 将题目移至默认科目
    default_sub = Subject.query.filter_by(name='\u9ed8\u8ba4\u79d1\u76ee').first()
    if default_sub:
        for q in Question.query.filter(Question.subject_id == sid).all():
            q.subject_id = default_sub.id
    db.session.delete(sub)
    db.session.commit()
    return jsonify({'success': True, 'count': count, 'message': f'已删除"{sub.name}"，{count}道题已移至默认科目'})


@app.route('/api/questions/by_subject/<subject_name>')
@login_required
def get_qs_by_subject(subject_name):
    """获取指定科目的题目"""
    # 先尝试按Subject表查找
    sub = Subject.query.filter_by(name=subject_name).first()
    if sub:
        qs = Question.query.filter(
            (Question.subject_id == sub.id) |
            (Question.subject_name == subject_name)
        ).order_by(Question.id.asc()).all()
    else:
        qs = Question.query.filter(Question.subject_name == subject_name).order_by(Question.id.asc()).all()
    result = []
    for q in qs:
        result.append({
            'id': q.id, 'type': q.type, 'question': q.question,
            'options': q.options.split('|') if q.options else [],
            'answer': q.answer, 'explanation': q.explanation or '',
            'subject': q.display_subject, 'subject_id': q.subject_id
        })
    return jsonify(result)

@app.route('/api/questions/practice/<subject_name>')
@login_required
def get_practice_qs(subject_name):
    """获取指定科目的题目用于练习"""
    if subject_name == '__all__':
        qs = Question.query.all()
    else:
        # 支持按科目名称或科目ID查找
        sub = Subject.query.filter_by(name=subject_name).first()
        if sub:
            qs = Question.query.filter(
                (Question.subject_id == sub.id) |
                (Question.subject_name == subject_name)
            ).all()
        else:
            qs = Question.query.filter(Question.subject_name == subject_name).all()
    import random
    random.shuffle(qs)
    result = []
    for q in qs:
        result.append({
            'id': q.id, 'type': q.type, 'question': q.question,
            'options': q.options.split('|') if q.options else [],
            'answer': q.answer, 'explanation': q.explanation or '',
            'subject': q.display_subject, 'subject_id': q.subject_id
        })
    return jsonify(result)


@app.route('/api/questions/sequential/<subject_name>')
@login_required
def get_sequential_qs(subject_name):
    """顺序答题模式：按题库原始顺序，不随机打乱"""
    if subject_name == '__all__':
        qs = Question.query.order_by(Question.id.asc()).all()
    else:
        sub = Subject.query.filter_by(name=subject_name).first()
        if sub:
            qs = Question.query.filter(
                (Question.subject_id == sub.id) | (Question.subject_name == subject_name)
            ).order_by(Question.id.asc()).all()
        else:
            qs = Question.query.filter(Question.subject_name == subject_name).order_by(Question.id.asc()).all()
    result = []
    for q in qs:
        result.append({
            'id': q.id, 'type': q.type, 'question': q.question,
            'options': q.options.split('|') if q.options else [],
            'answer': q.answer, 'explanation': q.explanation or '',
            'subject': q.display_subject, 'subject_id': q.subject_id
        })
    return jsonify(result)


@app.route('/api/questions', methods=['POST'])
@login_required
def add_q():
    if current_user.role != 'admin':
        return jsonify({'error': 'Forbidden'}), 403
    d = request.json
    subject_id = d.get('subject_id')
    subject_name = d.get('subject_name', '\u9ed8\u8ba4\u79d1\u76ee')

    # 如果传了subject_id，使用它；否则用subject_name
    if not subject_id and subject_name:
        sub = Subject.query.filter_by(name=subject_name.strip()).first()
        if sub:
            subject_id = sub.id

    q = Question(
        type=d['type'],
        question=d['question'],
        options='|'.join(d.get('options', [])),
        answer=str(d['answer']),
        explanation=d.get('explanation', ''),
        subject_id=subject_id,
        subject_name=subject_name if not subject_id else '',
        created_by=current_user.id
    )
    db.session.add(q)
    db.session.commit()
    return jsonify({'success': True, 'id': q.id})

@app.route('/api/questions/<int:qid>', methods=['DELETE'])
@login_required
def del_q(qid):
    if current_user.role != 'admin':
        return jsonify({'error': 'Forbidden'}), 403
    q = Question.query.get(qid)
    if q:
        # 先删除 records 表中的关联记录（PostgreSQL外键约束）
        Record.query.filter_by(question_id=qid).delete()
        db.session.delete(q)
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({'error': 'Not found'}), 404

@app.route('/api/import_word', methods=['POST'])
@login_required
def import_word_fn():
    if current_user.role != 'admin':
        return jsonify({'error': 'Forbidden'}), 403

    try:
        f = request.files.get('file')
        if not f or not f.filename:
            return jsonify({'error': '\u672a\u9009\u62e9\u6587\u4ef6'})

        # 检查文件格式（支持 .docx 和 .txt）
        fname = f.filename.lower()
        if not (fname.endswith('.docx') or fname.endswith('.txt')):
            return jsonify({'error': '\u53ea\u652f\u6301 .docx \u6216 .txt \u683c\u5f0f'})

        is_txt = fname.endswith('.txt')

        # 读取文件内容到内存（不写入磁盘，兼容Render只读文件系统）
        file_bytes = f.read()

        if len(file_bytes) == 0:
            return jsonify({'error': '\u6587\u4ef6\u4e3a\u7a7a'})
        if len(file_bytes) > 10 * 1024 * 1024:  # 限制10MB
            return jsonify({'error': '\u6587\u4ef6\u8fc7\u5927\uff0c\u8bf7\u63a7\u5236\u572810MB\u4ee5\u5185'})

        # 获取目标科目（前端传来的subject_id或新建科目名）
        target_subject_id = request.form.get('subject_id', '').strip()
        new_subject_name = request.form.get('new_subject_name', '').strip()
        target_sub = None

        if new_subject_name:
            # 新建科目
            existing = Subject.query.filter_by(name=new_subject_name).first()
            if existing:
                target_sub = existing
                target_subject_id = str(existing.id)
            else:
                target_sub = Subject(name=new_subject_name)
                db.session.add(target_sub)
                db.session.commit()
                target_subject_id = str(target_sub.id)
        elif target_subject_id and target_subject_id.isdigit():
            target_sub = Subject.query.get(int(target_subject_id))

        # 根据文件类型选择解析器
        if is_txt:
            qs = parse_txt_from_bytes(file_bytes)
        else:
            qs = parse_word_from_bytes(file_bytes)

        if not qs:
            return jsonify({'error': '\u672a\u8bc6\u522b\u5230\u6709\u6548\u9898\u76ee\uff0c\u8bf7\u68c0\u67e5\u6587\u4ef6\u683c\u5f0f\u662f\u5426\u6b63\u786e'})

        # 批量入库 - 所有题目导入到指定科目
        count = 0
        for item in qs:
            q_text = item.get('question', '') or item.get('q', '').strip()
            q_text = q_text.strip()
            if not q_text:
                continue

            sid = int(target_subject_id) if (target_subject_id and target_subject_id.isdigit()) else None
            sname = target_sub.name if target_sub else (item.get('subject', '\u9ed8\u8ba4\u79d1\u76ee'))

            q = Question(
                type=item.get('type', 'essay'),
                question=q_text,
                options='|'.join(item.get('options', [])),
                answer=str(item.get('answer', '')),
                explanation=item.get('explanation', ''),
                subject_id=sid,
                subject_name=sname if not sid else '',
                created_by=current_user.id
            )
            db.session.add(q)
            count += 1

        db.session.commit()
        sub_display_name = target_sub.name if target_sub else '默认'
        return jsonify({
            'success': True,
            'count': count,
            'message': f'成功导入 {count} 道题目到「{sub_display_name}」'
        })

    except Exception as e:
        db.session.rollback()
        error_msg = str(e)
        print('IMPORT ERROR: ' + error_msg)
        return jsonify({'error': '\u5bfc\u5165\u5931\u8d25: ' + error_msg[:200]}), 500

@app.route('/api/check_answer', methods=['POST'])
@login_required
def check():
    d = request.json
    qid = d.get('question_id')
    ua = d.get('answer')
    if not qid or ua is None:
        return jsonify({'error': 'Missing params'})
    q = Question.query.get(qid)
    if not q:
        return jsonify({'error': 'Not found'})
    correct = False
    if q.type == 'single':
        correct = str(ua).upper() == str(q.answer).upper()
    elif q.type == 'multiple':
        us = set(ua) if isinstance(ua, list) else set(str(ua).split(','))
        cs = set(str(q.answer).split(',')) if ',' in str(q.answer) else set(str(q.answer))
        correct = us == cs
    elif q.type == 'judge':
        # 判断题答案标准化：A/正确 → 正确，B/错误 → 错误
        def normalize_judge(val):
            v = str(val).strip()
            if v in ['A', '\u5bf9', '\u6b63\u786e']:
                return '\u6b63\u786e'
            elif v in ['B', '\u9519', '\u9519\u8bef']:
                return '\u9519\u8bef'
            return v
        correct = normalize_judge(ua) == normalize_judge(q.answer)
    elif q.type == 'fill':
        correct = str(ua).strip() == str(q.answer).strip()
    try:
        # 优先从请求体获取display_name（前端传递），其次从session获取
        dn = (d.get('display_name') or '').strip() or session.get('display_name', '')
        db.session.add(Record(
            user_id=current_user.id,
            question_id=qid,
            user_answer=str(ua),
            is_correct=bool(correct),
            display_name=dn,
            ip_address=request.remote_addr or ''
        ))
        db.session.commit()
    except:
        pass
    return jsonify({
        'is_correct': correct,
        'correct_answer': q.answer,
        'explanation': q.explanation or ''
    })

@app.route('/api/statistics')
@login_required
def stats():
    total = Question.query.count()
    dn = session.get('display_name', '')
    if dn:
        ans = Record.query.filter_by(display_name=dn).count()
        cor = Record.query.filter_by(display_name=dn, is_correct=True).count()
    else:
        ans = Record.query.filter_by(user_id=current_user.id).count()
        cor = Record.query.filter_by(user_id=current_user.id, is_correct=True).count()
    return jsonify({
        'total': total,
        'answered': ans,
        'correct': cor,
        'accuracy': round(cor / ans * 100, 2) if ans else 0
    })

@app.route('/api/wrong_questions')
@login_required
def wrong_qs():
    """获取错题列表（按当前用户名过滤）"""
    dn = session.get('display_name', '')
    q_base = Record.query.filter(is_correct=False)
    if dn:
        q_base = q_base.filter_by(display_name=dn)
    else:
        q_base = q_base.filter_by(user_id=current_user.id)
    wrong_records = q_base.order_by(Record.created_at.desc()).all()

    result = []
    seen = set()
    for r in wrong_records:
        if r.question_id not in seen:
            seen.add(r.question_id)
            q = Question.query.get(r.question_id)
            if q:
                result.append({
                    'id': q.id, 'type': q.type, 'question': q.question,
                    'options': q.options.split('|') if q.options else [],
                    'answer': q.answer, 'explanation': q.explanation or '',
                    'user_answer': r.user_answer,
                    'subject': q.display_subject
                })
    return jsonify(result)

@app.route('/api/me')
@login_required
def get_me():
    return jsonify({
        'id': current_user.id,
        'username': current_user.username,
        'role': current_user.role,
        'display_name': session.get('display_name', '')
    })


@app.route('/api/set_username', methods=['POST'])
@login_required
def set_username():
    """设置当前显示用户名（用于区分错题/统计）"""
    d = request.json
    name = (d.get('name', '') or '').strip()
    if not name:
        return jsonify({'error': '名称不能为空'}), 400
    if len(name) > 30:
        return jsonify({'error': '名称不能超过30个字符'}), 400
    session['display_name'] = name
    return jsonify({'success': True, 'name': name})


@app.route('/api/clear_my_data', methods=['POST'])
@login_required
def clear_my_data():
    """清除当前用户的所有答题记录"""
    dn = session.get('display_name', '')
    if dn:
        count = Record.query.filter_by(display_name=dn).delete()
    else:
        count = Record.query.filter_by(user_id=current_user.id).delete()
    db.session.commit()
    return jsonify({'success': True, 'count': count, 'message': f'已清除 {count} 条记录'})


# ==================== Admin Dashboard APIs ====================
# 工具函数
TZ_CN = timezone(timedelta(hours=8))

def _fmt_time(dt):
    """时间格式化显示（UTC→北京时间）"""
    if not dt:
        return ''
    try:
        # PostgreSQL返回的datetime可能是naive的（无时区），假设为UTC
        if dt.tzinfo is None:
            # naive → 假设是UTC，加8小时转北京时间
            dt = dt + timedelta(hours=8)
        else:
            # 有时区信息，转换为北京时间
            dt = dt.astimezone(TZ_CN)
        return dt.strftime('%Y-%m-%d %H:%M')
    except Exception:
        return str(dt)[:16]

@app.route('/api/admin/users')
@login_required
def admin_users():
    """获取所有用户列表（管理员）"""
    if current_user.role != 'admin':
        return jsonify({'error': 'Forbidden'}), 403
    
    # 获取所有使用过的display_name
    users_info = db.session.query(
        Record.display_name, db.func.count(Record.id),
        db.func.sum(db.case((Record.is_correct == True, 1), else_=0)),
        db.func.min(Record.created_at),
        db.func.max(Record.created_at)
    ).group_by(Record.display_name).all()
    
    result = []
    for row in users_info:
        name, total, correct, first_seen, last_seen = row
        # 获取IP地址
        ips = db.session.query(Record.ip_address).filter(
            Record.display_name == name, Record.ip_address != None
        ).distinct().all()
        ip_list = [ip[0] for ip in ips]
        
        result.append({
            'name': name,
            'total_answered': total or 0,
            'correct': correct or 0,
            'accuracy': round(correct / total * 100, 1) if total and correct else 0,
            'first_seen': _fmt_time(first_seen),
            'last_seen': _fmt_time(last_seen),
            'ips': ', '.join(ip_list[:5]),
            'ip_count': len(ip_list)
        })
    
    return jsonify(result)

@app.route('/api/admin/user_detail')
@login_required
def admin_user_detail():
    """获取某用户的详细错题记录"""
    if current_user.role != 'admin':
        return jsonify({'error': 'Forbidden'}), 403
    name = request.args.get('name', '')
    records = Record.query.filter_by(display_name=name, is_correct=False).order_by(Record.created_at.desc()).limit(50).all()
    result = []
    seen = set()
    for r in records:
        if r.question_id not in seen:
            seen.add(r.question_id)
            q = Question.query.get(r.question_id)
            if q:
                result.append({
                    'id': q.id, 'question': q.question[:60], 'answer': q.answer,
                    'user_answer': r.user_answer, 'type': q.type, 'subject': q.display_subject
                })
    return jsonify(result)

@app.route('/api/admin/batch_delete_questions', methods=['POST'])
@login_required
def admin_batch_delete_questions():
    """批量删除题目"""
    if current_user.role != 'admin':
        return jsonify({'error': 'Forbidden'}), 403
    d = request.json
    ids = d.get('ids', [])
    if not isinstance(ids, list):
        return jsonify({'error': 'ids必须是数组'}), 400
    count = 0
    for qid in ids:
        q = Question.query.get(qid)
        if q:
            Record.query.filter_by(question_id=qid).delete()
            db.session.delete(q)
            count += 1
    db.session.commit()
    return jsonify({'success': True, 'count': count})

@app.route('/api/admin/backup')
@login_required
def admin_backup():
    """导出全部题库为JSON（备份用）"""
    if current_user.role != 'admin':
        return jsonify({'error': 'Forbidden'}), 403
    
    subjects = Subject.query.order_by(Subject.sort_order.asc(), Subject.id.asc()).all()
    questions = Question.query.all()
    
    data = {
        'subjects': [{'id': s.id, 'name': s.name, 'sort_order': s.sort_order} for s in subjects],
        'questions': [{
            'id': q.id, 'type': q.type, 'question': q.question,
            'options': q.options or '', 'answer': q.answer,
            'explanation': q.explanation or '',
            'subject_id': q.subject_id, 'subject_name': q.subject_name
        } for q in questions],
        'exported_at': datetime.utcnow().isoformat(),
        'total_questions': len(questions),
        'total_subjects': len(subjects)
    }
    return jsonify(data)

@app.route('/api/admin/delete_user', methods=['POST'])
@login_required
def admin_delete_user():
    """删除某个用户的所有答题记录"""
    if current_user.role != 'admin':
        return jsonify({'error': 'Forbidden'}), 403
    d = request.json or {}
    name = (d.get('name', '') or '').strip()
    if not name:
        return jsonify({'error': '缺少用户名'}), 400
    count = Record.query.filter_by(display_name=name).delete()
    db.session.commit()
    return jsonify({'success': True, 'count': count, 'message': f'已删除用户「{name}」的 {count} 条答题记录'})

@app.route('/api/admin/batch_delete_users', methods=['POST'])
@login_required
def admin_batch_delete_users():
    """批量删除多个用户的答题记录"""
    if current_user.role != 'admin':
        return jsonify({'error': 'Forbidden'}), 403
    d = request.json or {}
    names = d.get('names', [])
    if not isinstance(names, list) or not names:
        return jsonify({'error': 'names必须是数组'}), 400
    total = 0
    for name in names:
        name = (name or '').strip()
        if name:
            c = Record.query.filter_by(display_name=name).delete()
            total += c
    db.session.commit()
    return jsonify({'success': True, 'count': total, 'message': f'已删除 {len(names)} 个用户的共 {total} 条记录'})

@app.route('/api/admin/import_file', methods=['POST'])
@login_required
def admin_import_file():
    """管理后台：上传文件导入题目"""
    if current_user.role != 'admin':
        return jsonify({'error': 'Forbidden'}), 403

    try:
        f = request.files.get('file')
        if not f or not f.filename:
            return jsonify({'error': '请选择文件'}), 400

        raw = f.read()
        fname = (f.filename or '').lower()

        if len(raw) == 0:
            return jsonify({'error': '文件为空'}), 400
        if len(raw) > 10 * 1024 * 1024:
            return jsonify({'error': '文件过大，请控制在10MB以内'}), 400

        # 解析文件得到题目列表
        if fname.endswith('.docx'):
            qs = parse_word_from_bytes(raw)
        elif fname.endswith('.txt'):
            qs = parse_txt_from_bytes(raw)
        else:
            return jsonify({'error': '仅支持 .docx 和 .txt 格式'}), 400

        if not qs:
            return jsonify({'error': '未识别到有效题目，请检查文件格式'}), 400

        # 目标科目
        target_subject_name = (request.form.get('target_subject') or '').strip()
        target_sub = None
        if target_subject_name:
            target_sub = Subject.query.filter_by(name=target_subject_name).first()

        # 入库
        imported_count = 0
        skipped_count = 0
        for item in qs:
            q_text = (item.get('question', '') or item.get('q', '')).strip()
            if not q_text: skipped_count += 1; continue

            sname = target_sub.name if target_sub else (item.get('subject', '默认科目'))
            sid = target_sub.id if target_sub else None

            q = Question(
                type=item.get('type', 'essay'),
                question=q_text,
                options='|'.join(item.get('options', [])),
                answer=str(item.get('answer', '')),
                explanation=item.get('explanation', ''),
                subject_id=sid,
                subject_name=sname if not sid else ''
            )
            db.session.add(q)
            imported_count += 1

        db.session.commit()
        return jsonify({
            'success': True,
            'imported_count': imported_count,
            'skipped_count': skipped_count,
            'message': f'成功导入 {imported_count} 道题目'
        })

    except Exception as e:
        db.session.rollback()
        print('ADMIN IMPORT ERROR:', str(e))
        return jsonify({'error': '导入失败: ' + str(e)[:200]}), 500


# ===== 题目搜索API =====
@app.route('/api/search_questions')
@login_required
def search_questions():
    """全局搜索题目（关键词/科目/题型）"""
    kw = (request.args.get('q', '') or '').strip().lower()
    sub = (request.args.get('subject', '') or '').strip()
    qt = (request.args.get('type', '') or '').strip()
    page = max(1, int(request.args.get('page', '1')))
    per_page = 20

    query = Question.query
    if kw:
        query = query.filter(Question.question.ilike(f'%{kw}%') | Question.answer.ilike(f'%{kw}%'))
    if sub:
        query = query.filter((Question.subject_name == sub) | (Subject.name == sub).any())
    if qt:
        query = query.filter(Question.type == qt)

    total = query.count()
    items = query.order_by(Question.id.desc()).offset((page-1)*per_page).limit(per_page).all()

    return jsonify({
        'total': total, 'page': page, 'pages': (total + per_page - 1) // per_page,
        'items': [{
            'id': q.id, 'type': q.type, 'question': q.question[:80],
            'answer': q.answer, 'subject': q.subject_name or '',
            'subject_id': q.subject_id
        } for q in items]
    })


# ===== 大学学科分类数据 =====
UNIVERSITY_CATEGORIES = {
    "理工科": [
        {"id": "math", "name": "高等数学", "desc": "微积分、线性代数、概率论"},
        {"id": "physics", "name": "大学物理", "desc": "力学、热学、电磁学、光学、原子物理"},
        {"id": "chem", "name": "普通化学", "desc": "无机化学、有机化学基础"},
        {"id": "cs", "name": "计算机科学", "desc": "数据结构、算法、操作系统、网络"},
        {"id": "elec", "name": "电路与电子技术", "desc": "电路分析、模拟/数字电子技术"},
    ],
    "文史哲法": [
        {"id": "politics", "name": "政治理论", "desc": "马克思主义基本原理、毛概、中特"},
        {"id": "history", "name": "中国近代史纲要", "desc": "1840年以来的中国近现代史"},
        {"id": "law", "name": "法律基础", "desc": "宪法、民法、刑法基础"},
        {"id": "philosophy", "name": "哲学导论", "desc": "马克思主义哲学基本原理"},
    ],
    "经管类": [
        {"id": "economics", " name": "经济学原理", "desc": "微观/宏观经济学基础"},
        {"id": "management", "name": "管理学", "desc": "管理职能、组织行为、战略管理"},
        {"id": "accounting", "name": "会计学", "desc": "财务会计、成本会计基础"},
    ],
    "医学": [
        {"id": "anatomy", "name": "系统解剖学", "desc": "人体各系统解剖结构"},
        {"id": "physiology", "name": "生理学", "desc": "人体正常功能机制"},
        {"id": "pathology", "name": "病理学", "desc": "疾病发生发展规律"},
    ],
    "语言文学": [
        {"id": "english_cet4", "name": "大学英语四级(CET-4)", "desc": "听力、阅读、写作、翻译综合测试"},
        {"id": "english_cet6", "name": "大学英语六级(CET-6)", "desc": "更高难度英语能力测试"},
        {"id": "chinese_modern", "name": "现代汉语", "desc": "语音、文字、词汇、语法、修辞"},
    ],
}

@app.route('/api/university_categories')
def get_university_categories():
    """获取大学学科分类列表"""
    return jsonify(UNIVERSITY_CATEGORIES)


@app.route('/api/exam/start', methods=['POST'])
@login_required
def start_exam():
    """开始一场大学学科考试"""
    d = request.json or {}
    cat_id = (d.get('category_id', '') or '').strip()
    count = min(50, max(5, int(d.get('count', 10))))

    # 查找对应科目的题目（优先从题库匹配）
    cat_info = None
    for cat_list in UNIVERSITY_CATEGORIES.values():
        for c in cat_list:
            if c['id'] == cat_id:
                cat_info = c
                break
        if not cat_info:
            return jsonify({'error': '未知学科'}), 400

    # 尝试按名称匹配题库中的科目，否则随机抽取
    questions = []
    sub = Subject.query.filter(Subject.name.ilike(f'%{cat_info["name"]}%')).first()
    if sub:
        qs = Question.query.filter_by(subject_id=sub.id).order_by(db.func.random()).limit(count).all()
        questions = [format_question_for_exam(q) for q in qs]

    # 如果题库不够，补充其他题目
    if len(questions) < count:
        extra = count - len(questions)
        used_ids = {q['id'] for q in questions}
        extras = Question.query.filter(~Question.id.in_(used_ids)).order_by(db.func.random()).limit(extra).all()
        questions.extend([format_question_for_exam(q) for q in extras])

    exam_data = {'category': cat_info, 'questions': questions, 'total': len(questions)}
    session['current_exam'] = exam_data
    session['exam_answers'] = {}
    session['exam_index'] = 0
    session['exam_start'] = datetime.utcnow().isoformat()

    return jsonify({'success': True, **exam_data})


def format_question_for_exam(q):
    """将题目格式化为考试模式"""
    opts_raw = (q.options or '').split('|') if q.options else []
    opts = [{'label': chr(65+i), 'text': o.strip()} for i, o in enumerate(opts_raw) if o.strip()] if q.type in ('single','multiple') else []
    return {
        'id': q.id, 'type': q.type,
        'question': q.question,
        'options': opts,
        'answer': q.answer,
        'subject': q.subject_name or ''
    }


@app.route('/api/exam/submit_answer', methods=['POST'])
@login_required
def submit_exam_answer():
    """提交单道考试答案（暂存）"""
    d = request.json or {}
    qid = d.get('question_id')
    ans = d.get('answer')
    idx = d.get('index', 0)

    answers = session.get('exam_answers', {})
    if qid is not None:
        answers[str(qid)] = ans
    session['exam_answers'] = answers
    session['exam_index'] = idx + 1

    return jsonify({'success': True, 'next_index': session['exam_index']})


@app.route('/api/exam/finish', methods=['POST'])
@login_required
def finish_exam():
    """结束考试并计算成绩"""
    answers = session.get('exam_answers', {})
    exam = session.get('current_exam', {})

    correct = 0
    wrong = 0
    details = []

    for q in exam.get('questions', []):
        qid_str = str(q['id'])
        user_ans = answers.get(qid_str, '')
        is_correct = str(user_ans).strip().lower() == str(q['answer']).strip().lower()
        if is_correct: correct += 1
        else: wrong += 1
        details.append({
            'question': q['question'][:60],
            'your_answer': user_ans,
            'correct_answer': q['answer'],
            'is_correct': is_correct,
            'type': q['type'],
            'subject': q['subject']
        })

    total = exam.get('total', len(details))
    score = round(correct / total * 100, 1) if total > 0 else 0
    grade = 'A(优秀)' if score >= 90 else 'B(良好)' if score >= 80 else 'C(中等)' if score >= 70 else 'D(及格)' if score >= 60 else 'F(不及格)'

    result = {
        'score': score, 'grade': grade,
        'correct': correct, 'wrong': wrong, 'total': total,
        'category': exam.get('category', {}),
        'details': details,
        'time_spent': ''
    }

    # 清除考试状态
    session.pop('current_exam', None)
    session.pop('exam_answers', None)
    session.pop('exam_index', None)

    return jsonify(result)

@app.route('/api/move_question', methods=['POST'])
@login_required
def move_question():
    """将题目移动到另一个科目"""
    if current_user.role != 'admin':
        return jsonify({'error': '需要管理员权限'}), 403
    d = request.json
    question_ids = d.get('question_ids', [])
    target_subject_id = d.get('target_subject_id')

    if not question_ids or not target_subject_id:
        return jsonify({'error': '缺少参数'}), 400

    target_sub = Subject.query.get(target_subject_id)
    if not target_sub:
        return jsonify({'error': '目标科目不存在'}), 404

    count = 0
    for qid in question_ids:
        q = Question.query.get(qid)
        if q:
            q.subject_id = target_subject_id
            q.subject_name = ''  # 清空旧字段，优先使用subject_id
            count += 1

    db.session.commit()
    return jsonify({
        'success': True,
        'count': count,
        'message': f'已移动 {count} 道题目到「{target_sub.name}」'
    })

# ==================== 兼容旧接口 ====================
@app.route('/api/rename_subject', methods=['POST'])
@login_required
def rename_subject():
    """重命名科目（兼容旧接口，同时更新Subject表和题目）"""
    if current_user.role != 'admin':
        return jsonify({'error': '需要管理员权限'}), 403
    d = request.json
    old_name = d.get('old_name', '').strip()
    new_name = d.get('new_name', '').strip()

    if not old_name or not new_name:
        return jsonify({'error': '原名称和新名称都不能为空'}), 400
    if len(new_name) > 50:
        return jsonify({'error': '科目名称不能超过50个字符'}), 400

    sub = Subject.query.filter_by(name=old_name).first()
    if sub:
        # Subject表中的科目：直接改名
        if Subject.query.filter(Subject.name == new_name, Subject.id != sub.id).first():
            return jsonify({'error': f'科目"{new_name}"已存在'}), 400
        sub.name = new_name
        db.session.commit()
        return jsonify({'success': True, 'count': 1, 'message': f'已将「{old_name}」重命名为「{new_name}」'})
    else:
        # 旧数据（没有Subject记录）：批量更新题目字段 + 创建新Subject
        questions = db.session.query(Question).filter(Question.subject_name == old_name).all()
        if not questions:
            return jsonify({'error': f'未找到名为"{old_name}"的科目'}), 404
        new_sub = Subject(name=new_name)
        db.session.add(new_sub)
        db.session.flush()
        for q in questions:
            q.subject_id = new_sub.id
            q.subject_name = ''
        db.session.commit()
        return jsonify({
            'success': True,
            'count': len(questions),
            'message': f'已将「{old_name}」迁移为「{new_name}」，共 {len(questions)} 道题'
        })

@app.route('/api/delete_subject', methods=['POST'])
@login_required
def delete_subject():
    """删除某个科目（兼容旧接口）"""
    if current_user.role != 'admin':
        return jsonify({'error': '需要管理员权限'}), 403
    d = request.json
    subject_name = d.get('subject_name', '').strip()

    if not subject_name:
        return jsonify({'error': '科目名称不能为空'}), 400

    # 防止删除默认科目
    if subject_name == '\u9ed8\u8ba4\u79d1\u76ee':
        return jsonify({'error': '「默认科目」为系统保留科目，无法删除'}), 400

    # 先检查Subject表
    sub = Subject.query.filter_by(name=subject_name).first()
    if sub:
        count = Question.query.filter(Question.subject_id == sub.id).count()
        default_sub = Subject.query.filter_by(name='\u9ed8\u8ba4\u79d1\u76ee').first()
        if default_sub:
            for q in Question.query.filter(Question.subject_id == sub.id).all():
                q.subject_id = default_sub.id
        db.session.delete(sub)
        db.session.commit()
        return jsonify({
            'success': True, 'count': count,
            'message': f'已删除「{subject_name}」，{count}道题已移至默认科目'
        })
    else:
        # 旧数据
        questions = db.session.query(Question).filter(Question.subject_name == subject_name).all()
        if not questions:
            return jsonify({'error': f'未找到名为"{subject_name}"的科目'}), 404
        count = len(questions)
        for q in questions:
            Record.query.filter_by(question_id=q.id).delete()
            db.session.delete(q)
        db.session.commit()
        return jsonify({
            'success': True, 'count': count,
            'message': f'已删除科目「{subject_name}」下的 {count} 道题目'
        })


# ==================== 答题进度保存/恢复 ====================
@app.route('/api/progress/save', methods=['POST'])
@login_required
def save_progress():
    """保存答题进度（顺序模式用）"""
    d = request.json
    mode = d.get('mode', 'sequential')
    subject_name = d.get('subject_name', '__all__')
    index = d.get('index', 0)
    
    import json
    # 用JSON存到Record表（复用，或直接返回给前端用localStorage）
    return jsonify({'success': True, 'mode': mode, 'subject_name': subject_name, 'index': index})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
