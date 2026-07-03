-- =============================================
-- 直接创建管理员账号 + 设置权限
-- 在 Supabase SQL Editor 运行
-- =============================================

-- 1. 在 auth.users 创建用户（密码自动加密）
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'jiangshuai@shuati.app',
  crypt('17539363075', gen_salt('bf')),
  now(),
  '{"full_name":"jiangshuai"}',
  now(),
  now(),
  '', '', '', ''
);

-- 2. 获取刚创建的用户 ID
DO $$
DECLARE
  new_user_id UUID;
BEGIN
  SELECT id INTO new_user_id FROM auth.users WHERE email = 'jiangshuai@shuati.app';

  -- 3. 在 profiles 表创建用户资料并设为管理员
  INSERT INTO public.profiles (id, nickname, is_admin, total_questions, correct_answers, wrong_answers, streak_days)
  VALUES (new_user_id, 'jiangshuai', true, 0, 0, 0, 0)
  ON CONFLICT (id) DO UPDATE SET is_admin = true, nickname = 'jiangshuai';

  -- 4. 验证
  RAISE NOTICE '管理员账号已创建: %', new_user_id;
END $$;

-- 5. 查看是否成功
SELECT p.id, p.nickname, p.is_admin, u.email
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.nickname = 'jiangshuai';
