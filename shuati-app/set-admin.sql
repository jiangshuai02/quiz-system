-- =============================================
-- 设置管理员账号（在 Supabase SQL Editor 运行）
-- =============================================

-- 先确认你当前注册用户的 UUID
-- （用下面命令查看所有用户）
SELECT id, nickname, is_admin FROM public.profiles;

-- ===== 方法：手动提升为管理员 =====
-- 把下面的 '你的UUID' 替换成上一步查到的 ID
-- UPDATE public.profiles SET is_admin = true WHERE id = '你的UUID';
-- 或者按昵称设置：
UPDATE public.profiles SET is_admin = true WHERE nickname = 'jiangshuai';

-- 验证
SELECT id, nickname, is_admin FROM public.profiles WHERE is_admin = true;
