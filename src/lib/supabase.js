import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gzknkidmkdboazhfve.supabase.co';
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
