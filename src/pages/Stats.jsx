import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { questions, categories, getQuestionsByCategory } from '../data/questions';

export default function Stats() {
  const navigate = useNavigate();
  const [answers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('shuati_answers') || '{}');
    } catch { return {}; }
  });

  const stats = useMemo(() => {
    const total = questions.length;
    const answered = Object.keys(answers).length;
    const correct = Object.values(answers).filter(a => a.isCorrect).length;
    const wrong = answered - correct;
    const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;

    // Per-category stats
    const categoryStats = categories.map(cat => {
      const catQuestions = getQuestionsByCategory(cat.id);
      const catTotal = catQuestions.length;
      let catAnswered = 0;
      let catCorrect = 0;

      catQuestions.forEach(q => {
        const ans = answers[q.id];
        if (ans) {
          catAnswered++;
          if (ans.isCorrect) catCorrect++;
        }
      });

      return {
        ...cat,
        total: catTotal,
        answered: catAnswered,
        correct: catCorrect,
        accuracy: catAnswered > 0 ? Math.round((catCorrect / catAnswered) * 100) : 0,
      };
    });

    return { total, answered, correct, wrong, accuracy, categoryStats };
  }, [answers]);

  return (
    <div className="stats-page">
      <div className="page-header">
        <h1 className="page-title">📊 学习统计</h1>
        <p className="page-desc">清晰掌握你的学习进度和薄弱环节</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-value">{stats.total}</div>
          <div className="stat-card-label">总题目数</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value" style={{ color: 'var(--success)' }}>{stats.answered}</div>
          <div className="stat-card-label">已答题数</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value" style={{ color: 'var(--primary)' }}>{stats.correct}</div>
          <div className="stat-card-label">正确数</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value" style={{ color: stats.accuracy >= 70 ? 'var(--success)' : 'var(--error)' }}>
            {stats.accuracy}%
          </div>
          <div className="stat-card-label">正确率</div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="category-stats">
        <div className="category-stats-title">📈 总体进度</div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 14, color: 'var(--gray-600)' }}>刷题进度</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              {stats.answered} / {stats.total}
            </span>
          </div>
          <div className="category-stat-bar" style={{ height: 12 }}>
            <div
              className="category-stat-fill"
              style={{ width: `${(stats.answered / stats.total) * 100}%` }}
            />
          </div>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 14, color: 'var(--gray-600)' }}>正确率</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: stats.accuracy >= 70 ? 'var(--success)' : 'var(--error)' }}>
              {stats.accuracy}%
            </span>
          </div>
          <div className="category-stat-bar" style={{ height: 12 }}>
            <div
              className="category-stat-fill"
              style={{
                width: `${stats.accuracy}%`,
                background: stats.accuracy >= 70
                  ? 'linear-gradient(90deg, var(--success), #34d399)'
                  : 'linear-gradient(90deg, var(--error), var(--warning))'
              }}
            />
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="category-stats">
        <div className="category-stats-title">📚 分类掌握度</div>
        {stats.categoryStats.map(cat => (
          <div key={cat.id} className="category-stat-item">
            <span className="category-stat-icon">{cat.icon}</span>
            <div className="category-stat-info">
              <div className="category-stat-name">
                {cat.name}
                <span style={{ fontWeight: 400, color: 'var(--gray-400)', marginLeft: 8, fontSize: 13 }}>
                  {cat.answered}/{cat.total} 题
                </span>
              </div>
              <div className="category-stat-bar">
                <div
                  className="category-stat-fill"
                  style={{
                    width: `${cat.accuracy}%`,
                    background: cat.accuracy >= 70
                      ? 'linear-gradient(90deg, var(--success), #34d399)'
                      : cat.accuracy >= 40
                        ? 'linear-gradient(90deg, var(--warning), #fbbf24)'
                        : 'linear-gradient(90deg, var(--error), #f87171)'
                  }}
                />
              </div>
            </div>
            <span className="category-stat-pct">{cat.accuracy}%</span>
          </div>
        ))}
      </div>

      {/* Action */}
      {stats.answered === 0 ? (
        <div className="empty-state" style={{ padding: '40px 24px' }}>
          <span className="empty-icon">📝</span>
          <p className="empty-text">还没有开始刷题</p>
          <p className="empty-desc">开始练习后，学习数据将在这里展示</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/questions')}>
            开始刷题
          </button>
        </div>
      ) : (
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button className="btn btn-primary" onClick={() => navigate('/wrongbook')}>
            📕 查看错题本
          </button>
        </div>
      )}
    </div>
  );
}
