import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { questions, categories } from '../data/questions';
import { useAuth } from '../contexts/AuthContext';
import { getWrongAnswers, getSiteSettings, getActiveAnnouncements, getFavorites, getExamHistory } from '../lib/supabase';

export default function Home() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [wrongCount, setWrongCount] = useState(0);
  const [favCount, setFavCount] = useState(0);
  const [lastExam, setLastExam] = useState(null);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [streak, setStreak] = useState(0);
  const [announcements, setAnnouncements] = useState([]);
  const [siteTitle, setSiteTitle] = useState('王大拿刷题宝');

  const totalQuestions = questions.length;

  useEffect(() => {
    if (!user) return;
    getWrongAnswers(user.id).then(d => setWrongCount(d.length)).catch(() => {});
    getFavorites(user.id).then(d => setFavCount(d.length)).catch(() => {});
    getExamHistory(user.id, 1).then(d => setLastExam(d[0] || null)).catch(() => {});
    getSiteSettings().then(s => { if (s.site_title) setSiteTitle(s.site_title); }).catch(() => {});
    getActiveAnnouncements().then(setAnnouncements).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (profile) {
      setTotalAnswered(profile.total_questions || 0);
      setStreak(profile.streak_days || 0);
      setAccuracy(profile.total_questions > 0 ? Math.round((profile.correct_answers / profile.total_questions) * 100) : 0);
    }
  }, [profile]);

  const statCards = [
    { value: totalAnswered, label: '累计练习', icon: '📝', color: '#6366f1' },
    { value: `${accuracy}%`, label: '答题正确率', icon: '🎯', color: accuracy >= 70 ? '#10b981' : '#f59e0b' },
    { value: lastExam ? `${lastExam.score}分` : '暂无', label: '最近模拟考', icon: '📊', color: '#8b5cf6' },
    { value: `🔥${streak}天`, label: '连续学习', icon: '⚡', color: '#f97316' },
  ];

  const quickActions = [
    { icon: '📖', title: '刷题练习', desc: `${totalQuestions} 道精选面试题`, path: '/questions', gradient: 'linear-gradient(135deg,#6366f1,#818cf8)' },
    { icon: '📝', title: '模拟考试', desc: '限时 10 分钟', path: '/exam', gradient: 'linear-gradient(135deg,#8b5cf6,#a78bfa)' },
    { icon: '📕', title: '错题本', desc: wrongCount > 0 ? `${wrongCount} 道待复习` : '暂无错题', path: '/wrongbook', gradient: 'linear-gradient(135deg,#ef4444,#f87171)' },
    { icon: '🏆', title: '排行榜', desc: '看看你的排名', path: '/leaderboard', gradient: 'linear-gradient(135deg,#f59e0b,#fbbf24)' },
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Announcements */}
      {announcements.length > 0 && announcements.map(a => (
        <div key={a.id} style={{
          margin: 12, padding: '12px 16px', borderRadius: 12,
          background: a.priority >= 2 ? '#fef2f2' : a.priority >= 1 ? '#fffbeb' : '#eef2ff',
          border: `1px solid ${a.priority >= 2 ? '#fecaca' : a.priority >= 1 ? '#fde68a' : '#c7d2fe'}`,
          fontSize: 14, color: a.priority >= 2 ? '#991b1b' : a.priority >= 1 ? '#92400e' : '#3730a3',
        }}>
          <strong>{a.priority >= 2 ? '🚨' : a.priority >= 1 ? '📢' : '📌'} {a.title}</strong>
          {a.content && <div style={{ marginTop: 4, fontSize: 13, opacity: 0.85, whiteSpace: 'pre-wrap' }}>{a.content}</div>}
        </div>
      ))}

      {/* Gradient Hero Card */}
      <div style={{
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
        margin: 16, borderRadius: 16, padding: '36px 32px', color: 'white',
        boxShadow: '0 10px 25px rgba(99,102,241,0.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>
              {user ? `👋 你好, ${profile?.nickname || user.email?.split('@')[0]}` : '👋 欢迎回来'}
            </h2>
            <p style={{ fontSize: 15, opacity: 0.9, marginBottom: 20 }}>坚持刷题，问题问斩 🚀</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', backdropFilter: 'blur(4px)', fontWeight: 500 }}
                onClick={() => navigate('/questions')}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              >
                ▶ 立即刷题
              </div>
              <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', backdropFilter: 'blur(4px)', fontWeight: 500 }}
                onClick={() => navigate('/exam')}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              >
                🎯 模拟考试
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center', cursor: 'pointer', opacity: 0.9, padding: '8px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.1)' }}
            onClick={() => navigate('/questions?fav=1')}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            <div style={{ fontSize: 30 }}>⭐</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{favCount}</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>我的收藏</div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div style={{ padding: '0 16px' }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14, color: '#111827' }}>
          📈 我的数据
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12, marginBottom: 24 }}>
          {statCards.map((s, i) => (
            <div key={i} style={{
              background: 'white', borderRadius: 12, padding: '20px 18px',
              border: '1px solid #e5e7eb', transition: 'all 0.25s', cursor: 'default',
              display: 'flex', alignItems: 'center', gap: 14,
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: s.color + '20', color: s.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, flexShrink: 0,
              }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ padding: '0 16px 16px' }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14, color: '#111827' }}>
          🚀 快速开始
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {quickActions.map((a, i) => (
            <div key={i} style={{
              background: 'white', borderRadius: 12, padding: '20px 18px',
              border: '1px solid #e5e7eb', cursor: 'pointer',
              transition: 'all 0.25s',
            }}
              onClick={() => navigate(a.path)}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 20px rgba(0,0,0,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 12, background: a.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 14, boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                {a.icon}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: '#111827' }}>{a.title}</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>{a.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div style={{ margin: '0 16px 24px' }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14, color: '#111827' }}>
          🏷️ 按知识点刷题
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {categories.map(cat => (
            <span key={cat.id} style={{
              padding: '10px 20px', borderRadius: 24,
              background: 'white', border: '1px solid #e5e7eb',
              fontSize: 14, fontWeight: 500, cursor: 'pointer',
              color: '#374151', transition: 'all 0.2s',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
              onClick={() => navigate(`/questions/${cat.id}`)}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#4f46e5'; e.currentTarget.style.background = '#eef2ff'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#374151'; e.currentTarget.style.background = 'white'; e.currentTarget.style.transform = 'none'; }}
            >
              {cat.icon} {cat.name}
            </span>
          ))}
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '8px 16px 32px', color: '#9ca3af', fontSize: 13 }}>
        今日已刷 {totalAnswered} 题 · 共 {totalQuestions} 道精选题目 · 加油! 💪
      </div>
    </div>
  );
}
