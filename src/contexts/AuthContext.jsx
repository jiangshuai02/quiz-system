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
        await apiFetch(`/rest/v1/profiles?id=eq.${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
          body: JSON.stringify({
            last_study_date: today,
            updated_at: new Date().toISOString(),
            ...(isJ && !cur.is_admin ? { is_admin: true } : {}),
          }),
        });
        setProfile({ ...cur, last_study_date: today, is_admin: isJ || cur.is_admin });
      } else {
        // 创建新 profile: 先确保 auth.users 里有该用户（否则 FK 约束会失败）
        try {
          const email = `${simpleHash(nickname).slice(0, 10)}@anonymous.shuati`;
          await apiFetch('/auth/v1/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              password: 'shuati_' + simpleHash(nickname).slice(0, 10),
              email_confirm: true,
              user_metadata: { full_name: nickname },
            }),
          });
        } catch (authErr) {
          // 如果 auth 创建失败（比如用户已存在），继续尝试创建 profile
          console.warn('auth user create warning:', authErr?.message?.slice(0, 50));
        }

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

    // 先查/创建 auth users（拿到真实 UUID），然后创建 profile
    let realUserId;
    if (name === 'jiangshuai') {
      realUserId = '149c950b-be93-475c-bcc4-a8addfce5095';
    } else {
      // 尝试在 auth.users 中查找已有用户
      const email = `${simpleHash(name).slice(0, 10)}@anonymous.shuati`;
      const password = 'shuati_' + simpleHash(name).slice(0, 10);
      let found = false;
      try {
        const usersRes = await apiFetch(`/auth/v1/admin/users?page=1&per_page=50`);
        if (Array.isArray(usersRes?.users)) {
          const match = usersRes.users.find(u => u.email === email);
          if (match) { realUserId = match.id; found = true; }
        }
      } catch {}
      if (!found) {
        try {
          const created = await apiFetch('/auth/v1/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email, password,
              email_confirm: true,
              user_metadata: { full_name: name },
            }),
          });
          realUserId = created?.id;
        } catch {}
      }
      // 兜底：仍用 hash 生成（但可能 FK 失败）
      if (!realUserId) realUserId = nameToId(name);
    }

    const u = { id: realUserId, nickname: name, _local: true };
    setUser(u);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      id: realUserId, nickname: name, savedAt: Date.now(),
    }));
    await loadAndUpdateProfile(realUserId, name);
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
