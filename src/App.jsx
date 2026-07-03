import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Questions from './pages/Questions';
import Practice from './pages/Practice';
import WrongBook from './pages/WrongBook';
import Stats from './pages/Stats';
import Exam from './pages/Exam';
import './App.css';

function App() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path ? 'active' : '';

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
