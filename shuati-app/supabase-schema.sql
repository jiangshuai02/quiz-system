-- ==========================================
-- 王大拿刷题宝 - Supabase 数据库建表脚本
-- ==========================================

-- 1. 用户资料表（自动扩展 Supabase Auth）
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  total_questions INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  wrong_answers INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_study_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 错题本
CREATE TABLE IF NOT EXISTS public.wrong_answers (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL,
  selected_answer TEXT DEFAULT '',
  wrong_count INTEGER DEFAULT 1,
  last_wrong_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, question_id)
);

-- 3. 答题记录
CREATE TABLE IF NOT EXISTS public.answer_records (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 考试记录
CREATE TABLE IF NOT EXISTS public.exam_records (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT DEFAULT '',
  total_questions INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  wrong_count INTEGER DEFAULT 0,
  unanswered_count INTEGER DEFAULT 0,
  score INTEGER NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ DEFAULT now()
);

-- 5. 收藏题目
CREATE TABLE IF NOT EXISTS public.favorites (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, question_id)
);

-- 6. 学习统计（每天）
CREATE TABLE IF NOT EXISTS public.daily_stats (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  study_date DATE NOT NULL DEFAULT CURRENT_DATE,
  questions_done INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  study_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, study_date)
);

-- ====== 启用 RLS ======
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wrong_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answer_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;

-- ====== RLS 策略 ======
-- 用户只能操作自己的数据
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own wrong answers" ON public.wrong_answers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wrong answers" ON public.wrong_answers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own wrong answers" ON public.wrong_answers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own wrong answers" ON public.wrong_answers FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own records" ON public.answer_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own records" ON public.answer_records FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own exams" ON public.exam_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own exams" ON public.exam_records FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own favorites" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own daily stats" ON public.daily_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own daily stats" ON public.daily_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own daily stats" ON public.daily_stats FOR UPDATE USING (auth.uid() = user_id);

-- ====== 触发器：用户注册时自动创建 profile ======
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====== 索引 ======
CREATE INDEX IF NOT EXISTS idx_wrong_answers_user ON public.wrong_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_answer_records_user ON public.answer_records(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_records_user ON public.exam_records(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_stats_user ON public.daily_stats(user_id, study_date);
