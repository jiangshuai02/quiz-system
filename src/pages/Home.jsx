import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { categories, questions } from '../data/questions';
import { useAuth } from '../contexts/AuthContext';
import { getWrongAnswers, getFavorites, getExamHistory } from '../lib/supabase';

export default function Home() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [wrongCount, setWrongCount] = useState(0);
  const [favCount, setFavCount] = useState(0);
  const [lastExam, setLastExam] = useState(null);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [streak, setStreak] = useState(0);

  const totalQuestions = questions.length;

  useEffect(() => {
    if (!user) return;
    getWrongAnswers(user.id).then(d => setWrongCount(d.length)).catch(() => {});
    getFavorites(user.id).then(d => setFavCount(d.length)).catch(() => {});
    getExamHistory(user.id, 1).then(d => setLastExam(d[0] || null)).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (profile) {
      setTotalAnswered(profile.total_questions || 0);
      setStreak(profile.streak_days || 0);
      const acc = profile.total_questions > 0
        ? Math.round((profile.correct_answers / profile.total_questions) * 100)
        : 0;
      setAccuracy(acc);
    }
  }, [profile]);

  const statCards = [
    { value: totalAnswered, label: '累计练习', icon: '📝', color: '#6366f1' },
    { value: `${accuracy}%`, label: '答题正确率', icon: '🎯', color: accuracy >= 70 ? '#10b981' : '#f59e0b' },
    { value: lastExam ? `${lastExam.score}分` : '暂无', label: '模拟考试', icon: '📊', color: '#8b5cf6' },
    { value: `🔥${streak}天`, label: '连续学习', icon: '⚡', color: '#f97316' },
  ];

  const quickActions = [
    { icon: '📖', title: '刷题练习', desc: `${totalQuestions} 道精选面试题`, path: '/questions', color: '#6366f1' },
    { icon: '📝', title: '模拟考试', desc: '限时 10 分钟，检验水平', path: '/exam', color: '#8b5cf6' },
    { icon: '📕', title: '错题本', desc: wrongCount > 0 ? `${wrongCount} 道错题待复习` : '暂无错题', path: '/wrongbook', color: '#ef4444' },
    { icon: '🏆', title: '排行榜', desc: '看看你的排名', path: '/leaderboard', color: '#f59e0b' },
  ];

  return (
    <div>
      {/* Gradient Hero Card */}
      <div style={{
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
        margin: '16px 16px 0',
        borderRadius: 16,
        padding: '28px 24px',
        color: 'white',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
              {user ? `👋 ${profile?.nickname || user.email?.split('@')[0]}` : '👋 欢迎回来'}
            </h2>
            <p style={{ fontSize: 14, opacity: 0.85 }}>坚持刷题，轻松拿 Offer 🚀</p>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => navigate('/questions?fav=1')}>
              <div style={{ fontSize: 20 }}>⭐</div>
              <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>{favCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, padding: '16px 16px 0' }}>
        {statCards.map((s, i) => (
          <div key={i} style={{
            background: 'white', borderRadius: 12, padding: '16px 14px',
            border: '1px solid var(--gray-200)',
          }}>
            <div style={{ fontSize: 11, color: 'var(--gray-500)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, padding: 16 }}>
        {quickActions.map((a, i) => (
          <div key={i} style={{
            background: 'white', borderRadius: 12, padding: '20px 16px',
            border: '1px solid var(--gray-200)', cursor: 'pointer',
            transition: 'all 0.2s',
          }}
            onClick={() => navigate(a.path)}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>{a.icon}</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: 'var(--gray-900)' }}>{a.title}</div>
            <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{a.desc}</div>
          </div>
        ))}
      </div>

      {/* Categories */}
      <div style={{ padding: '0 16px' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--gray-800)' }}>
          📚 知识分类
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
          {categories.map(cat => (
            <span key={cat.id} style={{
              padding: '8px 16px', borderRadius: 20,
              background: 'white', border: '1px solid var(--gray-200)',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              color: 'var(--gray-700)',
            }}
              onClick={() => navigate(`/questions/${cat.id}`)}
            >
              {cat.icon} {cat.name}
            </span>
          ))}
        </div>
      </div>

      {/* Additional info */}
      <div style={{ textAlign: 'center', padding: '32px 16px 16px', color: 'var(--gray-400)', fontSize: 13 }}>
        今日已刷 {totalAnswered} 题 · 共 {totalQuestions} 道精选题目
        {!user && (
          <div style={{ marginTop: 12 }}>
            <button className="btn btn-primary" onClick={() => navigate('/auth')}>登录/注册</button>
          </div>
        )}
      </div>
    </div>
  );
}
