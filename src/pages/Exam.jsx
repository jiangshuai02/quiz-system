import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { questions, categories, getQuestionsByCategory } from '../data/questions';
import { useAuth } from '../contexts/AuthContext';
import { saveExamResult } from '../lib/supabase';

const EXAM_DURATIONS = [
  { value: 300, label: '5 分钟' },
  { value: 600, label: '10 分钟' },
  { value: 900, label: '15 分钟' },
  { value: 1200, label: '20 分钟' },
  { value: 1800, label: '30 分钟' },
];
const EXAM_QUESTION_COUNTS = [5, 10, 20, 30, 50];
const DEFAULT_DURATION = 600;
const DEFAULT_COUNT = 10;
const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function Exam() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [examState, setExamState] = useState('setup');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [examQuestions, setExamQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [examDuration, setExamDuration] = useState(DEFAULT_DURATION);
  const [examCount, setExamCount] = useState(DEFAULT_COUNT);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_DURATION);
  const [showAnswer, setShowAnswer] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const timerRef = useRef(null);

  const currentQuestion = examQuestions[currentIndex];

  useEffect(() => {
    setSelectedOptions([]);
    setShowAnswer(false);
  }, [currentIndex]);

  useEffect(() => {
    if (examState !== 'running') return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleFinishExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [examState]);

  const handleStartExam = () => {
    let pool = selectedCategory === 'all' ? [...questions] : getQuestionsByCategory(selectedCategory);
    if (pool.length === 0) return;

    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(examCount, shuffled.length));

    setExamQuestions(selected);
    setCurrentIndex(0);
    setSelectedOptions([]);
    setAnswers({});
    setTimeLeft(examDuration);
    setShowAnswer(false);
    setStartTime(Date.now());
    setExamState('running');
  };

  const handleFinishExam = async () => {
    clearInterval(timerRef.current);
    setExamState('finished');

    if (user) {
      try {
        const result = examResult;
        if (result) {
          const duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
          await saveExamResult(user.id, {
            category: selectedCategory,
            total: result.total,
            correct: result.correct,
            wrong: result.wrong,
            unanswered: result.unanswered,
            score: result.score,
            duration,
          });
        }
      } catch (e) {
        console.error('保存考试结果失败', e);
      }
    }
  };

  const examResult = useMemo(() => {
    if (examState !== 'finished') return null;

    let correct = 0, wrong = 0, unanswered = 0;
    examQuestions.forEach(q => {
      const ans = answers[q.id];
      if (!ans) unanswered++;
      else if (ans.isCorrect) correct++;
      else wrong++;
    });

    return {
      correct, wrong, unanswered, total: examQuestions.length,
      score: Math.round((correct / examQuestions.length) * 100),
    };
  }, [examState, answers, examQuestions]);

  const handleOptionClick = (optIndex) => {
    if (showAnswer) return;
    if (currentQuestion.type === 'single') setSelectedOptions([optIndex]);
    else setSelectedOptions(prev => prev.includes(optIndex) ? prev.filter(i => i !== optIndex) : [...prev, optIndex]);
  };

  const handleNextQuestion = () => {
    if (selectedOptions.length > 0) {
      const isCorrect = currentQuestion.type === 'single'
        ? selectedOptions[0] === currentQuestion.answer
        : JSON.stringify([...selectedOptions].sort()) === JSON.stringify([...currentQuestion.answer].sort());

      setAnswers(prev => ({ ...prev, [currentQuestion.id]: { selected: selectedOptions, isCorrect } }));
    }

    if (currentIndex < examQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleFinishExam();
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (examState === 'setup') {
    const categoryOptions = [
      { id: 'all', name: '全科目随机', icon: '📚' },
      ...categories,
    ];

    return (
      <div className="practice-page">
        <div className="page-header" style={{ textAlign: 'center' }}>
          <h1 className="page-title">📝 模拟考试</h1>
          <p className="page-desc">支持自定义时长和题目数量</p>
        </div>

        <div className="practice-card" style={{ maxWidth: 600, margin: '0 auto' }}>
          <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 600 }}>选择考试科目</h3>
          <div className="category-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            {categoryOptions.map(cat => (
              <div
                key={cat.id}
                className={`category-card ${selectedCategory === cat.id ? 'category-card-selected' : ''}`}
                style={{
                  ...(selectedCategory === cat.id ? { borderColor: 'var(--primary)', background: 'var(--primary-bg)' } : {}),
                  padding: 16,
                }}
                onClick={() => setSelectedCategory(cat.id)}
              >
                <span className="category-icon" style={{ fontSize: 28 }}>{cat.icon}</span>
                <div className="category-name" style={{ fontSize: 15 }}>{cat.name}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, padding: 16, background: '#f9fafb', borderRadius: 8, fontSize: 14, color: '#6b7280' }}>
            <strong style={{ display: 'block', marginBottom: 8, color: '#111827' }}>⚙️ 考试设置：</strong>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>⏱️ 考试时长</div>
                <select value={examDuration} onChange={e => setExamDuration(parseInt(e.target.value))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}>
                  {EXAM_DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>📝 题目数量</div>
                <select value={examCount} onChange={e => setExamCount(parseInt(e.target.value))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}>
                  {EXAM_QUESTION_COUNTS.map(c => <option key={c} value={c}>{c} 题</option>)}
                </select>
              </div>
            </div>
            <strong style={{ display: 'block', marginBottom: 4, color: '#111827' }}>📋 考试规则：</strong>
            <div>• 共 {examCount} 道题目，限时 {Math.floor(examDuration / 60)} 分钟</div>
            <div>• 可随时交卷，系统自动计算成绩</div>
            <div>• 提交后无法修改答案</div>
            {user && <div style={{ marginTop: 8, color: '#10b981' }}>☁️ 考试结果将自动同步到云端</div>}
          </div>
        </div>
      </div>
    );
  }

  if (examState === 'finished') {
    return (
      <div className="practice-page">
        <div className="exam-result">
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 48 }}>{examResult.score >= 80 ? '🎉' : examResult.score >= 60 ? '💪' : '📚'}</span>
          </div>
          <div className="exam-result-score">{examResult.score}<span style={{ fontSize: 24, color: 'var(--gray-400)' }}>分</span></div>
          <div className="exam-result-label">
            {examResult.score >= 80 ? '太棒了，表现优异！' : examResult.score >= 60 ? '不错，继续加油！' : '需要多多练习哦！'}
            {user && <span style={{ display: 'block', marginTop: 8, fontSize: 13, color: 'var(--success)' }}>☁️ 已保存到云端</span>}
          </div>

          <div className="stats-grid" style={{ maxWidth: 500, margin: '24px auto' }}>
            <div className="stat-card">
              <div className="stat-card-value" style={{ color: 'var(--success)', fontSize: 24 }}>{examResult.correct}</div>
              <div className="stat-card-label">正确</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-value" style={{ color: 'var(--error)', fontSize: 24 }}>{examResult.wrong}</div>
              <div className="stat-card-label">错误</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-value" style={{ color: 'var(--gray-400)', fontSize: 24 }}>{examResult.unanswered}</div>
              <div className="stat-card-label">未答</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-value" style={{ color: 'var(--primary)', fontSize: 24 }}>{examResult.total}</div>
              <div className="stat-card-label">总题数</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handleStartExam}>
              🔄 再来一次
            </button>
            <button className="btn btn-outline" style={{ borderColor: 'var(--gray-300)', color: 'var(--gray-700)' }}
              onClick={() => navigate('/wrongbook')}>
              📕 查看错题
            </button>
            <button className="btn btn-outline" style={{ borderColor: 'var(--gray-300)', color: 'var(--gray-700)' }}
              onClick={() => navigate('/stats')}>
              📊 学习统计
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="exam-page">
      <div className="practice-header">
        <div className="practice-progress">
          <span className="progress-text">
            第 {currentIndex + 1} / {examQuestions.length} 题
          </span>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${((currentIndex + 1) / examQuestions.length) * 100}%` }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span className={`exam-timer ${timeLeft <= 60 ? 'warning' : ''}`}>
            ⏱️ {formatTime(timeLeft)}
          </span>
          <button className="btn-nav" onClick={handleFinishExam}
            style={{ border: '1px solid var(--error)', color: 'var(--error)' }}>
            交卷
          </button>
        </div>
      </div>

      {currentQuestion && (
        <div className="practice-card">
          <div className="question-type-tag">
            {currentQuestion.type === 'single' ? '单选题' : '多选题'}
          </div>
          <div className="question-text">{currentQuestion.title}</div>

          <div className="options">
            {currentQuestion.options.map((opt, idx) => {
              let optionClass = 'option';
              if (selectedOptions.includes(idx)) optionClass += ' selected';

              return (
                <div
                  key={idx}
                  className={optionClass}
                  onClick={() => handleOptionClick(idx)}
                >
                  <span className="option-letter">{OPTION_LETTERS[idx]}</span>
                  <span>{opt}</span>
                </div>
              );
            })}
          </div>

          <div className="practice-actions">
            <button className="btn-submit" onClick={handleNextQuestion} disabled={selectedOptions.length === 0}>
              {currentIndex < examQuestions.length - 1 ? '下一题 →' : '📊 交卷'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
