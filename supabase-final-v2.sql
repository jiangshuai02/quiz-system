-- 第3阶段：完整管理功能 SQL (更新版)
-- 在 Supabase SQL Editor 运行此脚本

-- 1. 网站设置表
CREATE TABLE IF NOT EXISTS public.site_settings (
  id BIGSERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 公告表
CREATE TABLE IF NOT EXISTS public.announcements (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 分类管理表（可编辑题库分类）
CREATE TABLE IF NOT EXISTS public.admin_categories (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📘',
  description TEXT DEFAULT '',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 管理员题目表
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

-- 5. 排行榜视图
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

-- 6. 公开读 profile（排行榜需要）
DROP POLICY IF EXISTS "Anyone can view profiles for leaderboard" ON public.profiles;
CREATE POLICY "Anyone can view profiles for leaderboard" ON public.profiles
  FOR SELECT USING (true);

-- 启用 RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_questions ENABLE ROW LEVEL SECURITY;

-- 7. RLS 策略
DROP POLICY IF EXISTS "Admins manage site settings" ON public.site_settings;
CREATE POLICY "Admins manage site settings" ON public.site_settings FOR ALL
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));

DROP POLICY IF EXISTS "Everyone read site settings" ON public.site_settings;
CREATE POLICY "Everyone read site settings" ON public.site_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage announcements" ON public.announcements;
CREATE POLICY "Admins manage announcements" ON public.announcements FOR ALL
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));

DROP POLICY IF EXISTS "Everyone read active announcements" ON public.announcements;
CREATE POLICY "Everyone read active announcements" ON public.announcements FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage categories" ON public.admin_categories;
CREATE POLICY "Admins manage categories" ON public.admin_categories FOR ALL
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));

DROP POLICY IF EXISTS "Everyone read categories" ON public.admin_categories;
CREATE POLICY "Everyone read categories" ON public.admin_categories FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage questions" ON public.admin_questions;
CREATE POLICY "Admins manage questions" ON public.admin_questions FOR ALL
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));

DROP POLICY IF EXISTS "Everyone read active questions" ON public.admin_questions;
CREATE POLICY "Everyone read active questions" ON public.admin_questions FOR SELECT USING (is_active = true);

-- 8. 插入默认网站设置
INSERT INTO public.site_settings (key, value) VALUES
  ('site_title', '王大拿刷题宝'),
  ('site_footer', '© 2026 王大拿刷题宝 — 面试刷题，轻松拿 Offer 🚀'),
  ('site_description', '海量前端面试题库，助你高效备战面试')
ON CONFLICT (key) DO NOTHING;

-- 9. 插入默认分类
INSERT INTO public.admin_categories (slug, name, icon, description, display_order) VALUES
  ('frontend', '前端基础', '🌐', 'HTML/CSS/浏览器等前端基础知识', 1),
  ('javascript', 'JavaScript', '📜', 'JS核心概念、ES6+语法、异步编程', 2),
  ('react', 'React', '⚛️', 'React核心原理、Hooks、状态管理', 3),
  ('vue', 'Vue', '💚', 'Vue核心原理、响应式、组合式API', 4),
  ('network', '计算机网络', '🌍', 'HTTP/HTTPS、TCP/IP、浏览器缓存', 5),
  ('algorithm', '数据结构与算法', '🔢', '排序、搜索、树、动态规划等', 6),
  ('coding', '编程题', '💻', '手写代码、实现函数、设计模式', 7)
ON CONFLICT (slug) DO NOTHING;
