import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getLeaderboard } from '../lib/supabase';

export default function Leaderboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('total');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getLeaderboard(tab)
      .then(setData)
      .catch(e => console.error('加载排行榜失败', e))
      .finally(() => setLoading(false));
  }, [tab]);

  const tabs = [
    { key: 'total', label: '🏆 总榜' },
    { key: 'weekly', label: '⭐ 周榜' },
    { key: 'monthly', label: '🏅 月榜' },
  ];

  const getRankIcon = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  const getScoreLabel = () => {
    if (tab === 'weekly') return '周积分';
    if (tab === 'monthly') return '月积分';
    return '总积分';
  };

  return (
    <div className="questions-page" style={{ maxWidth: 800 }}>
      <div className="page-header">
        <h1 className="page-title">🏆 排行榜</h1>
        <p className="page-desc">看看你在所有刷题者中的排名</p>
      </div>

      <div className="filter-bar">
        {tabs.map(t => (
          <button key={t.key} className={`filter-btn ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty-state">
          <span className="empty-icon">⏳</span>
          <p className="empty-text">加载中...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📊</span>
          <p className="empty-text">还没有数据</p>
          <p className="empty-desc">开始刷题后，你的排名会显示在这里</p>
          <button className="btn btn-primary" onClick={() => navigate('/questions')}
            style={{ marginTop: 16 }}>
            开始刷题
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.map((item, index) => {
            const isMe = user && item.user_id === user.id;
            const score = tab === 'total' ? item.total_score : (tab === 'weekly' ? item.weekly_score : item.monthly_score);

            return (
              <div key={item.user_id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 20px',
                background: isMe ? 'var(--primary-bg)' : 'white',
                borderRadius: 12,
                border: isMe ? '2px solid var(--primary)' : '1px solid var(--gray-200)',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: index < 3 ? 22 : 14, fontWeight: 700,
                  background: index < 3 ? 'var(--warning-bg)' : 'var(--gray-100)',
                  color: index < 3 ? 'var(--warning)' : 'var(--gray-600)',
                }}>
                  {getRankIcon(index)}
                </div>

                <div style={{ width: 40, height: 40, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary), #7c3aed)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, color: 'white', flexShrink: 0 }}>
                  {item.nickname?.[0]?.toUpperCase() || '?'}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--gray-900)' }}>
                    {item.nickname || '匿名用户'}
                    {isMe && <span style={{ marginLeft: 8, fontSize: 11, background: 'var(--primary)', color: 'white', padding: '2px 8px', borderRadius: 10 }}>我</span>}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>
                    {item.total_answered || 0} 题 · 正确率 {item.accuracy || 0}% · 活跃 {item.active_days || 0} 天
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>{score || 0}</div>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{getScoreLabel()}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {data.length > 0 && (
        <div style={{ marginTop: 20, padding: 16, background: 'var(--gray-50)', borderRadius: 12, fontSize: 13, color: 'var(--gray-500)', textAlign: 'center' }}>
          💡 积分规则：每题正确 +10分，每题答题 +2分，每天活跃 +5分。排行榜每日更新。
        </div>
      )}
    </div>
  );
}
