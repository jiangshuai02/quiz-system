import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { questions, categories, difficultyLabels, difficultyText, getQuestionsByCategory } from '../data/questions';
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
  const { questionId, categoryId } = useParams();

  // 根据分类过滤题目（如果传了分类ID则只显示该分类的题）
  const filteredQuestions = useMemo(() => {
    if (categoryId) {
      return getQuestionsByCategory(categoryId);
    }
    return getQuestionsByCategory('all'); // 默认「全部」模式（已排除数据库试卷）
  }, [categoryId]);

  const [questionOrder, setQuestionOrder] = useState(() => filteredQuestions.map((_, i) => i));
  const [optionShuffleEnabled, setOptionShuffleEnabled] = useState(false);
  const [autoNextOnCorrect, setAutoNextOnCorrect] = useState(false);
  const [showAnswerSheet, setShowAnswerSheet] = useState(false);

  // 当分类变化时重置题目顺序
  useEffect(() => {
    setQuestionOrder(filteredQuestions.map((_, i) => i));
    setCurrentIndex(0);
  }, [categoryId]);

  const baseQuestionList = useMemo(() => {
    return questionOrder.map(i => filteredQuestions[i]);
  }, [questionOrder, filteredQuestions]);

  const [currentIndex, setCurrentIndex] = useState(() => {
    if (questionId) {
      const idx = filteredQuestions.findIndex(q => q.id === parseInt(questionId));
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
  const autoNextTimer = useRef(null);

  useEffect(() => {
    setSelectedOptions([]);
    setShowResult(false);
    setIsCorrect(false);
    if (autoNextTimer.current) {
      clearTimeout(autoNextTimer.current);
      autoNextTimer.current = null;
    }
  }, [currentIndex]);

  useEffect(() => {
    return () => {
      if (autoNextTimer.current) clearTimeout(autoNextTimer.current);
    };
  }, []);

  const computeResult = (selected) => {
    if (!currentQuestion || selected.length === 0) return null;
    return currentQuestion.type === 'single'
      ? selected[0] === currentQuestion.answer
      : JSON.stringify([...selected].sort()) === JSON.stringify([...currentQuestion.answer].sort());
  };

  const syncToCloud = async (selected, correct) => {
    if (!user) return;
    try {
      await recordAnswer(user.id, currentQuestion.id, correct);
      if (!correct) {
        await addWrongAnswer(user.id, currentQuestion.id, selected.map(i => OPTION_LETTERS[i]).join(','));
      }
      await updateStudyStats(user.id, correct);
    } catch (e) {
      console.error('同步失败', e);
    }
  };

  const goNext = () => {
    if (currentIndex < baseQuestionList.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleOptionClick = (optIndex) => {
    if (showResult) return;
    if (currentQuestion.type === 'single') {
      const sel = [optIndex];
      const correct = computeResult(sel);
      setSelectedOptions(sel);
      setIsCorrect(correct);
      setShowResult(true);
      setAnswerHistory(prev => ({ ...prev, [currentQuestion.id]: { selected: sel, isCorrect: correct } }));
      syncToCloud(sel, correct);
      // 答对且开启了自动跳转
      if (correct && autoNextOnCorrect && currentIndex < baseQuestionList.length - 1) {
        if (autoNextTimer.current) clearTimeout(autoNextTimer.current);
        autoNextTimer.current = setTimeout(() => goNext(), 1200);
      }
    } else {
      setSelectedOptions(prev =>
        prev.includes(optIndex)
          ? prev.filter(i => i !== optIndex)
          : [...prev, optIndex]
      );
    }
  };

  const handleSubmitMultiple = () => {
    if (selectedOptions.length === 0) return;
    const correct = computeResult(selectedOptions);
    setIsCorrect(correct);
    setShowResult(true);
    setAnswerHistory(prev => ({ ...prev, [currentQuestion.id]: { selected: selectedOptions, isCorrect: correct } }));
    syncToCloud(selectedOptions, correct);
    if (correct && autoNextOnCorrect && currentIndex < baseQuestionList.length - 1) {
      if (autoNextTimer.current) clearTimeout(autoNextTimer.current);
      autoNextTimer.current = setTimeout(() => goNext(), 1200);
    }
  };

  const handleNext = () => goNext();
  const handlePrev = () => { if (currentIndex > 0) setCurrentIndex(currentIndex - 1); };

  const handleShuffleQuestions = () => {
    const shuffled = shuffle(questions.map((_, i) => i));
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
          <button className="btn btn-primary" onClick={() => navigate('/questions')} style={{ marginTop: 16 }}>
            返回题库
          </button>
        </div>
      </div>
    );
  }

  const answeredCount = Object.keys(answerHistory).length;
  const correctCount = Object.values(answerHistory).filter(a => a.isCorrect).length;
  const isMultiple = currentQuestion.type === 'multiple';

  // 答题卡内容（复用）
  const answerSheetContent = (
    <>
      <div className="answer-sheet-title" style={{ fontSize: 12, marginBottom: 8, color: '#6b7280', fontWeight: 600 }}>
        📋 答题卡（{answeredCount}/{baseQuestionList.length}）
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
        {baseQuestionList.map((q, idx) => {
          const ans = answerHistory[q.id];
          let btnClass = 'answer-sheet-btn';
          if (idx === currentIndex) btnClass += ' active';
          else if (ans) btnClass += ans.isCorrect ? ' answered-correct' : ' answered-wrong';
          return (
            <button
              key={q.id}
              className={btnClass}
              onClick={() => { setCurrentIndex(idx); setShowAnswerSheet(false); }}
              title={`第 ${idx + 1} 题`}
              style={{ width: 28, height: 28, fontSize: 12, padding: 0 }}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 10, marginTop: 10, display: 'flex', flexDirection: 'column', gap: 3, color: '#9ca3af' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: '#4f46e5' }} /> 当前
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: '#10b981' }} /> 正确
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: '#ef4444' }} /> 错误
        </div>
      </div>
    </>
  );

  return (
    <div className="practice-page" style={{ position: 'relative' }}>
      <div className="practice-header">
        <div className="practice-progress">
          <span className="progress-text">
            第 {currentIndex + 1} / {baseQuestionList.length} 题
          </span>
          <div className="progress-bar">
            <div className="progress-fill"
              style={{ width: `${((currentIndex + 1) / baseQuestionList.length) * 100}%` }} />
          </div>
        </div>
        <div className="practice-header-tools">
          <span className="practice-stat">
            ✅ 已答 {answeredCount} · 正确 {correctCount}
          </span>
          <label className="practice-tool-toggle" title="答对后自动跳转下一题">
            <input type="checkbox" checked={autoNextOnCorrect}
              onChange={e => setAutoNextOnCorrect(e.target.checked)} />
            <span className="practice-tool-toggle-dot" />
            <span className="practice-tool-toggle-label">⚡ 答对自动跳转</span>
          </label>
          <button onClick={handleShuffleQuestions} className="practice-tool-btn">🔀 题目乱序</button>
          <button onClick={handleShuffleOptions}
            className={`practice-tool-btn ${optionShuffleEnabled ? 'active' : ''}`}>🎲 选项乱序</button>
          <button className="btn-nav" onClick={() => navigate('/questions')}>
            ← <span className="hide-mobile">返回</span>
          </button>
        </div>
      </div>

      <div className="practice-body">
        <div className="practice-card">
          <div className="question-number">
            第 {currentIndex + 1} 题 / 共 {baseQuestionList.length} 题
          </div>
          <div className="question-tags-row">
            <span className={`tag ${getDifficultyTagClass(currentQuestion.difficulty)}`}>
              {difficultyLabels[currentQuestion.difficulty]} {difficultyText[currentQuestion.difficulty]}
            </span>
            <span className="tag tag-category">
              {categories.find(c => c.id === currentQuestion.category)?.icon} {categories.find(c => c.id === currentQuestion.category)?.name}
            </span>
            <span className={`practice-mode-tag ${isMultiple ? 'multiple' : 'single'}`}>
              {isMultiple ? '📝 多选题' : '⚡ 单选题'}
            </span>
            {optionShuffleEnabled && (
              <span className="practice-mode-tag shuffle">🎲 选项已乱序</span>
            )}
          </div>
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
                <div key={idx} className={optionClass} onClick={() => handleOptionClick(idx)}>
                  <span className="option-letter">{OPTION_LETTERS[idx]}</span>
                  <span>{opt}</span>
                </div>
              );
            })}
          </div>

          <div className="practice-actions">
            {isMultiple && !showResult && (
              <button
                className="btn-submit"
                onClick={handleSubmitMultiple}
                disabled={selectedOptions.length === 0}
                style={{ background: selectedOptions.length === 0 ? '#cbd5e1' : '#8b5cf6' }}
              >
                ✅ 提交答案（多选）
              </button>
            )}
            <button className="btn-nav" onClick={handlePrev} disabled={currentIndex === 0}>
              ← <span className="hide-mobile">上一题</span>
            </button>
            <button className="btn-nav" onClick={handleNext}
              disabled={currentIndex === baseQuestionList.length - 1}>
              <span className="hide-mobile">下一题</span> →
            </button>
            {/* 手机端显示"答题卡"按钮 */}
            <button className="btn-nav show-mobile-only"
              onClick={() => setShowAnswerSheet(s => !s)}>
              📋 答题卡
            </button>
          </div>

          {showResult && (
            <div className="explanation animate-fade-up">
              <div style={{
                fontSize: 18, fontWeight: 700,
                color: isCorrect ? 'var(--success)' : 'var(--error)',
                marginBottom: 12
              }}>
                {isCorrect ? '🎉 回答正确！' : '😅 回答错误'}
                {isCorrect && autoNextOnCorrect && currentIndex < baseQuestionList.length - 1 && (
                  <span style={{ fontSize: 12, marginLeft: 12, color: '#9ca3af', fontWeight: 400 }}>1.2秒后自动跳转...</span>
                )}
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

        {/* 桌面端答题卡（侧边栏） */}
        <div className="answer-sheet answer-sheet-desktop">
          {answerSheetContent}
        </div>
      </div>

      {/* 手机端答题卡（底部弹出） */}
      {showAnswerSheet && (
        <div className="answer-sheet-mobile-overlay" onClick={() => setShowAnswerSheet(false)}>
          <div className="answer-sheet answer-sheet-mobile" onClick={e => e.stopPropagation()}>
            {answerSheetContent}
          </div>
        </div>
      )}
    </div>
  );
}
