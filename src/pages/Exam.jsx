import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { questions, categories, getQuestionsByCategory, difficultyLabels, difficultyText } from '../data/questions';

const EXAM_DURATION = 600; // 10 minutes in seconds
const EXAM_QUESTION_COUNT = 10;

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function Exam() {
  const navigate = useNavigate();

  const [examState, setExamState] = useState('setup'); // setup | running | finished
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [examQuestions, setExamQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION);
  const [showAnswer, setShowAnswer] = useState(false);
  const timerRef = useRef(null);

  const currentQuestion = examQuestions[currentIndex];

  // Reset selection when question changes
  useEffect(() => {
    setSelectedOptions([]);
    setShowAnswer(false);
  }, [currentIndex]);

  // Timer
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
    let pool;
    if (selectedCategory === 'all') {
      pool = [...questions];
    } else {
      pool = getQuestionsByCategory(selectedCategory);
    }

    if (pool.length === 0) return;

    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(EXAM_QUESTION_COUNT, shuffled.length));

    setExamQuestions(selected);
    setCurrentIndex(0);
    setSelectedOptions([]);
    setAnswers({});
    setTimeLeft(EXAM_DURATION);
    setShowAnswer(false);
    setExamState('running');
  };

  const handleFinishExam = () => {
    clearInterval(timerRef.current);
    setExamState('finished');
  };

  const handleOptionClick = (optIndex) => {
    if (showAnswer) return;

    if (currentQuestion.type === 'single') {
      setSelectedOptions([optIndex]);
    } else {
      setSelectedOptions(prev =>
        prev.includes(optIndex)
          ? prev.filter(i => i !== optIndex)
          : [...prev, optIndex]
      );
    }
  };

  const handleNextQuestion = () => {
    // Save answer
    if (selectedOptions.length > 0) {
      const isCorrect = currentQuestion.type === 'single'
        ? selectedOptions[0] === currentQuestion.answer
        : JSON.stringify([...selectedOptions].sort()) === JSON.stringify([...currentQuestion.answer].sort());

      setAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: { selected: selectedOptions, isCorrect }
      }));
    }

    if (currentIndex < examQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleFinishExam();
    }
  };

  // Compute results
  const examResult = useMemo(() => {
    if (examState !== 'finished') return null;

    let correct = 0;
    let wrong = 0;
    let unanswered = 0;

    examQuestions.forEach(q => {
      const ans = answers[q.id];
      if (!ans) {
        unanswered++;
      } else if (ans.isCorrect) {
        correct++;
      } else {
        wrong++;
      }
    });

    return { correct, wrong, unanswered, total: examQuestions.length, score: Math.round((correct / examQuestions.length) * 100) };
  }, [examState, answers, examQuestions]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getDifficultyTagClass = (level) => {
    if (level <= 2) return 'tag-difficulty-easy';
    if (level <= 3) return 'tag-difficulty-medium';
    return 'tag-difficulty-hard';
  };

  // --- Render ---
  if (examState === 'setup') {
    const categoryOptions = [
      { id: 'all', name: '全科目随机', icon: '📚' },
      ...categories,
    ];

    return (
      <div className="practice-page">
        <div className="page-header" style={{ textAlign: 'center' }}>
          <h1 className="page-title">📝 模拟考试</h1>
          <p className="page-desc">限时 10 分钟，完成 {EXAM_QUESTION_COUNT} 道随机题目</p>
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

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <button className="btn btn-primary" onClick={handleStartExam}
              style={{ padding: '14px 48px', fontSize: 18 }}>
              🚀 开始考试
            </button>
          </div>

          <div style={{ marginTop: 20, padding: 16, background: 'var(--gray-50)', borderRadius: 8, fontSize: 14, color: 'var(--gray-600)' }}>
            <strong style={{ display: 'block', marginBottom: 8 }}>📋 考试规则：</strong>
            <div>• 共 {EXAM_QUESTION_COUNT} 道题目，限时 10 分钟</div>
            <div>• 可随时交卷，系统自动计算成绩</div>
            <div>• 提交后无法修改答案</div>
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
          </div>
        </div>
      </div>
    );
  }

  // Running state
  return (
    <div className="exam-page">
      <div className="practice-header">
        <div className="practice-progress">
          <span className="progress-text">
            第 {currentIndex + 1} / {examQuestions.length} 题
          </span>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${((currentIndex + 1) / examQuestions.length) * 100}%` }}
            />
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

      {/* Question */}
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

              if (showAnswer) {
                const isCorrectAnswer = currentQuestion.type === 'single'
                  ? idx === currentQuestion.answer
                  : currentQuestion.answer.includes(idx);

                if (isCorrectAnswer) optionClass += ' correct';
                else if (selectedOptions.includes(idx) && !isCorrectAnswer) optionClass += ' wrong';
              }

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
            <button
              className="btn-submit"
              onClick={handleNextQuestion}
              disabled={selectedOptions.length === 0}
            >
              {currentIndex < examQuestions.length - 1 ? '下一题 →' : '📊 交卷'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
