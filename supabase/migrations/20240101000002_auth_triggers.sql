-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  -- IMPORTANT: This function runs AFTER auth.users insert
  -- We must NOT raise exceptions or the auth signup will fail

  BEGIN
    -- Get Free plan ID
    SELECT id INTO free_plan_id FROM public.plans WHERE slug = 'free' LIMIT 1;

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

    -- Create wallet with Free plan (only if not exists)
    INSERT INTO public.wallets (user_id, balance_credits, reserved_credits)
    VALUES (NEW.id, 100, 0)
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

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

