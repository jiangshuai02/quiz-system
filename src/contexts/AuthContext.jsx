import { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../lib/supabase';

const AuthContext = createContext({});
const STORAGE_KEY = 'shuati_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved && saved.id) {
            setUser({ id: saved.id, nickname: saved.nickname, _local: true });
            await loadAndUpdateProfile(saved.id, saved.nickname);
            return;
          }
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  // 加载 profile + 更新最后登录时间
  async function loadAndUpdateProfile(userId, nickname) {
    try {
      let list = await apiFetch(`/rest/v1/profiles?id=eq.${userId}&select=*`);
      const isJ = nickname === 'jiangshuai';
      const today = new Date().toISOString().slice(0, 10);

      if (Array.isArray(list) && list.length > 0) {
        const cur = list[0];
        // 更新最后登录（用 last_study_date 字段记录今天日期）
        await apiFetch(`/rest/v1/profiles?id=eq.${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
          body: JSON.stringify({
            last_study_date: today,
            updated_at: new Date().toISOString(),
            // 自动给 jiangshuai 设管理员
            ...(isJ && !cur.is_admin ? { is_admin: true } : {}),
          }),
        });
        setProfile({ ...cur, last_study_date: today, is_admin: isJ || cur.is_admin });
      } else {
        // 创建新 profile
        const created = await apiFetch('/rest/v1/profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
          body: JSON.stringify({
            id: userId,
            nickname,
            last_study_date: today,
            total_questions: 0, correct_answers: 0, wrong_answers: 0, streak_days: 0,
            is_admin: isJ,
          }),
        });
        if (Array.isArray(created) && created.length > 0) setProfile(created[0]);
      }
    } catch (e) { console.error('loadProfile:', e); }
    finally { setLoading(false); }
  }

  const signInWithName = async (nickname) => {
    const name = (nickname || '').trim();
    if (!name) throw new Error('请输入名字');
    if (name.length > 20) throw new Error('名字不能超过 20 个字');

    // 强制用名字生成稳定 userId（同一名字=同一账号）
    const userId = nameToId(name);

    const u = { id: userId, nickname: name, _local: true };
    setUser(u);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      id: userId, nickname: name, savedAt: Date.now(),
    }));
    await loadAndUpdateProfile(userId, name);
    return u;
  };

  const signOut = () => {
    setUser(null);
    setProfile(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const value = {
    user, profile, loading,
    signInWithName, signOut,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(16);
}

// 生成合法 UUID v4 格式 (8-4-4-4-12)
function nameToId(name) {
  if (name === 'jiangshuai') return '149c950b-be93-475c-bcc4-a8addfce5095';
  const h1 = simpleHash(name).padStart(8, '0');
  const h2 = simpleHash(name + 'a').padStart(4, '0');
  const h3 = simpleHash(name + 'b').padStart(4, '0');
  const h4 = simpleHash(name + 'c').padStart(4, '0');
  const h5 = simpleHash(name + 'd').padStart(12, '0');
  // UUID v4: 第3段首位4, 第4段首位8-b
  return `${h1}-${h2}-4${h3.slice(1, 3)}-${(8 + (parseInt(h4[0], 16) % 4)).toString(16)}${h4.slice(1, 4)}-${h5}`;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
