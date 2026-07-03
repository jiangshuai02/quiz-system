-- =============================================
-- 第2阶段：管理员 + 排行榜数据库更新
-- 在 Supabase SQL Editor 运行此脚本
-- =============================================

-- 1. 给 profiles 表加 is_admin 字段
ALTER TABLE IF EXISTS public.profiles 
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. 创建排行榜视图（基于答题记录）
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT 
  p.id AS user_id,
  p.nickname,
  COUNT(DISTINCT ar.question_id) AS total_answered,
  COUNT(DISTINCT CASE WHEN ar.is_correct THEN ar.question_id END) AS correct_answers,
  COUNT(DISTINCT CASE WHEN NOT ar.is_correct THEN ar.question_id END) AS wrong_answers,
  CASE 
    WHEN COUNT(DISTINCT ar.question_id) > 0 
    THEN ROUND((COUNT(DISTINCT CASE WHEN ar.is_correct THEN ar.question_id END)::decimal / COUNT(DISTINCT ar.question_id) * 100))
    ELSE 0 
  END AS accuracy,
  COUNT(DISTINCT DATE(ar.answered_at)) AS active_days,
  (COUNT(DISTINCT CASE WHEN ar.is_correct THEN ar.question_id END) * 10 +
   COUNT(DISTINCT ar.question_id) * 2 +
   COUNT(DISTINCT DATE(ar.answered_at)) * 5) AS total_score
FROM public.profiles p
LEFT JOIN public.answer_records ar ON p.id = ar.user_id
GROUP BY p.id, p.nickname
ORDER BY total_score DESC;

-- 3. 创建周榜视图
CREATE OR REPLACE VIEW public.leaderboard_weekly AS
SELECT 
  p.id AS user_id,
  p.nickname,
  COUNT(DISTINCT ar.question_id) AS total_answered,
  COUNT(DISTINCT CASE WHEN ar.is_correct THEN ar.question_id END) AS correct_answers,
  CASE 
    WHEN COUNT(DISTINCT ar.question_id) > 0 
    THEN ROUND((COUNT(DISTINCT CASE WHEN ar.is_correct THEN ar.question_id END)::decimal / COUNT(DISTINCT ar.question_id) * 100))
    ELSE 0 
  END AS accuracy,
  (COUNT(DISTINCT CASE WHEN ar.is_correct THEN ar.question_id END) * 10 +
   COUNT(DISTINCT ar.question_id) * 2) AS weekly_score
FROM public.profiles p
LEFT JOIN public.answer_records ar ON p.id = ar.user_id
  AND ar.answered_at >= NOW() - INTERVAL '7 days'
GROUP BY p.id, p.nickname
ORDER BY weekly_score DESC;

-- 4. 创建月榜视图
CREATE OR REPLACE VIEW public.leaderboard_monthly AS
SELECT 
  p.id AS user_id,
  p.nickname,
  COUNT(DISTINCT ar.question_id) AS total_answered,
  COUNT(DISTINCT CASE WHEN ar.is_correct THEN ar.question_id END) AS correct_answers,
  CASE 
    WHEN COUNT(DISTINCT ar.question_id) > 0 
    THEN ROUND((COUNT(DISTINCT CASE WHEN ar.is_correct THEN ar.question_id END)::decimal / COUNT(DISTINCT ar.question_id) * 100))
    ELSE 0 
  END AS accuracy,
  (COUNT(DISTINCT CASE WHEN ar.is_correct THEN ar.question_id END) * 10 +
   COUNT(DISTINCT ar.question_id) * 2) AS monthly_score
FROM public.profiles p
LEFT JOIN public.answer_records ar ON p.id = ar.user_id
  AND ar.answered_at >= NOW() - INTERVAL '30 days'
GROUP BY p.id, p.nickname
ORDER BY monthly_score DESC;

-- 5. 创建考试统计视图
CREATE OR REPLACE VIEW public.exam_statistics AS
SELECT 
  p.id AS user_id,
  p.nickname,
  COUNT(er.id) AS total_exams,
  ROUND(AVG(er.score)) AS avg_score,
  MAX(er.score) AS max_score,
  SUM(er.correct_count) AS total_correct,
  SUM(er.wrong_count) AS total_wrong
FROM public.profiles p
LEFT JOIN public.exam_records er ON p.id = er.user_id
GROUP BY p.id, p.nickname
ORDER BY avg_score DESC NULLS LAST;

-- 6. 创建题目管理表（管理员可以增删改题目）
CREATE TABLE IF NOT EXISTS public.admin_questions (
  id BIGSERIAL PRIMARY KEY,
  category TEXT NOT NULL DEFAULT 'javascript',
  difficulty INTEGER NOT NULL DEFAULT 1,
  type TEXT NOT NULL DEFAULT 'single',
  title TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  answer JSONB NOT NULL DEFAULT '[]',
  explanation TEXT DEFAULT '',
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.admin_questions ENABLE ROW LEVEL SECURITY;

-- 管理员可以管理题目
CREATE POLICY "Admins can manage questions" ON public.admin_questions
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true)
  );

-- 所有人可以查看题目
CREATE POLICY "Everyone can view active questions" ON public.admin_questions
  FOR SELECT USING (is_active = true);

-- 7. 将第一个注册用户设为管理员（先设置 admin@test.com 的用户）
-- 运行后用正确邮箱替换
-- UPDATE public.profiles SET is_admin = true WHERE nickname = 'admin' OR email LIKE '%admin%';

-- 或者：手动将某个用户的 is_admin 设为 true
-- 先在 Authentication → Users 找到你的用户ID，然后运行：
-- UPDATE public.profiles SET is_admin = true WHERE id = '你的用户UUID';

-- 8. 启用 profiles 表公开读（排行榜需要）
CREATE POLICY "Anyone can view profiles for leaderboard" ON public.profiles
  FOR SELECT USING (true);
