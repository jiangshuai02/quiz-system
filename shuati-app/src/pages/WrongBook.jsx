import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { questions, categories, difficultyLabels, difficultyText } from '../data/questions';
import { useAuth } from '../contexts/AuthContext';
import { getWrongAnswers, removeWrongAnswer } from '../lib/supabase';

export default function WrongBook() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [wrongList, setWrongList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (user) {
      getWrongAnswers(user.id)
        .then(setWrongList)
        .catch(e => console.error('加载错题失败', e))
        .finally(() => setLoading(false));
    }
  }, [user]);

  const wrongQuestions = useMemo(() => {
    const wrongIds = wrongList.map(w => w.question_id);
    let list = questions.filter(q => wrongIds.includes(q.id));
    if (categoryFilter !== 'all') {
      list = list.filter(q => q.category === categoryFilter);
    }
    return list;
  }, [wrongList, categoryFilter]);

  const handleClearAll = async () => {
    if (!user) return;
    if (!confirm(`确定要清空全部 ${wrongList.length} 道错题吗？`)) return;
    try {
      for (const w of wrongList) {
        await removeWrongAnswer(user.id, w.question_id);
      }
      setWrongList([]);
    } catch (e) {
      console.error('清空失败', e);
      alert('清空失败：' + e.message);
    }
    setConfirmClear(false);
  };

  const handleRemoveQuestion = async (questionId) => {
    if (!user) return;
    try {
      await removeWrongAnswer(user.id, questionId);
      setWrongList(prev => prev.filter(w => w.question_id !== questionId));
    } catch (e) {
      console.error('移除失败', e);
    }
  };

  const handleRetryWrong = () => {
    if (wrongQuestions.length === 0) return;
    navigate(`/practice/${wrongQuestions[0].id}`);
  };

  if (loading) {
    return (
      <div className="wrong-book">
        <div className="empty-state">
          <span className="empty-icon">⏳</span>
          <p className="empty-text">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wrong-book">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">📕 错题本</h1>
            <p className="page-desc">
              共 {wrongList.length} 道错题，温故而知新
              <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--success)' }}>
                ☁️ 已云端同步
              </span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {wrongQuestions.length > 0 && (
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
                      onClick={handleClearAll}
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
      {wrongList.length > 0 && (
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
          {wrongQuestions.map(q => {
            const wrongInfo = wrongList.find(w => w.question_id === q.id);
            return (
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
                    {wrongInfo && wrongInfo.wrong_count > 1 && (
                      <span className="tag" style={{ background: 'var(--error-bg)', color: 'var(--error)' }}>
                        错 {wrongInfo.wrong_count} 次
                      </span>
                    )}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
