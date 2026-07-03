import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { questions, categories, getQuestionsByCategory, difficultyLabels, difficultyText } from '../data/questions';

export default function Questions() {
  const navigate = useNavigate();
  const { categoryId } = useParams();
  const [selectedCategory, setSelectedCategory] = useState(categoryId || 'all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Load saved answers from localStorage
  const [answers, setAnswers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('shuati_answers') || '{}');
    } catch { return {}; }
  });

  useEffect(() => {
    if (categoryId) setSelectedCategory(categoryId);
  }, [categoryId]);

  const filteredQuestions = useMemo(() => {
    let list = getQuestionsByCategory(selectedCategory);
    if (selectedDifficulty !== 'all') {
      list = list.filter(q => q.difficulty === parseInt(selectedDifficulty));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item =>
        item.title.toLowerCase().includes(q) ||
        categories.find(c => c.id === item.category)?.name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [selectedCategory, selectedDifficulty, searchQuery]);

  const getQuestionStatus = (questionId) => {
    const ans = answers[questionId];
    if (!ans) return 'unanswered';
    return ans.isCorrect ? 'correct' : 'wrong';
  };

  const getDifficultyTagClass = (level) => {
    if (level <= 2) return 'tag-difficulty-easy';
    if (level <= 3) return 'tag-difficulty-medium';
    return 'tag-difficulty-hard';
  };

  return (
    <div className="questions-page">
      <div className="page-header">
        <h1 className="page-title">📚 全部题库</h1>
        <p className="page-desc">共 {filteredQuestions.length} 道题目，选择分类开始练习</p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="🔍 搜索题目关键词..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 8,
            border: '1px solid var(--gray-200)',
            fontSize: 15,
            outline: 'none',
            background: 'white',
          }}
        />
      </div>

      {/* Category Filter */}
      <div className="filter-bar">
        <button
          className={`filter-btn ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          全部
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`filter-btn ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* Difficulty Filter */}
      <div className="filter-bar">
        <button
          className={`filter-btn ${selectedDifficulty === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedDifficulty('all')}
        >
          全部难度
        </button>
        {[1, 2, 3, 4, 5].map(level => (
          <button
            key={level}
            className={`filter-btn ${selectedDifficulty === String(level) ? 'active' : ''}`}
            onClick={() => setSelectedDifficulty(String(level))}
          >
            {difficultyLabels[level]} {difficultyText[level]}
          </button>
        ))}
      </div>

      {/* Question List */}
      {filteredQuestions.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🔍</span>
          <p className="empty-text">没有找到匹配的题目</p>
          <p className="empty-desc">尝试调整筛选条件</p>
        </div>
      ) : (
        <div className="question-list">
          {filteredQuestions.map(q => (
            <div
              key={q.id}
              className="question-item"
              onClick={() => navigate(`/practice/${q.id}`)}
            >
              <div className="question-item-left">
                <div className="question-item-title">{q.title.length > 50 ? q.title.slice(0, 50) + '...' : q.title}</div>
                <div className="question-item-tags">
                  <span className={`tag ${getDifficultyTagClass(q.difficulty)}`}>
                    {difficultyLabels[q.difficulty]} {difficultyText[q.difficulty]}
                  </span>
                  <span className="tag tag-category">
                    {categories.find(c => c.id === q.category)?.icon} {categories.find(c => c.id === q.category)?.name}
                  </span>
                  <span className="tag tag-type">
                    {q.type === 'single' ? '单选题' : q.type === 'multiple' ? '多选题' : '判断题'}
                  </span>
                </div>
              </div>
              <div className="question-item-right">
                <div className={`question-item-status status-${getQuestionStatus(q.id)}`}>
                  {getQuestionStatus(q.id) === 'correct' ? '✓' : getQuestionStatus(q.id) === 'wrong' ? '✗' : '?'}
                </div>
                <span style={{ fontSize: 20, color: 'var(--gray-400)' }}>→</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
