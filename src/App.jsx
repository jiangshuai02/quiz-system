import { Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Home from './pages/Home';
import Questions from './pages/Questions';
import Practice from './pages/Practice';
import WrongBook from './pages/WrongBook';
import Stats from './pages/Stats';
import Exam from './pages/Exam';
import Auth from './pages/Auth';
import Leaderboard from './pages/Leaderboard';
import Admin from './pages/Admin';
import { useAuth } from './contexts/AuthContext';
import { checkIsAdmin } from './lib/supabase';
import './App.css';

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) checkIsAdmin(user.id).then(setIsAdmin).catch(() => setIsAdmin(false));
    else setIsAdmin(false);
  }, [user]);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/' ? 'active' : '';
    return location.pathname.startsWith(path) ? 'active' : '';
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (e) {
      console.error('退出失败', e);
    }
  };

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

  if (!user && location.pathname !== '/auth') {
    return <Navigate to="/auth" replace />;
  }

  if (location.pathname === '/auth') {
    if (user) return <Navigate to="/" replace />;
    return <Auth />;
  }

  return (
    <div className="app-layout">
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="navbar-logo" style={{ gap: 6 }}>
            <span style={{ fontSize: 22 }}>📚</span>
            <span style={{ fontSize: 16 }}>刷题宝</span>
          </Link>
          <div className="navbar-links" style={{ gap: 2 }}>
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
            <div style={{
              marginLeft: 8, paddingLeft: 8,
              borderLeft: '1px solid var(--gray-200)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ fontSize: 13, color: 'var(--gray-600)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                👤 {profile?.nickname || user?.email?.split('@')[0]}
              </span>
              <button
                onClick={handleSignOut}
                style={{
                  padding: '4px 10px', background: 'transparent',
                  color: 'var(--gray-500)', border: '1px solid var(--gray-200)',
                  borderRadius: 6, fontSize: 11, cursor: 'pointer',
                }}
              >
                退出
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="app-main" style={{ background: '#f5f5f5' }}>
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
    </div>
  );
}

export default App;
