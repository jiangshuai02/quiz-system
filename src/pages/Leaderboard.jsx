import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getLeaderboard, getAllUsers, getExamStatistics } from '../lib/supabase';

export default function Leaderboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('total');
  const [data, setData] = useState([]);
  const [users, setUsers] = useState([]);
  const [examStats, setExamStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [lb, us, es] = await Promise.all([
        getLeaderboard(tab).catch(() => []),
        getAllUsers().catch(() => []),
        getExamStatistics().catch(() => []),
      ]);
      setData(lb || []);
      setUsers(us || []);
      setExamStats(es || []);

      if (user) {
        const idx = (lb || []).findIndex(u => u.user_id === user.id);
        setMyRank(idx >= 0 ? idx + 1 : null);
      }
    } catch (e) {
      console.error('loadData', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [tab, user]);

  const tabs = [
    { key: 'total', label: '🏆 做题榜', desc: '按积分排名' },
    { key: 'weekly', label: '📈 正确率榜', desc: '按正确率排名' },
    { key: 'monthly', label: '🔥 活跃榜', desc: '按活跃天数' },
  ];

  // 排序：按 tab 切换排序规则
  const sortedData = useMemo(() => {
    const arr = [...data];
    if (tab === 'weekly') {
      arr.sort((a, b) => b.accuracy - a.accuracy);
    } else if (tab === 'monthly') {
      arr.sort((a, b) => b.active_days - a.active_days);
    } else {
      arr.sort((a, b) => b.total_score - a.total_score);
    }
    return arr;
  }, [data, tab]);

  const getRankStyle = (idx) => {
    if (idx === 0) return { bg: 'linear-gradient(135deg, #fef3c7, #fcd34d)', border: '#f59e0b', icon: '👑', textColor: '#92400e' };
    if (idx === 1) return { bg: 'linear-gradient(135deg, #e0e7ff, #a5b4fc)', border: '#6366f1', icon: '🥈', textColor: '#312e81' };
    if (idx === 2) return { bg: 'linear-gradient(135deg, #fed7aa, #fb923c)', border: '#f97316', icon: '🥉', textColor: '#7c2d12' };
    return { bg: 'white', border: '#e5e7eb', icon: null, textColor: '#111827' };
  };

  const getPrimaryValue = (item) => {
    if (tab === 'weekly') return `${item.accuracy}%`;
    if (tab === 'monthly') return `${item.active_days}天`;
    return `${item.total_score}分`;
  };

  const getSecondaryValue = (item) => {
    if (tab === 'weekly') return `共刷 ${item.total_answered || 0} 题`;
    if (tab === 'monthly') return `共刷 ${item.total_answered || 0} 题`;
    return `共 ${item.total_answered || 0} 题`;
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 16px' }}>
      {/* Hero Header */}
      <div style={{
        background: tab === 'weekly' ? 'linear-gradient(135deg, #10b981 0%, #14b8a6 50%, #06b6d4 100%)'
          : tab === 'monthly' ? 'linear-gradient(135deg, #f97316 0%, #fb923c 50%, #f59e0b 100%)'
          : 'linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)',
        borderRadius: 16, padding: '24px 28px', color: 'white', marginBottom: 20,
        boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 32 }}>{tab === 'weekly' ? '📈' : tab === 'monthly' ? '🔥' : '🏆'}</span>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>
              {tab === 'weekly' ? '正确率榜' : tab === 'monthly' ? '活跃榜' : '做题榜'}
            </h1>
            <p style={{ fontSize: 14, opacity: 0.9, marginTop: 2 }}>{tabs.find(t => t.key === tab)?.desc}</p>
          </div>
        </div>
        <p style={{ fontSize: 13, opacity: 0.85, marginTop: 12 }}>
          和大家一起来一场刷题之旅吧 🚀
        </p>
      </div>

      {/* Layout: Main + Sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
        {/* Main Content */}
        <div>
          {/* Tabs */}
          <div style={{
            display: 'flex', background: 'white', borderRadius: 12, padding: 4,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 16,
          }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                flex: 1, padding: '12px 16px', border: 'none',
                background: tab === t.key ? '#111827' : 'transparent',
                color: tab === t.key ? 'white' : '#6b7280',
                borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s',
              }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Ranking List */}
          {loading ? (
            <div style={{ background: 'white', borderRadius: 12, padding: 40, textAlign: 'center', color: '#9ca3af' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
              <p>加载中...</p>
            </div>
          ) : sortedData.length === 0 ? (
            <div style={{ background: 'white', borderRadius: 12, padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🏆</div>
              <p style={{ color: '#374151', fontSize: 16, fontWeight: 600, marginBottom: 8 }}>你当前还没进入榜单</p>
              <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 20 }}>赶紧去刷题练习刷上来吧！</p>
              <button onClick={() => navigate('/questions')} style={{
                padding: '10px 24px', background: '#3b82f6', color: 'white', border: 'none',
                borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>🎯 立即前往练习</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sortedData.map((item, idx) => {
                const style = getRankStyle(idx);
                const isMe = user && item.user_id === user.id;
                const initial = (item.nickname || '?')[0]?.toUpperCase() || '?';
                return (
                  <div key={item.user_id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 18px', background: isMe ? '#eef2ff' : style.bg,
                    borderRadius: 12,
                    border: `2px solid ${isMe ? '#4f46e5' : (idx < 3 ? style.border : 'transparent')}`,
                    cursor: 'pointer', transition: 'transform 0.2s',
                    boxShadow: idx < 3 ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
                  }}
                    onClick={() => {}}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                  >
                    {/* Rank */}
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: idx < 3 ? 18 : 14,
                      background: idx < 3 ? style.border : '#f3f4f6',
                      color: idx < 3 ? 'white' : '#6b7280',
                      flexShrink: 0,
                    }}>
                      {style.icon || `#${idx + 1}`}
                    </div>

                    {/* Avatar */}
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: idx === 0 ? 'linear-gradient(135deg, #f59e0b, #ef4444)' :
                        idx === 1 ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' :
                        idx === 2 ? 'linear-gradient(135deg, #f97316, #f59e0b)' :
                        'linear-gradient(135deg, #6b7280, #374151)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: 700, fontSize: 18, flexShrink: 0,
                    }}>
                      {initial}
                    </div>

                    {/* Name + Stats */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: style.textColor, marginBottom: 2 }}>
                        {item.nickname || '匿名用户'}
                        {item.is_admin && <span style={{ marginLeft: 6, fontSize: 10, background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: 'white', padding: '1px 6px', borderRadius: 8, fontWeight: 600 }}>👑管理</span>}
                        {isMe && <span style={{ marginLeft: 6, fontSize: 10, background: '#4f46e5', color: 'white', padding: '1px 6px', borderRadius: 8, fontWeight: 600 }}>我</span>}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{getSecondaryValue(item)}</div>
                    </div>

                    {/* Score */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: idx < 3 ? style.border : '#111827', lineHeight: 1 }}>
                        {getPrimaryValue(item)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* My Rank Card */}
          <div style={{
            background: 'white', borderRadius: 12, padding: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: '#111827' }}>
              📌 我的排名
            </h3>
            {myRank ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 48, fontWeight: 800, color: '#4f46e5' }}>#{myRank}</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                  {profile?.nickname || '我'} 的当前排名
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
                  共 {sortedData.length} 名用户
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#9ca3af' }}>
                <div style={{ fontSize: 14 }}>还未上榜</div>
                <p style={{ fontSize: 12, marginTop: 4 }}>快去刷题练习吧！</p>
              </div>
            )}
          </div>

          {/* Recent Active Users */}
          <div style={{
            background: 'white', borderRadius: 12, padding: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: '#111827' }}>
              🏆 总积分 Top
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {users.slice(0, 5).map((u, i) => {
                const isMe = user && u.id === user.id;
                return (
                  <div key={u.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                    background: isMe ? '#eef2ff' : 'transparent', borderRadius: 6,
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: i < 3 ? '#f59e0b' : '#9ca3af', width: 18 }}>#{i + 1}</span>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      color: 'white', fontSize: 12, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {(u.nickname || '?')[0]?.toUpperCase()}
                    </div>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.nickname || '匿名'}
                    </span>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{u.total_questions || 0}题</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Exams */}
          {examStats.length > 0 && (
            <div style={{
              background: 'white', borderRadius: 12, padding: 20,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: '#111827' }}>
                📊 考试达人
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {examStats.slice(0, 5).map((e, i) => (
                  <div key={e.user_id} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: i < 3 ? '#f59e0b' : '#9ca3af', width: 18 }}>#{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 13, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.nickname || '匿名'}
                    </span>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>均分 {e.avg_score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
