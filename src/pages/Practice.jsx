import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { questions, categories, difficultyLabels, difficultyText, getQuestionsByCategory } from '../data/questions';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function Practice() {
  const navigate = useNavigate();
  const { questionId } = useParams();

  // Load saved answers
  const [answers, setAnswers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('shuati_answers') || '{}');
    } catch { return {}; }
  });

  // Build question list - either from a category or all
  const [questionList, setQuestionList] = useState(() => {
    if (questionId) {
      return questions;
    }
    return questions;
  });

  const [currentIndex, setCurrentIndex] = useState(() => {
    if (questionId) {
      return questions.findIndex(q => q.id === parseInt(questionId));
    }
    return 0;
  });

  const currentQuestion = questionList[currentIndex];
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // Reset state when question changes
  useEffect(() => {
    setSelectedOptions([]);
    setShowResult(false);
    setIsCorrect(false);
  }, [currentIndex]);

  // If navigating from question list with specific ID
  useEffect(() => {
    if (questionId && currentIndex === -1) {
      const idx = questions.findIndex(q => q.id === parseInt(questionId));
      if (idx !== -1) setCurrentIndex(idx);
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

  const handleSubmit = () => {
    if (selectedOptions.length === 0) return;

    const correct = currentQuestion.type === 'single'
      ? selectedOptions[0] === currentQuestion.answer
      : JSON.stringify([...selectedOptions].sort()) === JSON.stringify([...currentQuestion.answer].sort());

    setIsCorrect(correct);
    setShowResult(true);

    // Save answer
    const newAnswers = {
      ...answers,
      [currentQuestion.id]: {
        selected: selectedOptions,
        isCorrect: correct,
        answer: currentQuestion.answer,
      }
    };
    setAnswers(newAnswers);
    localStorage.setItem('shuati_answers', JSON.stringify(newAnswers));
  };

  const handleNext = () => {
    if (currentIndex < questionList.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const getDifficultyTagClass = (level) => {
    if (level <= 2) return 'tag-difficulty-easy';
    if (level <= 3) return 'tag-difficulty-medium';
    return 'tag-difficulty-hard';
  };

  // If no question found
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

  const hasAnswer = answers[currentQuestion.id];
  const isAnswered = showResult || !!hasAnswer;

  // Calculate completion statistics
  const answeredCount = Object.keys(answers).length;
  const correctCount = Object.values(answers).filter(a => a.isCorrect).length;

  return (
    <div className="practice-page">
      {/* Header */}
      <div className="practice-header">
        <div className="practice-progress">
          <span className="progress-text">
            第 {currentIndex + 1} / {questionList.length} 题
          </span>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${((currentIndex + 1) / questionList.length) * 100}%` }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 14, color: 'var(--gray-500)' }}>
            ✅ 已答 {answeredCount} 题 · 正确 {correctCount} 题
          </span>
          <button className="btn-nav" onClick={() => navigate('/questions')}>
            ← 返回题库
          </button>
        </div>
      </div>

      {/* Answer Sheet */}
      <div className="answer-sheet">
        <div className="answer-sheet-title">📋 答题卡</div>
        <div className="answer-sheet-grid">
          {questionList.map((q, idx) => {
            const ans = answers[q.id];
            let btnClass = 'answer-sheet-btn';
            if (idx === currentIndex) btnClass += ' active';
            else if (ans) btnClass += ans.isCorrect ? ' answered-correct' : ' answered-wrong';
            return (
              <button
                key={q.id}
                className={btnClass}
                onClick={() => setCurrentIndex(idx)}
                title={`第 ${idx + 1} 题`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
        <div className="answer-sheet-legend">
          <span className="legend-item">
            <span className="legend-dot" style={{ background: 'var(--primary)' }} /> 当前
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ background: 'var(--success)' }} /> 已答正确
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ background: 'var(--error)' }} /> 已答错误
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ background: 'var(--gray-200)' }} /> 未答
          </span>
        </div>
      </div>

      {/* Question Card */}
      <div className="practice-card">
        <div className="question-number">
          第 {currentIndex + 1} 题 / 共 {questionList.length} 题
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <span className={`tag ${getDifficultyTagClass(currentQuestion.difficulty)}`}>
            {difficultyLabels[currentQuestion.difficulty]} {difficultyText[currentQuestion.difficulty]}
          </span>
          <span className="tag tag-category">
            {categories.find(c => c.id === currentQuestion.category)?.icon} {categories.find(c => c.id === currentQuestion.category)?.name}
          </span>
        </div>
        <span className="question-type-tag">
          {currentQuestion.type === 'single' ? '单选题' : '多选题'}
        </span>
        <div className="question-text">{currentQuestion.title}</div>

        {/* Options */}
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

        {/* Actions */}
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
          <button className="btn-nav" onClick={handleNext} disabled={currentIndex === questionList.length - 1}>
            下一题 →
          </button>
        </div>

        {/* Explanation */}
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
  );
}
