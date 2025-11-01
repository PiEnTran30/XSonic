-- Fix infinite recursion in RLS policies
-- Drop all existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Admins can manage plans" ON public.plans;
DROP POLICY IF EXISTS "Admins can view all wallets" ON public.wallets;
DROP POLICY IF EXISTS "Admins can update wallets" ON public.wallets;
DROP POLICY IF EXISTS "Admins can manage subscriptions" ON public.subscriptions_internal;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Admins can create transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Admins can manage vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "Admins can view all voucher usage" ON public.voucher_usage;
DROP POLICY IF EXISTS "Admins can view all jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins can manage all jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins can manage feature flags" ON public.feature_flags;
DROP POLICY IF EXISTS "Admins can view all usage metrics" ON public.usage_metrics;

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'admin' 
    FROM public.users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Users policies (using direct auth.uid() check, no recursion)
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update all users" ON public.users
  FOR UPDATE USING (public.is_admin());

-- Plans policies
CREATE POLICY "Admins can manage plans" ON public.plans
  FOR ALL USING (public.is_admin());

-- Wallets policies
CREATE POLICY "Admins can view all wallets" ON public.wallets
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update wallets" ON public.wallets
  FOR UPDATE USING (public.is_admin());

-- Subscriptions policies
CREATE POLICY "Admins can manage subscriptions" ON public.subscriptions_internal
  FOR ALL USING (public.is_admin());

-- Wallet transactions policies
CREATE POLICY "Admins can view all transactions" ON public.wallet_transactions
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can create transactions" ON public.wallet_transactions
  FOR INSERT WITH CHECK (public.is_admin());

-- Vouchers policies
CREATE POLICY "Admins can manage vouchers" ON public.vouchers
  FOR ALL USING (public.is_admin());

-- Voucher usage policies
CREATE POLICY "Admins can view all voucher usage" ON public.voucher_usage
  FOR SELECT USING (public.is_admin());

-- Jobs policies
CREATE POLICY "Admins can view all jobs" ON public.jobs
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can manage all jobs" ON public.jobs
  FOR ALL USING (public.is_admin());

-- Feature flags policies
CREATE POLICY "Admins can manage feature flags" ON public.feature_flags
  FOR ALL USING (public.is_admin());

-- Usage metrics policies
CREATE POLICY "Admins can view all usage metrics" ON public.usage_metrics
  FOR SELECT USING (public.is_admin());

