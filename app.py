#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
智能刷题系统 - 多用户版
超级管理员可以导入题库，所有用户共享题库进行刷题
支持云平台部署（PostgreSQL/MySQL/SQLite）
"""

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
    # Render PostgreSQL 需要 sslmode=require
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    if '?' not in database_url:
        database_url += '?sslmode=require'
    else:
        if 'sslmode' not in database_url:
            database_url += '&sslmode=require'
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    print("使用PostgreSQL数据库")
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///quiz.db'
    print("使用SQLite数据库")

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'quiz-system-2026')

db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'
login_manager.login_message = '请先登录'

# ==================== 数据模型 ====================
class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), default='user')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

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
    return User.query.get(int(user_id))

# ==================== 初始化数据库（安全方式） ====================
def init_db():
    """安全初始化数据库，可被gunicorn安全调用"""
    try:
        with app.app_context():
            db.create_all()
            # 创建默认管理员账号
            if not User.query.filter_by(role='admin').first():
                admin = User(username='admin', role='admin')
                admin.set_password('admin123')
                db.session.add(admin)
                db.session.commit()
                print("创建默认管理员账号: admin / admin123")
            else:
                print("管理员账号已存在")
    except Exception as e:
        print(f"数据库初始化警告: {e}")

# 不在模块级别调用，改为在before_request或命令行中调用
# 为了兼容gunicorn，在首次请求前初始化
@app.before_request
def ensure_db_initialized():
    """在每个请求前检查数据库，但只初始化一次"""
    if not hasattr(app, '_db_initialized'):
        with app.app_context():
            init_db()
        app._db_initialized = True

# ==================== 题型识别 ====================
def identify_question_type(question_text, options_text=''):
    text = question_text + ' ' + options_text

    if re.search(r'(对|错|正确|错误|True|False)', text):
        if len(re.findall(r'(对|错|正确|错误)', text)) >= 2:
            return 'judge', [], extract_judge_answer(text)

    if '多选' in question_text or '（多选）' in question_text or '[多选]' in question_text:
        return 'multiple', extract_options(options_text), extract_multiple_answer(text)

    if '____' in question_text or '___' in question_text or '（）' in question_text:
        return 'fill', [], extract_fill_answer(text)

    options = extract_options(options_text)
    if options and len(options) >= 2:
        return 'single', options, extract_single_answer(text)

    return 'essay', [], extract_essay_answer(text)

def extract_options(text):
    pattern = r'[A-D][\.\、\)](.*?)(?=[A-D][\.\、\)]|$)'
    matches = re.findall(pattern, text + ' ', re.DOTALL)
    return [m.strip() for m in matches if m.strip()]

def extract_single_answer(text):
    m = re.search(r'答案[：:]\s*([A-D])', text)
    return m.group(1) if m else ''

def extract_multiple_answer(text):
    m = re.search(r'答案[：:]\s*([A-D,，、]+)', text)
    if m:
        return [c for c in m.group(1) if c in 'ABCD']
    return []

def extract_judge_answer(text):
    # 修复：正确分组正则
    m = re.search(r'答案[：:]\s*(对|正确|True|T)', text, re.I)
    if m:
        return '正确'
    m = re.search(r'答案[：:]\s*(错|错误|False|F)', text, re.I)
    if m:
        return '错误'
    return ''

def extract_fill_answer(text):
    m = re.search(r'答案[：:]\s*(.+)', text)
    return m.group(1).strip() if m else ''

def extract_essay_answer(text):
    m = re.search(r'答案[：:]\s*(.+)$', text, re.DOTALL)
    return m.group(1).strip() if m else ''

# ==================== Word导入 ====================
def parse_word_file(file_path):
    try:
        from docx import Document
    except ImportError:
        return {'error': '请先安装python-docx'}

    doc = Document(file_path)
    questions = []
    current_q = {}
    current_options = []

    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue

        if re.match(r'^\d+[\.\、\)]', text):
            if current_q:
                q_type, options, answer = identify_question_type(
                    current_q.get('question', ''),
                    ' '.join(current_options)
                )
                current_q['type'] = q_type
                current_q['options'] = options
                current_q['answer'] = answer
                questions.append(current_q)

            current_q = {'question': text}
            current_options = []
        elif re.match(r'^[A-D][\.\、\)]', text):
            current_options.append(text)
        elif current_q:
            current_q['question'] = current_q.get('question', '') + ' ' + text

    if current_q:
        q_type, options, answer = identify_question_type(
            current_q.get('question', ''),
            ' '.join(current_options)
        )
        current_q['type'] = q_type
        current_q['options'] = options
        current_q['answer'] = answer
        questions.append(current_q)

    return questions

# ==================== 路由 ====================
@app.route('/')
def index():
    if not current_user.is_authenticated:
        return redirect(url_for('login'))
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        user = User.query.filter_by(username=username).first()

        if user and user.check_password(password):
            login_user(user)
            return redirect(url_for('index'))
        else:
            return render_template('login.html', error='用户名或密码错误')

    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')

        if not username or not password:
            return render_template('register.html', error='用户名和密码不能为空')

        if User.query.filter_by(username=username).first():
            return render_template('register.html', error='用户名已存在')

        user = User(username=username)
        user.set_password(password)

        # 如果这是第一个用户，设为管理员
        if User.query.count() == 0:
            user.role = 'admin'

        db.session.add(user)
        db.session.commit()

        login_user(user)
        return redirect(url_for('index'))

    return render_template('register.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/api/questions', methods=['GET'])
@login_required
def get_questions():
    questions = Question.query.order_by(Question.id.desc()).all()
    return jsonify([{
        'id': q.id,
        'type': q.type,
        'question': q.question,
        'options': q.options.split('|') if q.options else [],
        'answer': q.answer,
        'explanation': q.explanation
    } for q in questions])

@app.route('/api/questions', methods=['POST'])
@login_required
def add_question():
    if current_user.role != 'admin':
        return jsonify({'error': '权限不足'}), 403

    data = request.json
    q = Question(
        type=data['type'],
        question=data['question'],
        options='|'.join(data.get('options', [])),
        answer=str(data['answer']),
        explanation=data.get('explanation', ''),
        created_by=current_user.id
    )
    db.session.add(q)
    db.session.commit()
    return jsonify({'success': True, 'id': q.id})

@app.route('/api/questions/<int:qid>', methods=['DELETE'])
@login_required
def delete_question(qid):
    if current_user.role != 'admin':
        return jsonify({'error': '权限不足'}), 403

    q = Question.query.get(qid)
    if q:
        db.session.delete(q)
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({'error': '题目不存在'}), 404

@app.route('/api/import_word', methods=['POST'])
@login_required
def import_word():
    if current_user.role != 'admin':
        return jsonify({'error': '权限不足'}), 403

    if 'file' not in request.files:
        return jsonify({'error': '请上传文件'})

    file = request.files['file']
    if not file.filename.endswith('.docx'):
        return jsonify({'error': '仅支持.docx格式'})

    temp_path = 'temp_' + str(datetime.now().timestamp()) + '.docx'
    file.save(temp_path)

    questions = parse_word_file(temp_path)
    os.remove(temp_path)

    if 'error' in questions:
        return jsonify(questions)

    for q in questions:
        db.session.add(Question(
            type=q['type'],
            question=q['question'],
            options='|'.join(q.get('options', [])),
            answer=str(q['answer']),
            explanation=q.get('explanation', ''),
            created_by=current_user.id
        ))
    db.session.commit()

    return jsonify({'success': True, 'count': len(questions)})

@app.route('/api/check_answer', methods=['POST'])
@login_required
def check_answer():
    data = request.json
    question_id = data.get('question_id')
    user_answer = data.get('answer')

    if not question_id or user_answer is None:
        return jsonify({'error': '参数不完整'})

    q = Question.query.get(question_id)
    if not q:
        return jsonify({'error': '题目不存在'})

    is_correct = False

    if q.type == 'single':
        is_correct = str(user_answer).upper() == str(q.answer).upper()
    elif q.type == 'multiple':
        # 多选题答案存储格式：逗号分隔如 "A,B,C"
        user_set = set(user_answer) if isinstance(user_answer, list) else set(str(user_answer).split(','))
        correct_set = set(str(q.answer).split(',')) if ',' in str(q.answer) else set(str(q.answer))
        is_correct = user_set == correct_set
    elif q.type == 'judge':
        is_correct = str(user_answer).strip() == str(q.answer).strip()
    elif q.type == 'fill':
        is_correct = str(user_answer).strip() == str(q.answer).strip()
    else:
        is_correct = None  # 简答题无法自动判错

    try:
        db.session.add(Record(
            user_id=current_user.id,
            question_id=question_id,
            user_answer=str(user_answer),
            is_correct=is_correct if is_correct is not None else False
        ))
        db.session.commit()
    except Exception as e:
        print(f"记录答题记录失败: {e}")

    return jsonify({
        'is_correct': is_correct,
        'correct_answer': q.answer,
        'explanation': q.explanation or ''
    })

@app.route('/api/statistics', methods=['GET'])
@login_required
def get_statistics():
    total = Question.query.count()
    answered = Record.query.filter_by(user_id=current_user.id).count()
    correct = Record.query.filter_by(user_id=current_user.id, is_correct=True).count()

    return jsonify({
        'total': total,
        'answered': answered,
        'correct': correct,
        'accuracy': round(correct / answered * 100, 2) if answered > 0 else 0
    })

@app.route('/api/users/role')
@login_required
def get_role():
    return jsonify({'role': current_user.role})

@app.route('/api/users/me')
@login_required
def get_me():
    return jsonify({
        'id': current_user.id,
        'username': current_user.username,
        'role': current_user.role
    })

# ==================== 启动 ====================
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    # 本地运行时初始化数据库
    init_db()
    app.run(host='0.0.0.0', port=port, debug=True)
