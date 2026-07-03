import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAllUsers, getAllExamRecords, getExamStatistics, getTotalAnswerCount, getTotalUserCount, checkIsAdmin } from '../lib/supabase';

export default function Admin() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('dashboard');
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  const [users, setUsers] = useState([]);
  const [exams, setExams] = useState([]);
  const [stats, setStats] = useState([]);
  const [totalAnswers, setTotalAnswers] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    checkIsAdmin(user.id).then(admin => {
      setIsAdmin(admin);
      setChecking(false);
      if (!admin) setLoading(false);
    });
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([
      getAllUsers(),
      getAllExamRecords(),
      getExamStatistics(),
      getTotalAnswerCount(),
      getTotalUserCount(),
    ]).then(([u, e, s, ta, tu]) => {
      setUsers(u);
      setExams(e);
      setStats(s);
      setTotalAnswers(ta);
      setTotalUsers(tu);
    }).catch(e => console.error('加载管理数据失败', e))
    .finally(() => setLoading(false));
  }, [isAdmin]);

  if (checking) {
    return (
      <div className="questions-page">
        <div className="empty-state">
          <span className="empty-icon">⏳</span>
          <p className="empty-text">验证权限...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="questions-page">
        <div className="empty-state">
          <span className="empty-icon">🔒</span>
          <p className="empty-text">没有管理员权限</p>
          <p className="empty-desc">请联系管理员开通权限</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}
            style={{ marginTop: 16 }}>
            返回首页
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="questions-page">
        <div className="empty-state">
          <span className="empty-icon">⏳</span>
          <p className="empty-text">加载管理数据...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'dashboard', label: '📊 数据总览' },
    { key: 'users', label: '👥 用户管理' },
    { key: 'exams', label: '📝 考试记录' },
  ];

  const renderDashboard = () => (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-value" style={{ fontSize: 28, color: 'var(--primary)' }}>{totalUsers}</div>
          <div className="stat-card-label">总用户数</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value" style={{ fontSize: 28, color: 'var(--success)' }}>{totalAnswers}</div>
          <div className="stat-card-label">总答题数</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value" style={{ fontSize: 28, color: 'var(--warning)' }}>{stats.length}</div>
          <div className="stat-card-label">参加考试人数</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value" style={{ fontSize: 28, color: 'var(--error)' }}>{exams.length}</div>
          <div className="stat-card-label">考试场次</div>
        </div>
      </div>

      <div className="category-stats">
        <div className="category-stats-title">👥 用户活跃排行</div>
        {users.slice(0, 10).map((u, i) => (
          <div key={u.id} className="category-stat-item">
            <span style={{ width: 28, fontSize: 14, fontWeight: 700, color: i < 3 ? 'var(--warning)' : 'var(--gray-400)' }}>
              {i + 1}
            </span>
            <div className="category-stat-info">
              <div className="category-stat-name">
                {u.nickname || '匿名'}
                <span style={{ fontWeight: 400, color: 'var(--gray-400)', marginLeft: 8, fontSize: 13 }}>
                  {u.total_questions || 0} 题 · {(u.correct_answers || 0)} 正确
                </span>
              </div>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>
              {u.total_questions > 0 ? Math.round((u.correct_answers / u.total_questions) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>

      <div className="category-stats">
        <div className="category-stats-title">📝 最近考试</div>
        {exams.slice(0, 10).map(ex => {
          const d = new Date(ex.completed_at);
          const ds = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
          return (
            <div key={ex.id} className="category-stat-item">
              <div className="category-stat-info">
                <div className="category-stat-name">
                  {ex.category || '全科'}考试 · {ex.total_questions}题
                  <span style={{ fontWeight: 400, color: 'var(--gray-400)', marginLeft: 8, fontSize: 13 }}>{ds}</span>
                </div>
                <div className="category-stat-bar" style={{ height: 6 }}>
                  <div className="category-stat-fill" style={{
                    width: `${ex.score}%`,
                    background: ex.score >= 80 ? 'linear-gradient(90deg, var(--success), #34d399)' : ex.score >= 60 ? 'linear-gradient(90deg, var(--warning), #fbbf24)' : 'linear-gradient(90deg, var(--error), #f87171)',
                  }} />
                </div>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: ex.score >= 80 ? 'var(--success)' : ex.score >= 60 ? 'var(--warning)' : 'var(--error)' }}>
                {ex.score}分
              </span>
            </div>
          );
        })}
        {exams.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 24 }}>暂无考试记录</p>
        )}
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="category-stats">
      <div className="category-stats-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>👥 全部用户（{users.length}人）</span>
      </div>
      {users.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 24 }}>暂无用户</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--gray-200)' }}>
                <th style={{ padding: '10px 8px', textAlign: 'left', color: 'var(--gray-500)', fontWeight: 600 }}>昵称</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--gray-500)', fontWeight: 600 }}>答题数</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--gray-500)', fontWeight: 600 }}>正确</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--gray-500)', fontWeight: 600 }}>正确率</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--gray-500)', fontWeight: 600 }}>连续天数</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--gray-500)', fontWeight: 600 }}>管理员</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                  <td style={{ padding: '10px 8px', fontWeight: 500 }}>{u.nickname || '匿名'}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>{u.total_questions || 0}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--success)' }}>{u.correct_answers || 0}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                    {u.total_questions > 0
                      ? <span style={{ color: Math.round((u.correct_answers / u.total_questions) * 100) >= 70 ? 'var(--success)' : 'var(--error)' }}>
                          {Math.round((u.correct_answers / u.total_questions) * 100)}%
                        </span>
                      : '-'}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>🔥 {u.streak_days || 0}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                    {u.is_admin ? '✅' : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderExams = () => (
    <div className="category-stats">
      <div className="category-stats-title">📝 全部考试记录（{exams.length}场）</div>
      {exams.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 24 }}>暂无考试记录</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--gray-200)' }}>
                <th style={{ padding: '10px 8px', textAlign: 'left', color: 'var(--gray-500)', fontWeight: 600 }}>科目</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--gray-500)', fontWeight: 600 }}>题数</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--gray-500)', fontWeight: 600 }}>正确</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--gray-500)', fontWeight: 600 }}>分数</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--gray-500)', fontWeight: 600 }}>用时</th>
                <th style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--gray-500)', fontWeight: 600 }}>时间</th>
              </tr>
            </thead>
            <tbody>
              {exams.map(ex => {
                const d = new Date(ex.completed_at);
                const ds = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
                const mins = Math.floor((ex.duration_seconds || 0) / 60);
                const secs = (ex.duration_seconds || 0) % 60;
                return (
                  <tr key={ex.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '10px 8px', fontWeight: 500 }}>{ex.category === 'all' ? '全科' : ex.category}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>{ex.total_questions}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--success)' }}>{ex.correct_count}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                      <span style={{
                        fontWeight: 700,
                        color: ex.score >= 80 ? 'var(--success)' : ex.score >= 60 ? 'var(--warning)' : 'var(--error)',
                      }}>{ex.score}分</span>
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--gray-500)' }}>{mins}:{String(secs).padStart(2,'0')}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--gray-500)', fontSize: 13 }}>{ds}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="stats-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">⚙️ 管理后台</h1>
          <p className="page-desc">数据总览、用户管理、考试记录</p>
        </div>
        <span style={{ fontSize: 12, color: 'var(--gray-400)', background: 'var(--gray-100)', padding: '4px 10px', borderRadius: 6 }}>
          👑 管理员: {profile?.nickname || user?.email}
        </span>
      </div>

      <div className="filter-bar">
        {tabs.map(t => (
          <button key={t.key} className={`filter-btn ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && renderDashboard()}
      {tab === 'users' && renderUsers()}
      {tab === 'exams' && renderExams()}
    </div>
  );
}
