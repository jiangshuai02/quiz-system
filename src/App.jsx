import { Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Home from './pages/Home';
import Questions from './pages/Questions';
import Practice from './pages/Practice';
import WrongBook from './pages/WrongBook';
import Stats from './pages/Stats';
import Exam from './pages/Exam';
import Welcome from './pages/Welcome';
import Leaderboard from './pages/Leaderboard';
import Admin from './pages/Admin';
import { useAuth } from './contexts/AuthContext';
import { checkIsAdmin, getSiteSettings } from './lib/supabase';
import './App.css';

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [siteTitle, setSiteTitle] = useState('王大拿刷题宝');
  const [siteFooter, setSiteFooter] = useState('© 2026 王大拿刷题宝 — 面试刷题，轻松拿 Offer 🚀');

  useEffect(() => {
    if (user) checkIsAdmin(user.id).then(setIsAdmin).catch(() => setIsAdmin(false));
    else setIsAdmin(false);
  }, [user]);

  useEffect(() => {
    getSiteSettings().then(s => {
      if (s.site_title) setSiteTitle(s.site_title);
      if (s.site_footer) setSiteFooter(s.site_footer);
    }).catch(() => {});
  }, []);

  useEffect(() => { document.title = siteTitle; }, [siteTitle]);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/' ? 'active' : '';
    return location.pathname.startsWith(path) ? 'active' : '';
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
          <p style={{ color: '#9ca3af' }}>加载中...</p>
        </div>
      </div>
    );
  }

  if (!user && location.pathname !== '/welcome') return <Navigate to="/welcome" replace />;
  if (location.pathname === '/welcome') { if (user) return <Navigate to="/" replace />; return <Welcome />; }

  return (
    <div className="app-layout">
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="navbar-logo" style={{ gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: 22 }}>📚</span>
            <span className="navbar-logo-text" style={{ fontSize: 16 }}>{siteTitle}</span>
          </Link>
          <div className="navbar-links">
            <Link to="/" className={`navbar-link ${isActive('/')}`}>首页</Link>
            <Link to="/questions" className={`navbar-link ${isActive('/questions')}`}>题库</Link>
            <Link to="/exam" className={`navbar-link ${isActive('/exam')}`}>考试</Link>
            <Link to="/leaderboard" className={`navbar-link ${isActive('/leaderboard')}`}>排行</Link>
            <Link to="/wrongbook" className={`navbar-link ${isActive('/wrongbook')}`}>错题</Link>
            <Link to="/stats" className={`navbar-link ${isActive('/stats')}`}>统计</Link>
            {isAdmin && (
              <Link to="/admin" className={`navbar-link ${isActive('/admin')}`}
                style={{ color: '#f59e0b', fontWeight: 600 }}>
                管理
              </Link>
            )}
            <div className="navbar-user">
              <span className="navbar-user-name">
                👤 {profile?.nickname || user?.email?.split('@')[0]}
                {isAdmin && <span className="navbar-user-admin">👑管理</span>}
              </span>
              <button className="navbar-logout" onClick={async () => { try { await signOut(); navigate('/welcome'); } catch {} }}>
                退出
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="app-main" style={{ background: '#f5f5f5', minHeight: 'calc(100vh - 64px)' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/questions" element={<Questions />} />
          <Route path="/questions/:categoryId" element={<Questions />} />
          <Route path="/practice/:questionId" element={<Practice />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/exam" element={<Exam />} />
          <Route path="/wrongbook" element={<WrongBook />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer style={{
        background: 'white', borderTop: '1px solid #e5e7eb',
        padding: '20px 24px', textAlign: 'center',
      }}>
        <p style={{ fontSize: 13, color: '#9ca3af' }}>{siteFooter}</p>
      </footer>
    </div>
  );
}

export default App;
