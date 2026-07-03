import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Welcome() {
  const { signInWithName } = useAuth();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEnter = async () => {
    const v = name.trim();
    if (!v) { setError('请输入你的名字'); return; }
    if (v.length > 20) { setError('名字不能超过 20 个字'); return; }
    setLoading(true);
    setError('');
    try {
      await signInWithName(v);
      // 不需要 navigate，user 状态变化后弹窗自动隐藏
    } catch (e) {
      setError(e.message || '进入失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="welcome-overlay" onClick={(e) => {
      // 点击背景不关闭（强制输入名字）
    }}>
      <div className="welcome-card" onClick={e => e.stopPropagation()}>
        <div className="welcome-logo">📚</div>
        <h1 className="welcome-title">智能刷题系统</h1>
        <p className="welcome-subtitle">请输入你的名字开始刷题</p>

        <div className="welcome-input-wrap">
          <input
            type="text"
            className="welcome-input"
            placeholder="输入你的名字，如：张三"
            value={name}
            onChange={e => { setName(e.target.value); setError(''); }}
            onKeyDown={e => { if (e.key === 'Enter') handleEnter(); }}
            maxLength={20}
            autoFocus
          />
        </div>

        {error && <div className="welcome-error">{error}</div>}

        <button className="welcome-btn" onClick={handleEnter} disabled={loading || !name.trim()}>
          {loading ? '进入中...' : '🚀 开始刷题'}
        </button>

        <p className="welcome-hint">
          你的刷题记录会跟着这个名字保存
        </p>
      </div>
    </div>
  );
}
