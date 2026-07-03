import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, apiFetch, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';

const AuthContext = createContext({});

const STORAGE_KEY = 'shuati_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // 启动：从 localStorage 读取已保存用户
  useEffect(() => {
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
  }, []);

  // 登录后用昵称注册到 Supabase（用昵称做唯一 ID）
  async function loadProfile(userId, fallbackNickname = '') {
    try {
      // 直接 fetch profiles
      const list = await apiFetch(`/rest/v1/profiles?id=eq.${userId}&select=*`);
      const isJiangshuai = fallbackNickname === 'jiangshuai';
      if (Array.isArray(list) && list.length > 0) {
        const cur = list[0];
        // profile 已存在 → 检查是不是 jiangshuai，如果不是管理员但名字匹配，自动升级
        if (isJiangshuai && !cur.is_admin) {
          const updated = await apiFetch(`/rest/v1/profiles?id=eq.${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
            body: JSON.stringify({ is_admin: true }),
          });
          if (Array.isArray(updated) && updated.length > 0) setProfile(updated[0]);
          else setProfile({ ...cur, is_admin: true });
        } else {
          setProfile(cur);
        }
      } else {
        // 不存在则创建
        const created = await apiFetch('/rest/v1/profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
          body: JSON.stringify({
            id: userId,
            nickname: fallbackNickname,
            total_questions: 0,
            correct_answers: 0,
            wrong_answers: 0,
            streak_days: 0,
            is_admin: isJiangshuai,
          }),
        });
        if (Array.isArray(created) && created.length > 0) setProfile(created[0]);
      }
    } catch (e) {
      console.error('加载用户资料失败', e);
    } finally {
      setLoading(false);
    }
  }

  // 简化登录：只输入昵称 → 生成本地 UUID
  const signInWithName = async (nickname) => {
    const name = (nickname || '').trim();
    if (!name) throw new Error('请输入名字');
    if (name.length > 20) throw new Error('名字不能超过 20 个字');

    let userId;
    // 特殊名字 → 用固定的 UUID（让 jiangshuai 真正对应到数据库里的管理员账号）
    if (name === 'jiangshuai') {
      userId = '149c950b-be93-475c-bcc4-a8addfce5095';
    } else {
      // 用昵称 + 随机串生成稳定 UUID（同一昵称 + 浏览器 总是同一个 ID）
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (stored && stored.nickname === name && stored.id) {
        userId = stored.id;
      } else {
        const seed = `${name}_${navigator.userAgent.length}_${Date.now()}`;
        userId = 'c' + simpleHash(seed).padStart(8, '0') + '-' +
          simpleHash(seed + 'a').slice(0, 4) + '-' +
          simpleHash(seed + 'b').slice(0, 4) + '-' +
          simpleHash(seed + 'c').slice(0, 12);
      }
    }

    const u = { id: userId, email: `${name}@local.shuati`, _local: true, nickname: name };
    setUser(u);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: userId, email: u.email, nickname: name, savedAt: Date.now() }));
    await loadProfile(userId, name);
    return u;
  };

  const signOut = () => {
    setUser(null);
    setProfile(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const value = {
    user,
    profile,
    loading,
    signInWithName,
    signOut,
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
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
