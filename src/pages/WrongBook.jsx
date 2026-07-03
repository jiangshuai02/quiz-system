import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { questions, categories, difficultyLabels, difficultyText } from '../data/questions';

export default function WrongBook() {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('shuati_answers') || '{}');
    } catch { return {}; }
  });

  const [categoryFilter, setCategoryFilter] = useState('all');
  const [confirmClear, setConfirmClear] = useState(false);

  const wrongQuestions = useMemo(() => {
    const wrongIds = Object.entries(answers)
      .filter(([, ans]) => !ans.isCorrect)
      .map(([id]) => parseInt(id));

    let list = questions.filter(q => wrongIds.includes(q.id));
    if (categoryFilter !== 'all') {
      list = list.filter(q => q.category === categoryFilter);
    }
    return list;
  }, [answers, categoryFilter]);

  const handleClearWrongBook = () => {
    const newAnswers = {};
    Object.entries(answers).forEach(([id, ans]) => {
      if (ans.isCorrect) {
        newAnswers[id] = ans;
      }
    });
    setAnswers(newAnswers);
    localStorage.setItem('shuati_answers', JSON.stringify(newAnswers));
    setConfirmClear(false);
  };

  const handleRemoveQuestion = (questionId) => {
    const newAnswers = { ...answers };
    delete newAnswers[questionId];
    setAnswers(newAnswers);
    localStorage.setItem('shuati_answers', JSON.stringify(newAnswers));
  };

  const handleRetryWrong = () => {
    const wrongIds = Object.entries(answers)
      .filter(([, ans]) => !ans.isCorrect)
      .map(([id]) => parseInt(id));

    if (wrongIds.length === 0) return;
    const wrongQuestionsList = questions.filter(q => wrongIds.includes(q.id));
    if (wrongQuestionsList.length > 0) {
      navigate(`/practice/${wrongQuestionsList[0].id}`);
    }
  };

  const totalWrong = Object.values(answers).filter(a => !a.isCorrect).length;

  return (
    <div className="wrong-book">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">📕 错题本</h1>
            <p className="page-desc">
              共 {totalWrong} 道错题，温故而知新
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {totalWrong > 0 && (
              <>
                <button className="btn btn-primary" onClick={handleRetryWrong}>
                  🔄 重做全部错题
                </button>
                {!confirmClear ? (
                  <button
                    className="btn btn-outline"
                    style={{ border: '1px solid var(--error)', color: 'var(--error)' }}
                    onClick={() => setConfirmClear(true)}
                  >
                    🗑️ 清空错题
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 14, color: 'var(--error)' }}>确认清空？</span>
                    <button
                      className="btn btn-primary"
                      style={{ background: 'var(--error)' }}
                      onClick={handleClearWrongBook}
                    >
                      确认
                    </button>
                    <button className="btn-nav" onClick={() => setConfirmClear(false)}>
                      取消
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Category filter */}
      {totalWrong > 0 && (
        <div className="filter-bar">
          <button
            className={`filter-btn ${categoryFilter === 'all' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('all')}
          >
            全部
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`filter-btn ${categoryFilter === cat.id ? 'active' : ''}`}
              onClick={() => setCategoryFilter(cat.id)}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Wrong Questions List */}
      {wrongQuestions.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🎉</span>
          <p className="empty-text">太棒了，没有错题！</p>
          <p className="empty-desc">所有题目你都已经答对了，继续加油！</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/questions')}>
            继续刷题
          </button>
        </div>
      ) : (
        <div className="question-list">
          {wrongQuestions.map(q => (
            <div
              key={q.id}
              className="question-item"
              onClick={() => navigate(`/practice/${q.id}`)}
            >
              <div className="question-item-left">
                <div className="question-item-title" style={{ color: 'var(--error)' }}>
                  ✗ {q.title.length > 40 ? q.title.slice(0, 40) + '...' : q.title}
                </div>
                <div className="question-item-tags">
                  <span className={`tag tag-difficulty-medium`}>
                    {difficultyLabels[q.difficulty]} {difficultyText[q.difficulty]}
                  </span>
                  <span className="tag tag-category">
                    {categories.find(c => c.id === q.category)?.icon} {categories.find(c => c.id === q.category)?.name}
                  </span>
                </div>
              </div>
              <div className="question-item-right">
                <button
                  className="btn-nav"
                  style={{ padding: '4px 12px', fontSize: 12 }}
                  onClick={(e) => { e.stopPropagation(); handleRemoveQuestion(q.id); }}
                >
                  移除
                </button>
                <span style={{ fontSize: 20, color: 'var(--gray-400)' }}>→</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
