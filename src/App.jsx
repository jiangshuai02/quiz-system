import { Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Questions from './pages/Questions';
import Practice from './pages/Practice';
import WrongBook from './pages/WrongBook';
import Stats from './pages/Stats';
import Exam from './pages/Exam';
import Auth from './pages/Auth';
import { useAuth } from './contexts/AuthContext';
import './App.css';

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, loading } = useAuth();

  const isActive = (path) => location.pathname === path ? 'active' : '';

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (e) {
      console.error('退出失败', e);
    }
  };

  // 加载中显示占位
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--gray-50)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
          <p style={{ color: 'var(--gray-500)' }}>加载中...</p>
        </div>
      </div>
    );
  }

  // 未登录跳转到登录页（Auth 页面独立显示，不显示 navbar）
  if (!user && location.pathname !== '/auth') {
    return <Navigate to="/auth" replace />;
  }

  // 登录页（独立布局）
  if (location.pathname === '/auth') {
    if (user) return <Navigate to="/" replace />;
    return <Auth />;
  }

  return (
    <div className="app-layout">
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="navbar-logo">
            <span className="navbar-logo-icon">📚</span>
            <span>王大拿刷题宝</span>
          </Link>
          <div className="navbar-links">
            <Link to="/" className={`navbar-link ${isActive('/')}`}>首页</Link>
            <Link to="/questions" className={`navbar-link ${isActive('/questions')}`}>全部题库</Link>
            <Link to="/exam" className={`navbar-link ${isActive('/exam')}`}>模拟考试</Link>
            <Link to="/wrongbook" className={`navbar-link ${isActive('/wrongbook')}`}>错题本</Link>
            <Link to="/stats" className={`navbar-link ${isActive('/stats')}`}>学习统计</Link>
            <div style={{
              marginLeft: 12,
              paddingLeft: 12,
              borderLeft: '1px solid var(--gray-200)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span style={{ fontSize: 13, color: 'var(--gray-600)' }}>
                👤 {profile?.nickname || user?.email?.split('@')[0]}
              </span>
              <button
                onClick={handleSignOut}
                style={{
                  padding: '6px 12px',
                  background: 'transparent',
                  color: 'var(--gray-600)',
                  border: '1px solid var(--gray-200)',
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
                title="退出登录"
              >
                退出
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/questions" element={<Questions />} />
          <Route path="/questions/:categoryId" element={<Questions />} />
          <Route path="/practice/:questionId" element={<Practice />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/exam" element={<Exam />} />
          <Route path="/wrongbook" element={<WrongBook />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="footer">
        <p className="footer-text">© 2026 王大拿刷题宝 — 面试刷题，轻松拿 Offer 🚀</p>
      </footer>
    </div>
  );
}

export default App;
