import { useNavigate } from 'react-router-dom';
import { categories, questions } from '../data/questions';

export default function Home() {
  const navigate = useNavigate();
  const totalQuestions = questions.length;

  const features = [
    { icon: '📖', name: '海量题库', desc: `${totalQuestions} 道精选面试题，覆盖前端、React、Vue、算法等核心领域` },
    { icon: '🎯', name: '模拟考试', desc: '模拟真实面试环境，限时答题，检验真实水平' },
    { icon: '📊', name: '学习统计', desc: '可视化学习数据，清晰掌握各知识点掌握情况' },
    { icon: '📝', name: '错题本', desc: '自动记录错题，针对性复习，高效攻克薄弱环节' },
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="hero">
        <h1 className="hero-title animate-fade-up">王大拿刷题宝</h1>
        <p className="hero-subtitle animate-fade-up stagger-1">
          海量前端面试题库，涵盖 JavaScript、React、Vue、算法等核心领域，
          助你高效备战面试，轻松拿 Offer！
        </p>
        <div className="hero-stats animate-fade-up stagger-2">
          <div className="hero-stat">
            <span className="hero-stat-value">{totalQuestions}</span>
            <span className="hero-stat-label">精选题目</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-value">{categories.length}</span>
            <span className="hero-stat-label">知识分类</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-value">100%</span>
            <span className="hero-stat-label">免费刷题</span>
          </div>
        </div>
        <div className="hero-actions animate-fade-up stagger-3">
          <button className="btn btn-primary" onClick={() => navigate('/questions')}>
            🚀 开始刷题
          </button>
          <button className="btn btn-outline" onClick={() => navigate('/exam')}>
            📝 模拟考试
          </button>
        </div>
      </section>

      {/* Categories */}
      <section className="section">
        <h2 className="section-title">🎯 题库分类</h2>
        <p className="section-subtitle">选择分类，开始专项练习</p>
        <div className="category-grid">
          {categories.map((cat, idx) => (
            <div
              key={cat.id}
              className={`category-card animate-fade-up ${idx <= 5 ? `stagger-${idx + 1}` : ''}`}
              onClick={() => navigate(`/questions/${cat.id}`)}
            >
              <span className="category-icon">{cat.icon}</span>
              <h3 className="category-name">{cat.name}</h3>
              <p className="category-desc">{cat.desc}</p>
              <div className="category-meta">
                <span>📄 {cat.count} 题</span>
                <span>•</span>
                <span>💪 专项练习</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="section" style={{ paddingTop: 0 }}>
        <h2 className="section-title">✨ 为什么选择我们</h2>
        <p className="section-subtitle">全方位助力你的面试准备</p>
        <div className="features-grid">
          {features.map((feat, idx) => (
            <div key={idx} className={`feature-card animate-fade-up stagger-${idx + 1}`}>
              <span className="feature-icon">{feat.icon}</span>
              <h3 className="feature-name">{feat.name}</h3>
              <p className="feature-desc">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
