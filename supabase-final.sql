-- =============================================
-- 第3阶段：完整管理功能 SQL
-- =============================================

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

-- 3. 管理员题目表（可编辑题库）
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

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_questions ENABLE ROW LEVEL SECURITY;

-- RLS: 管理员可管理
CREATE POLICY "Admins manage site settings" ON public.site_settings
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));

CREATE POLICY "Admins manage announcements" ON public.announcements
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));

CREATE POLICY "Admins manage questions" ON public.admin_questions
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));

-- RLS: 所有用户可读
CREATE POLICY "Everyone read site settings" ON public.site_settings
  FOR SELECT USING (true);

CREATE POLICY "Everyone read active announcements" ON public.announcements
  FOR SELECT USING (is_active = true);

CREATE POLICY "Everyone read active questions" ON public.admin_questions
  FOR SELECT USING (is_active = true);

-- 插入默认网站设置
INSERT INTO public.site_settings (key, value) VALUES
  ('site_title', '王大拿刷题宝'),
  ('site_footer', '© 2026 王大拿刷题宝 — 面试刷题，轻松拿 Offer 🚀'),
  ('site_description', '海量前端面试题库，助你高效备战面试')
ON CONFLICT (key) DO NOTHING;
