import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gzkznkidmkdboazhfsve.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6a3pua2lkbWtkYm9hemhmc3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNjEwMjIsImV4cCI6MjA5ODYzNzAyMn0.2T-xtEsFx6VgarBRL808HGJ9PR3S7k9NZ6TAgU45eFw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: window.localStorage,
  },
});

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
 * 排行榜
 */
export async function getLeaderboard(type = 'total') {
  const viewMap = {
    total: 'leaderboard',
    weekly: 'leaderboard_weekly',
    monthly: 'leaderboard_monthly',
  };
  const viewName = viewMap[type] || 'leaderboard';
  const { data, error } = await supabase
    .from(viewName)
    .select('*')
    .limit(50);
  if (error) throw error;
  return data || [];
}

/**
 * 管理员 - 所有用户
 */
export async function getAllUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('total_questions', { ascending: false });
  if (error) throw error;
  return data || [];
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
  const { data, error } = await supabase
    .from('exam_statistics')
    .select('*')
    .order('total_exams', { ascending: false });
  if (error) throw error;
  return data || [];
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
  if (error) throw error;
  return count || 0;
}

/**
 * 获取总用户数
 */
export async function getTotalUserCount() {
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
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
