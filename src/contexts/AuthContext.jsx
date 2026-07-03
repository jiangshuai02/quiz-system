import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, apiFetch } from '../lib/supabase';

const AuthContext = createContext({});
const STORAGE_KEY = 'shuati_user';

// 根据名字生成确定的邮箱和密码（同一名字永远是同一个账号）
function nameToEmail(name) {
  if (name === 'jiangshuai') return 'jiangshuai@shuati.app';
  return `${simpleHash(name).slice(0, 10)}@shuati.local`;
}
function nameToPassword(name) {
  if (name === 'jiangshuai') return '17539363075';
  return 'shuati_' + simpleHash(name).slice(0, 10);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // 启动：从 localStorage 恢复会话
  useEffect(() => {
    (async () => {
      try {
        // 检查 Supabase 会话
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          loadProfile(session.user.id, session.user.user_metadata?.full_name);
          return;
        }
      } catch {}
      // fallback: localStorage
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved && saved.id) {
            setUser({ id: saved.id, email: saved.email, _local: true });
            loadProfile(saved.id, saved.nickname);
            return;
          }
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  async function loadProfile(userId, fallbackNickname = '') {
    try {
      const list = await apiFetch(`/rest/v1/profiles?id=eq.${userId}&select=*`);
      const isJ = fallbackNickname === 'jiangshuai';
      if (Array.isArray(list) && list.length > 0) {
        const cur = list[0];
        if (isJ && !cur.is_admin) {
          const updated = await apiFetch(`/rest/v1/profiles?id=eq.${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
            body: JSON.stringify({ is_admin: true }),
          });
          setProfile(Array.isArray(updated) && updated.length > 0 ? updated[0] : { ...cur, is_admin: true });
        } else {
          setProfile(cur);
        }
      } else {
        const created = await apiFetch('/rest/v1/profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
          body: JSON.stringify({
            id: userId, nickname: fallbackNickname,
            total_questions: 0, correct_answers: 0, wrong_answers: 0, streak_days: 0,
            is_admin: isJ,
          }),
        });
        if (Array.isArray(created) && created.length > 0) setProfile(created[0]);
      }
    } catch (e) { console.error('loadProfile:', e); }
    finally { setLoading(false); }
  }

  // 核心：登录 → 先在 Supabase Auth 注册/登录，再加载 profile
  const signInWithName = async (nickname) => {
    const name = (nickname || '').trim();
    if (!name) throw new Error('请输入名字');
    if (name.length > 20) throw new Error('名字不能超过 20 个字');

    const email = nameToEmail(name);
    const password = nameToPassword(name);

    let authUser;

    // 第一步：Try Sign In
    const { data: siData, error: siError } = await supabase.auth.signInWithPassword({ email, password });

    if (siError) {
      // 用户不存在 → 注册
      const { data: suData, error: suError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (suError) throw new Error(suError.message);
      authUser = suData.user;
    } else {
      authUser = siData.user;
    }

    if (!authUser) throw new Error('登录失败，请重试');

    const u = {
      id: authUser.id,
      email: authUser.email,
      nickname: name,
      _supabase: true,
    };

    setUser(u);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      id: authUser.id,
      email: authUser.email,
      nickname: name,
      savedAt: Date.now(),
    }));

    await loadProfile(authUser.id, name);
    return u;
  };

  const signOut = async () => {
    try { await supabase.auth.signOut(); } catch {}
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

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
