#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
import os
import re
from datetime import datetime

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

class Question(db.Model):
    __tablename__ = 'questions'
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(20), nullable=False)
    question = db.Column(db.Text, nullable=False)
    options = db.Column(db.Text)
    answer = db.Column(db.Text, nullable=False)
    explanation = db.Column(db.Text)
    subject = db.Column(db.String(100), default='\u9ed8\u8ba4\u79d1\u76ee')  # 科目分类
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Record(db.Model):
    __tablename__ = 'records'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('questions.id'), nullable=False)
    user_answer = db.Column(db.Text)
    is_correct = db.Column(db.Boolean)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

@login_manager.user_loader
def load_user(user_id):
    try:
        return User.query.get(int(user_id))
    except:
        return None

# ==================== 初始化数据库 ====================
with app.app_context():
    try:
        db.create_all()
        # 检查是否需要添加subject列（旧版本升级）- 使用raw connection执行DDL
        from sqlalchemy import text, inspect
        inspector = inspect(db.engine)
        existing_cols = [c['name'] for c in inspector.get_columns('questions')]
        if 'subject' not in existing_cols:
            print("MIGRATION: Adding 'subject' column to questions table...")
            conn = db.engine.raw_connection()
            try:
                cursor = conn.cursor()
                cursor.execute("ALTER TABLE questions ADD COLUMN subject VARCHAR(100) DEFAULT '默认科目'")
                conn.commit()
                print("MIGRATION: subject column added successfully")
            finally:
                conn.close()
            # 刷新inspector缓存
            inspector = inspect(db.engine)
        # 确保admin用户存在且密码正确
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            admin = User(username='admin', role='admin')
            admin.set_password('admin')
            db.session.add(admin)
            db.session.commit()
        elif not admin.check_password('admin'):
            # 数据库中已存在admin但密码不正确（旧版本升级），重置密码
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
    if re.search(r'(\u5bf9|\u9519|\u6b63\u786e|\u9519\u8bef)', full) and len(re.findall(r'(\u5bf9|\u9519)', full)) >= 2:
        return 'judge', [], extract_judge(text)
    if '\u591a9000' in text:
        return 'multiple', extract_opts(opts), extract_multi(text)
    opts_list = extract_opts(opts)
    if opts_list and len(opts_list) >= 2:
        return 'single', opts_list, extract_single(text)
    if '____' in text or '\uff08\uff09' in text:
        return 'fill', [], extract_fill(text)
    return 'essay', [], extract_essay(text)

def extract_opts(text):
    return [m.group(1).strip() for m in re.finditer(r'([A-D])[\.\u3001\)](.*?)(?=[A-D][\.\u3001\)]|$)', text + ' ', re.DOTALL)]

def extract_single(text):
    m = re.search(r'\u7b54\u6848[：:]\s*([A-D])', text)
    return m.group(1) if m else ''

def extract_multi(text):
    m = re.search(r'\u7b54\u6848[：:]\s*([A-D,\uff0c\u3001]+)', text)
    return [c for c in m.group(1) if c in 'ABCD'] if m else []

def extract_judge(text):
    m = re.search(r'\u7b54\u6848[：:]\s*(\u5bf9|\u6b63\u786e)', text)
    return '\u6b63\u786e' if m else '\u9519\u8bef'

def extract_fill(text):
    m = re.search(r'\u7b54\u6848[：:]\s*(.+)', text)
    return m.group(1).strip() if m else ''

def extract_essay(text):
    m = re.search(r'\u7b54\u6848[：:]\s*(.+)$', text, re.DOTALL)
    return m.group(1).strip() if m else ''

# ==================== Word导入 ====================
def parse_word_from_bytes(file_bytes):
    """从内存字节流解析Word文档，兼容Render只读文件系统"""
    import io
    from docx import Document
    try:
        doc = Document(io.BytesIO(file_bytes))
    except Exception as e:
        raise Exception('Word\u89e3\u6790\u5931\u8d25: ' + str(e))

    qs = []
    cur = {}
    opts = []
    current_subject = '\u9ed8\u8ba4\u79d1\u76ee'

    for p in doc.paragraphs:
        t = p.text.strip()
        if not t:
            continue
        # 检测章节标题作为科目名（中文数字开头、含"章"字、短标题）
        if re.match(r'^[\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341]+[\u3001\.]', t) or \
           re.match(r'^\u7b2c.+[^\u9898]', t) or (len(t) < 20 and '\u7ae0' in t):
            current_subject = t.strip()
            continue
        if re.match(r'^\d+[\.\u3001\)]', t):
            if cur:
                cur['type'], cur['options'], cur['answer'] = identify_type(cur.get('q', ''), ' '.join(opts))
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
        cur['subject'] = current_subject
        qs.append(cur)

    return qs


def parse_word(path):
    """兼容旧接口：从文件路径解析"""
    with open(path, 'rb') as f:
        return parse_word_from_bytes(f.read())

# ==================== 路由 ====================
@app.route('/')
def index():
    if not current_user.is_authenticated:
        return redirect(url_for('login'))
    return render_template('index.html')

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
    qs = Question.query.order_by(Question.subject.asc(), Question.id.asc()).all()
    result = []
    for q in qs:
        result.append({
            'id': q.id,
            'type': q.type,
            'question': q.question,
            'options': q.options.split('|') if q.options else [],
            'answer': q.answer,
            'explanation': q.explanation or '',
            'subject': q.subject or '\u9ed8\u8ba4\u79d1\u76ee'
        })
    return jsonify(result)

@app.route('/api/subjects')
@login_required
def get_subjects():
    """获取所有科目列表"""
    subjects = db.session.query(Question.subject).distinct().all()
    result = []
    for s in subjects:
        name = s[0] or '\u9ed8\u8ba4\u79d1\u76ee'
        count = Question.query.filter(Question.subject == name).count()
        result.append({'name': name, 'count': count})
    return jsonify(result)

@app.route('/api/questions/by_subject/<subject_name>')
@login_required
def get_qs_by_subject(subject_name):
    """获取指定科目的题目"""
    qs = Question.query.filter(Question.subject == subject_name).order_by(Question.id.asc()).all()
    result = []
    for q in qs:
        result.append({
            'id': q.id,
            'type': q.type,
            'question': q.question,
            'options': q.options.split('|') if q.options else [],
            'answer': q.answer,
            'explanation': q.explanation or '',
            'subject': q.subject or '\u9ed8\u8ba4\u79d1\u76ee'
        })
    return jsonify(result)

@app.route('/api/questions/practice/<subject_name>')
@login_required
def get_practice_qs(subject_name):
    """获取指定科目的题目用于练习"""
    if subject_name == '__all__':
        qs = Question.query.all()
    else:
        qs = Question.query.filter(Question.subject == subject_name).all()
    import random
    random.shuffle(qs)
    result = []
    for q in qs:
        result.append({
            'id': q.id,
            'type': q.type,
            'question': q.question,
            'options': q.options.split('|') if q.options else [],
            'answer': q.answer,
            'explanation': q.explanation or '',
            'subject': q.subject or '\u9ed8\u8ba4\u79d1\u76ee'
        })
    return jsonify(result)

@app.route('/api/questions', methods=['POST'])
@login_required
def add_q():
    if current_user.role != 'admin':
        return jsonify({'error': 'Forbidden'}), 403
    d = request.json
    q = Question(
        type=d['type'],
        question=d['question'],
        options='|'.join(d.get('options', [])),
        answer=str(d['answer']),
        explanation=d.get('explanation', ''),
        subject=d.get('subject', '\u9ed8\u8ba4\u79d1\u76ee'),
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

        # 检查文件格式
        if not f.filename.lower().endswith('.docx'):
            return jsonify({'error': '\u53ea\u652f\u6301.docx\u683c\u5f0f'})

        # 读取文件内容到内存（不写入磁盘，兼容Render只读文件系统）
        file_bytes = f.read()

        if len(file_bytes) == 0:
            return jsonify({'error': '\u6587\u4ef6\u4e3a\u7a7a'})
        if len(file_bytes) > 10 * 1024 * 1024:  # 限制10MB
            return jsonify({'error': '\u6587\u4ef6\u8fc7\u5927\uff0c\u8bf7\u63a7\u5236\u572810MB\u4ee5\u5185'})

        # 从内存流解析Word文档
        qs = parse_word_from_bytes(file_bytes)

        if not qs:
            return jsonify({'error': '\u672a\u8bc6\u522b\u5230\u6709\u6548\u9898\u76ee\uff0c\u8bf7\u68c0\u67e5Word\u683c\u5f0f\u662f\u5426\u6b63\u786e'})

        # 批量入库
        count = 0
        for item in qs:
            q_text = item.get('q', '').strip()
            if not q_text:
                continue

            q = Question(
                type=item.get('type', 'essay'),
                question=q_text,
                options='|'.join(item.get('options', [])),
                answer=str(item.get('answer', '')),
                explanation=item.get('explanation', ''),
                subject=item.get('subject', '\u9ed8\u8ba4\u79d1\u76ee'),
                created_by=current_user.id
            )
            db.session.add(q)
            count += 1

        db.session.commit()
        return jsonify({
            'success': True,
            'count': count,
            'message': '\u6210\u529f\u5bfc\u5165' + str(count) + '\u9053\u9898\u76ee'
        })

    except Exception as e:
        # 回滚事务
        db.session.rollback()
        error_msg = str(e)
        print('IMPORT ERROR: ' + error_msg)  # Render日志可见
        return jsonify({
            'error': '\u5bfc\u5165\u5931\u8d25: ' + error_msg[:200]
        }), 500

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
        correct = str(ua).strip() == str(q.answer).strip()
    elif q.type == 'fill':
        correct = str(ua).strip() == str(q.answer).strip()
    try:
        db.session.add(Record(
            user_id=current_user.id,
            question_id=qid,
            user_answer=str(ua),
            is_correct=bool(correct)
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
    """获取错题列表"""
    wrong_records = Record.query.filter_by(
        user_id=current_user.id,
        is_correct=False
    ).order_by(Record.created_at.desc()).all()

    result = []
    seen = set()
    for r in wrong_records:
        if r.question_id not in seen:
            seen.add(r.question_id)
            q = Question.query.get(r.question_id)
            if q:
                result.append({
                    'id': q.id,
                    'type': q.type,
                    'question': q.question,
                    'options': q.options.split('|') if q.options else [],
                    'answer': q.answer,
                    'explanation': q.explanation or '',
                    'user_answer': r.user_answer,
                    'subject': q.subject or '\u9ed8\u8ba4\u79d1\u76ee'
                })
    return jsonify(result)

@app.route('/api/me')
@login_required
def get_me():
    return jsonify({
        'id': current_user.id,
        'username': current_user.username,
        'role': current_user.role
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
