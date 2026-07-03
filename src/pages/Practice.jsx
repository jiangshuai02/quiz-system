import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { questions, categories, difficultyLabels, difficultyText } from '../data/questions';
import { useAuth } from '../contexts/AuthContext';
import { addWrongAnswer, recordAnswer, updateStudyStats } from '../lib/supabase';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shuffleQuestionOptions(question) {
  if (!question || !Array.isArray(question.options)) return question;
  const indices = question.options.map((_, i) => i);
  const shuffledIndices = shuffle(indices);
  const newOptions = shuffledIndices.map(i => question.options[i]);
  let newAnswer;
  if (question.type === 'single') {
    const originalCorrectIdx = Array.isArray(question.answer) ? question.answer[0] : question.answer;
    newAnswer = [shuffledIndices.indexOf(originalCorrectIdx)];
  } else {
    newAnswer = (question.answer || []).map(a => shuffledIndices.indexOf(a)).sort((a, b) => a - b);
  }
  return { ...question, options: newOptions, answer: newAnswer };
}

export default function Practice() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { questionId } = useParams();

  const [questionOrder, setQuestionOrder] = useState(() => questions.map((_, i) => i));
  const [optionShuffleEnabled, setOptionShuffleEnabled] = useState(false);

  const baseQuestionList = useMemo(() => {
    return questionOrder.map(i => questions[i]);
  }, [questionOrder]);

  const [currentIndex, setCurrentIndex] = useState(() => {
    if (questionId) {
      const idx = questions.findIndex(q => q.id === parseInt(questionId));
      if (idx >= 0) return idx;
    }
    return 0;
  });

  const currentQuestionRaw = baseQuestionList[currentIndex];
  const currentQuestion = useMemo(() => {
    if (!currentQuestionRaw) return null;
    if (optionShuffleEnabled) return shuffleQuestionOptions(currentQuestionRaw);
    return currentQuestionRaw;
  }, [currentQuestionRaw, optionShuffleEnabled]);

  const [selectedOptions, setSelectedOptions] = useState([]);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [answerHistory, setAnswerHistory] = useState({});

  useEffect(() => {
    setSelectedOptions([]);
    setShowResult(false);
    setIsCorrect(false);
  }, [currentIndex]);

  useEffect(() => {
    if (questionId && currentIndex === 0) {
      const idx = questions.findIndex(q => q.id === parseInt(questionId));
      if (idx >= 0) setCurrentIndex(idx);
    }
  }, [questionId, currentIndex]);

  const handleOptionClick = (optIndex) => {
    if (showResult) return;
    if (currentQuestion.type === 'single') {
      setSelectedOptions([optIndex]);
    } else if (currentQuestion.type === 'multiple') {
      setSelectedOptions(prev =>
        prev.includes(optIndex)
          ? prev.filter(i => i !== optIndex)
          : [...prev, optIndex]
      );
    }
  };

  const handleSubmit = async () => {
    if (selectedOptions.length === 0) return;

    const correct = currentQuestion.type === 'single'
      ? selectedOptions[0] === currentQuestion.answer
      : JSON.stringify([...selectedOptions].sort()) === JSON.stringify([...currentQuestion.answer].sort());

    setIsCorrect(correct);
    setShowResult(true);

    setAnswerHistory(prev => ({
      ...prev,
      [currentQuestion.id]: { selected: selectedOptions, isCorrect: correct }
    }));

    if (user) {
      try {
        await recordAnswer(user.id, currentQuestion.id, correct);
        if (!correct) {
          await addWrongAnswer(
            user.id,
            currentQuestion.id,
            selectedOptions.map(i => OPTION_LETTERS[i]).join(',')
          );
        }
        await updateStudyStats(user.id, correct);
      } catch (e) {
        console.error('同步失败', e);
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < baseQuestionList.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleShuffleQuestions = () => {
    const indices = questions.map((_, i) => i);
    const shuffled = shuffle(indices);
    setQuestionOrder(shuffled);
    setCurrentIndex(0);
    setSelectedOptions([]);
    setShowResult(false);
    setIsCorrect(false);
  };

  const handleShuffleOptions = () => {
    setOptionShuffleEnabled(prev => !prev);
    setSelectedOptions([]);
    setShowResult(false);
  };

  const getDifficultyTagClass = (level) => {
    if (level <= 2) return 'tag-difficulty-easy';
    if (level <= 3) return 'tag-difficulty-medium';
    return 'tag-difficulty-hard';
  };

  if (!currentQuestion) {
    return (
      <div className="practice-page">
        <div className="empty-state">
          <span className="empty-icon">🤔</span>
          <p className="empty-text">题目不存在</p>
          <p className="empty-desc">请返回题库选择题目</p>
          <button className="btn btn-primary" onClick={() => navigate('/questions')}
            style={{ marginTop: 16 }}>
            返回题库
          </button>
        </div>
      </div>
    );
  }

  const answeredCount = Object.keys(answerHistory).length;
  const correctCount = Object.values(answerHistory).filter(a => a.isCorrect).length;

  return (
    <div className="practice-page">
      <div className="practice-header">
        <div className="practice-progress">
          <span className="progress-text">
            第 {currentIndex + 1} / {baseQuestionList.length} 题
          </span>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${((currentIndex + 1) / baseQuestionList.length) * 100}%` }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>
            ✅ 已答 {answeredCount} · 正确 {correctCount}
          </span>
          <button
            onClick={handleShuffleQuestions}
            style={{
              padding: '6px 12px', fontSize: 13, fontWeight: 500,
              background: 'white', color: '#374151',
              border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
            title="打乱题目顺序"
          >
            🔀 题目乱序
          </button>
          <button
            onClick={handleShuffleOptions}
            style={{
              padding: '6px 12px', fontSize: 13, fontWeight: 500,
              background: optionShuffleEnabled ? '#eef2ff' : 'white',
              color: optionShuffleEnabled ? '#4f46e5' : '#374151',
              border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
            title="打乱当前题目选项顺序"
          >
            🎲 选项乱序
          </button>
          <button className="btn-nav" onClick={() => navigate('/questions')}>
            ← 返回题库
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="practice-card">
            <div className="question-number">
              第 {currentIndex + 1} 题 / 共 {baseQuestionList.length} 题
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
              <span className={`tag ${getDifficultyTagClass(currentQuestion.difficulty)}`}>
                {difficultyLabels[currentQuestion.difficulty]} {difficultyText[currentQuestion.difficulty]}
              </span>
              <span className="tag tag-category">
                {categories.find(c => c.id === currentQuestion.category)?.icon} {categories.find(c => c.id === currentQuestion.category)?.name}
              </span>
              {optionShuffleEnabled && (
                <span style={{ fontSize: 11, color: '#8b5cf6', background: '#f3e8ff', padding: '2px 8px', borderRadius: 8 }}>
                  🎲 选项已乱序
                </span>
              )}
            </div>
            <span className="question-type-tag">
              {currentQuestion.type === 'single' ? '单选题' : '多选题'}
            </span>
            <div className="question-text">{currentQuestion.title}</div>

            <div className="options">
              {currentQuestion.options.map((opt, idx) => {
                let optionClass = 'option';
                if (selectedOptions.includes(idx)) optionClass += ' selected';

                if (showResult) {
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
                onClick={handleSubmit}
                disabled={selectedOptions.length === 0 || showResult}
              >
                ✅ 提交答案
              </button>
              <button className="btn-nav" onClick={handlePrev} disabled={currentIndex === 0}>
                ← 上一题
              </button>
              <button className="btn-nav" onClick={handleNext} disabled={currentIndex === baseQuestionList.length - 1}>
                下一题 →
              </button>
            </div>

            {showResult && (
              <div className="explanation animate-fade-up">
                <div style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: isCorrect ? 'var(--success)' : 'var(--error)',
                  marginBottom: 12
                }}>
                  {isCorrect ? '🎉 回答正确！' : '😅 回答错误'}
                </div>
                <div className="explanation-title">📖 答案解析</div>
                <div className="explanation-text">{currentQuestion.explanation}</div>
                <div style={{ marginTop: 12, fontSize: 13, color: 'var(--gray-500)' }}>
                  💡 正确答案：{currentQuestion.type === 'single'
                    ? `${OPTION_LETTERS[currentQuestion.answer]}`
                    : currentQuestion.answer.map(i => OPTION_LETTERS[i]).join('、')}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="answer-sheet" style={{
          width: 180, flexShrink: 0, position: 'sticky', top: 84,
          padding: 12, maxHeight: 'calc(100vh - 100px)', overflowY: 'auto',
        }}>
          <div className="answer-sheet-title" style={{ fontSize: 12, marginBottom: 8 }}>📋 答题卡</div>
          <div className="answer-sheet-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
            {baseQuestionList.map((q, idx) => {
              const ans = answerHistory[q.id];
              let btnClass = 'answer-sheet-btn';
              if (idx === currentIndex) btnClass += ' active';
              else if (ans) btnClass += ans.isCorrect ? ' answered-correct' : ' answered-wrong';
              return (
                <button
                  key={q.id}
                  className={btnClass}
                  onClick={() => setCurrentIndex(idx)}
                  title={`第 ${idx + 1} 题`}
                  style={{ width: 28, height: 28, fontSize: 12 }}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
          <div className="answer-sheet-legend" style={{ fontSize: 11, marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="legend-item">
              <span className="legend-dot" style={{ background: 'var(--primary)' }} /> 当前
            </span>
            <span className="legend-item">
              <span className="legend-dot" style={{ background: 'var(--success)' }} /> 正确
            </span>
            <span className="legend-item">
              <span className="legend-dot" style={{ background: 'var(--error)' }} /> 错误
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
