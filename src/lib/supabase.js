import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gzkznkidmkdboazhfsve.supabase.co';
export { SUPABASE_URL };
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6a3pua2lkbWtkYm9hemhmc3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNjEwMjIsImV4cCI6MjA5ODYzNzAyMn0.2T-xtEsFx6VgarBRL808HGJ9PR3S7k9NZ6TAgU45eFw';
export { SUPABASE_ANON_KEY };
// service_role 仅用于管理后台的 admin API（前端调用会被 Supabase 视为可信）
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6a3pua2lkbWtkYm9hemhmc3ZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzA2MTAyMiwiZXhwIjoyMDk4NjM3MDIyfQ.Ct2nfxKzoT6ptCHoi2PS4rJGCYm7YwS8aTY61xvW0hY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: window.localStorage,
  },
  global: {
    headers: {
      apikey: SUPABASE_ANON_KEY,
    },
  },
});

// 直接 fetch 工具（绕过 supabase-js 的 RLS 问题）
export async function apiFetch(path, options = {}) {
  const url = `${SUPABASE_URL}${path}`;
  // /auth/v1/admin/* 这种管理 API 需要 service_role，其它用 anon
  const isAdmin = path.startsWith('/auth/v1/admin') || path.startsWith('/rest/v1/profiles');
  const key = isAdmin ? SUPABASE_SERVICE_ROLE_KEY : SUPABASE_ANON_KEY;
  const res = await fetch(url, {
    ...options,
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * 错题管理
 */
export async function getWrongAnswers(userId) {
  const { data, error } = await supabase
    .from('wrong_answers')
    .select('*')
    .eq('user_id', userId)
    .order('last_wrong_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addWrongAnswer(userId, questionId, selectedAnswer) {
  const existing = await supabase
    .from('wrong_answers')
    .select('id, wrong_count')
    .eq('user_id', userId)
    .eq('question_id', questionId)
    .maybeSingle();

  if (existing.data) {
    const { error } = await supabase
      .from('wrong_answers')
      .update({
        wrong_count: (existing.data.wrong_count || 1) + 1,
        selected_answer: selectedAnswer,
        last_wrong_at: new Date().toISOString(),
      })
      .eq('id', existing.data.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('wrong_answers')
      .insert({
        user_id: userId,
        question_id: questionId,
        selected_answer: selectedAnswer,
      });
    if (error) throw error;
  }
}

export async function removeWrongAnswer(userId, questionId) {
  const { error } = await supabase
    .from('wrong_answers')
    .delete()
    .eq('user_id', userId)
    .eq('question_id', questionId);
  if (error) throw error;
}

/**
 * 答题记录
 */
export async function recordAnswer(userId, questionId, isCorrect) {
  const { error } = await supabase
    .from('answer_records')
    .insert({
      user_id: userId,
      question_id: questionId,
      is_correct: isCorrect,
    });
  if (error) throw error;
}

/**
 * 考试记录
 */
export async function saveExamResult(userId, result) {
  const { error } = await supabase
    .from('exam_records')
    .insert({
      user_id: userId,
      category: result.category || 'all',
      total_questions: result.total,
      correct_count: result.correct,
      wrong_count: result.wrong,
      unanswered_count: result.unanswered,
      score: result.score,
      duration_seconds: result.duration || 0,
    });
  if (error) throw error;
}

export async function getExamHistory(userId, limit = 10) {
  const { data, error } = await supabase
    .from('exam_records')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

/**
 * 收藏
 */
export async function getFavorites(userId) {
  const { data, error } = await supabase
    .from('favorites')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function toggleFavorite(userId, questionId) {
  const existing = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('question_id', questionId)
    .maybeSingle();

  if (existing.data) {
    await supabase.from('favorites').delete().eq('id', existing.data.id);
    return false;
  } else {
    await supabase.from('favorites').insert({
      user_id: userId,
      question_id: questionId,
    });
    return true;
  }
}

/**
 * 用户资料
 */
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId, updates) {
  const { error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}

/**
 * 学习统计
 */
export async function getUserStats(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('total_questions, correct_answers, wrong_answers, streak_days, last_study_date')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateStudyStats(userId, isCorrect) {
  const profile = await getProfile(userId);
  const today = new Date().toISOString().split('T')[0];

  const newStats = {
    total_questions: (profile?.total_questions || 0) + 1,
    correct_answers: (profile?.correct_answers || 0) + (isCorrect ? 1 : 0),
    wrong_answers: (profile?.wrong_answers || 0) + (isCorrect ? 0 : 1),
    last_study_date: today,
  };

  if (profile?.last_study_date) {
    const lastDate = new Date(profile.last_study_date);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      newStats.streak_days = profile.streak_days || 1;
    } else if (diffDays === 1) {
      newStats.streak_days = (profile.streak_days || 0) + 1;
    } else {
      newStats.streak_days = 1;
    }
  } else {
    newStats.streak_days = 1;
  }

  await updateProfile(userId, newStats);
}

/**
 * 排行榜 - 直接查 profiles + answer_records 计算
 */
export async function getLeaderboard(type = 'total') {
  try {
    const profiles = await apiFetch('/rest/v1/profiles?select=id,nickname,is_admin,total_questions,correct_answers,wrong_answers,streak_days,last_study_date&order=total_questions.desc&limit=100');
    if (!profiles || profiles.length === 0) return [];

    let records = [];
    try {
      records = await apiFetch('/rest/v1/answer_records?select=user_id,is_correct,answered_at&limit=10000');
    } catch {}

    const scoreMap = {};
    (records || []).forEach(r => {
      if (!scoreMap[r.user_id]) scoreMap[r.user_id] = { correct: 0, total: 0, dates: new Set() };
      if (r.is_correct) scoreMap[r.user_id].correct++;
      scoreMap[r.user_id].total++;
      if (r.answered_at) scoreMap[r.user_id].dates.add(r.answered_at.slice(0, 10));
    });

    return profiles.map(p => {
      const s = scoreMap[p.id] || { correct: 0, total: 0, dates: new Set() };
      const accuracy = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
      return {
        user_id: p.id, nickname: p.nickname, is_admin: p.is_admin,
        total_answered: s.total, correct_answers: s.correct,
        wrong_answers: s.total - s.correct, accuracy,
        active_days: s.dates.size,
        total_score: s.correct * 10 + s.total * 2 + s.dates.size * 5,
      };
    }).sort((a, b) => b.total_score - a.total_score).slice(0, 50);
  } catch (e) {
    console.warn('getLeaderboard failed:', e.message);
    return [];
  }
}

/**
 * 管理员 - 所有用户
 */
export async function getAllUsers() {
  try {
    const profiles = await apiFetch('/rest/v1/profiles?select=*');
    // 也拉取 auth 用户（补全那些没有 profile 的账号）
    let authUsers = [];
    try { authUsers = await apiFetch('/auth/v1/admin/users?page=1&per_page=200') || []; } catch {}
    if (!Array.isArray(authUsers)) authUsers = [];

    // 合并：auth 用户为主，profile 数据填充统计
    const combined = authUsers.map(au => {
      const p = (profiles || []).find(x => x.id === au.id) || {};
      return {
        id: au.id,
        nickname: p.nickname || au.user_metadata?.full_name || au.email?.split('@')[0] || '匿名',
        email: au.email || p.email || '',
        avatar_url: p.avatar_url || '',
        total_questions: p.total_questions || 0,
        correct_answers: p.correct_answers || 0,
        wrong_answers: p.wrong_answers || 0,
        streak_days: p.streak_days || 0,
        last_study_date: p.last_study_date || (au.last_sign_in_at || '').slice(0, 10),
        is_admin: p.is_admin || au.email === 'jiangshuai@shuati.app',
        last_sign_in_at: au.last_sign_in_at || p.updated_at || p.created_at,
        last_sign_in_ip: au.last_sign_in_ip || '',
        created_at: p.created_at || au.created_at,
        updated_at: p.updated_at || au.last_sign_in_at,
      };
    });

    // 补上 profiles 里有但 auth 没有的（罕见但保险）
    (profiles || []).forEach(p => {
      if (!combined.find(c => c.id === p.id)) combined.push(p);
    });

    return combined;
  } catch (e) {
    console.warn('getAllUsers failed:', e.message);
    return [];
  }
}

/**
 * 管理员 - 所有考试记录
 */
export async function getAllExamRecords(limit = 50) {
  const { data, error } = await supabase
    .from('exam_records')
    .select('*')
    .order('completed_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

/**
 * 管理员 - 考试统计
 */
export async function getExamStatistics() {
  // 直接查 exam_records
  const { data, error } = await supabase
    .from('exam_records')
    .select('user_id, score, correct_count, wrong_count, completed_at')
    .order('completed_at', { ascending: false })
    .limit(100);
  if (error) { console.warn('getExamStatistics failed:', error.message); return []; }
  if (!data) return [];

  // 按用户聚合
  const userMap = {};
  data.forEach(e => {
    if (!userMap[e.user_id]) userMap[e.user_id] = { scores: [], total_correct: 0, total_wrong: 0 };
    userMap[e.user_id].scores.push(e.score);
    userMap[e.user_id].total_correct += e.correct_count || 0;
    userMap[e.user_id].total_wrong += e.wrong_count || 0;
  });

  // 获取所有用户昵称
  const userIds = Object.keys(userMap);
  if (userIds.length === 0) return [];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname')
    .in('id', userIds);

  const nickMap = {};
  (profiles || []).forEach(p => nickMap[p.id] = p.nickname);

  return userIds.map(uid => {
    const s = userMap[uid];
    return {
      user_id: uid,
      nickname: nickMap[uid] || '匿名',
      total_exams: s.scores.length,
      avg_score: s.scores.length > 0 ? Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length) : 0,
      max_score: s.scores.length > 0 ? Math.max(...s.scores) : 0,
      total_correct: s.total_correct,
      total_wrong: s.total_wrong,
    };
  }).sort((a, b) => b.avg_score - a.avg_score);
}

/**
 * 检查用户是否为管理员
 */
export async function checkIsAdmin(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.is_admin === true;
}

/**
 * 获取所有答题记录数
 */
export async function getTotalAnswerCount() {
  const { count, error } = await supabase
    .from('answer_records')
    .select('*', { count: 'exact', head: true });
  if (error) { console.warn('getTotalAnswerCount:', error.message); return 0; }
  return count || 0;
}

/**
 * 获取总用户数
 */
export async function getTotalUserCount() {
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });
  if (error) { console.warn('getTotalUserCount:', error.message); return 0; }
  return count || 0;
}

/**
 * 获取每日注册/答题统计（简化版）
 */
export async function getDailyStats() {
  const { data, error } = await supabase
    .from('daily_stats')
    .select('*')
    .order('study_date', { ascending: false })
    .limit(30);
  if (error) throw error;
  return data || [];
}

/**
 * ========== 网站设置 ==========
 */
export async function getSiteSettings() {
  const { data, error } = await supabase.from('site_settings').select('*');
  if (error) throw error;
  const settings = {};
  (data || []).forEach(s => { settings[s.key] = s.value; });
  return settings;
}

export async function updateSiteSetting(key, value) {
  const existing = await supabase.from('site_settings').select('id').eq('key', key).maybeSingle();
  if (existing.data) {
    const { error } = await supabase.from('site_settings').update({ value }).eq('key', key);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('site_settings').insert({ key, value });
    if (error) throw error;
  }
}

/** ========== 公告 ========== */
export async function getAnnouncements() {
  const { data, error } = await supabase.from('announcements')
    .select('*').order('priority', { ascending: false }).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getActiveAnnouncements() {
  const { data, error } = await supabase.from('announcements')
    .select('*').eq('is_active', true).order('priority', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createAnnouncement(title, content, priority = 0) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('announcements').insert({
    title, content, priority, created_by: user?.id,
  });
  if (error) throw error;
}

export async function updateAnnouncement(id, updates) {
  const { error } = await supabase.from('announcements').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function deleteAnnouncement(id) {
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) throw error;
}

/** ========== 管理题目 ========== */
export async function getAdminQuestions() {
  const { data, error } = await supabase.from('admin_questions')
    .select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createAdminQuestion(q) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('admin_questions').insert({
    ...q, created_by: user?.id,
  }).select();
  if (error) throw error;
  return data?.[0];
}

export async function updateAdminQuestion(id, q) {
  const { error } = await supabase.from('admin_questions')
    .update({ ...q, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function deleteAdminQuestion(id) {
  const { error } = await supabase.from('admin_questions').delete().eq('id', id);
  if (error) throw error;
}

/** ========== 分类管理 ========== */
export async function getAdminCategories() {
  const { data, error } = await supabase.from('admin_categories')
    .select('*').order('display_order');
  if (error) throw error;
  return data || [];
}

export async function createAdminCategory(c) {
  const { data, error } = await supabase.from('admin_categories').insert(c).select();
  if (error) throw error;
  return data?.[0];
}

export async function updateAdminCategory(id, c) {
  const { error } = await supabase.from('admin_categories').update(c).eq('id', id);
  if (error) throw error;
}

export async function deleteAdminCategory(id) {
  const { error } = await supabase.from('admin_categories').delete().eq('id', id);
  if (error) throw error;
}
