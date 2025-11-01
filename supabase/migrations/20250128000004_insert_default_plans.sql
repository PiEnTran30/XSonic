-- Insert default plans
INSERT INTO public.plans (
  id,
  name,
  slug,
  description,
  price_monthly,
  price_yearly,
  credits_monthly,
  features,
  is_active,
  is_visible,
  sort_order
) VALUES
  (
    'free',
    'Free',
    'free',
    'Gói miễn phí cho người dùng mới',
    0,
    0,
    100,
    '["100 credits/tháng", "Truy cập các công cụ cơ bản", "Hỗ trợ qua email"]'::jsonb,
    true,
    true,
    1
  ),
  (
    'basic',
    'Basic',
    'basic',
    'Gói cơ bản cho người dùng thường xuyên',
    99000,
    990000,
    1000,
    '["1,000 credits/tháng", "Tất cả công cụ", "Hỗ trợ ưu tiên", "Lưu trữ 10GB"]'::jsonb,
    true,
    true,
    2
  ),
  (
    'pro',
    'Pro',
    'pro',
    'Gói chuyên nghiệp cho power users',
    299000,
    2990000,
    5000,
    '["5,000 credits/tháng", "Tất cả công cụ", "Hỗ trợ 24/7", "Lưu trữ 50GB", "API access"]'::jsonb,
    true,
    true,
    3
  ),
  (
    'enterprise',
    'Enterprise',
    'enterprise',
    'Gói doanh nghiệp với credits không giới hạn',
    999000,
    9990000,
    999999,
    '["Credits không giới hạn", "Tất cả công cụ", "Hỗ trợ dedicated", "Lưu trữ unlimited", "API access", "Custom integration"]'::jsonb,
    true,
    true,
    4
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  credits_monthly = EXCLUDED.credits_monthly,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  is_visible = EXCLUDED.is_visible,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

