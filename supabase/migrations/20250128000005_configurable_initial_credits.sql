-- Add system setting for initial credits
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'initial_credits',
  '100',
  'Số credits ban đầu khi tạo tài khoản mới'
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description;

-- Update handle_new_user function to use configurable initial credits
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  free_plan_id UUID;
  initial_credits INTEGER;
BEGIN
  -- IMPORTANT: This function runs AFTER auth.users insert
  -- We must NOT raise exceptions or the auth signup will fail

  BEGIN
    -- Get initial credits from system settings (default 100)
    SELECT COALESCE((value::INTEGER), 100) INTO initial_credits
    FROM public.system_settings
    WHERE key = 'initial_credits';

    -- Get Free plan ID
    SELECT id INTO free_plan_id FROM public.plans WHERE id = 'free' LIMIT 1;

    -- Create user profile (only if not exists)
    INSERT INTO public.users (id, email, role, metadata)
    VALUES (
      NEW.id,
      NEW.email,
      'user',
      jsonb_build_object(
        'full_name', COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'avatar_url', COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
      )
    )
    ON CONFLICT (id) DO NOTHING;

    -- Create wallet with configurable initial credits (only if not exists)
    INSERT INTO public.wallets (user_id, balance_credits, reserved_credits)
    VALUES (NEW.id, initial_credits, 0)
    ON CONFLICT (user_id) DO NOTHING;

    -- Create subscription to Free plan (only if not exists)
    IF free_plan_id IS NOT NULL THEN
      INSERT INTO public.subscriptions_internal (
        user_id,
        plan_id,
        status,
        current_period_start,
        current_period_end
      ) VALUES (
        NEW.id,
        free_plan_id,
        'active',
        NOW(),
        NOW() + INTERVAL '1 year'
      )
      ON CONFLICT (user_id, plan_id) DO NOTHING;
    END IF;

  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't fail the auth signup
      RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
  END;

  -- Always return NEW to allow auth signup to succeed
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

