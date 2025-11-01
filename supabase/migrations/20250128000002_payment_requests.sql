-- Create payment_methods table first (referenced by payment_requests)
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method_type TEXT NOT NULL CHECK (method_type IN ('bank_transfer', 'momo', 'zalopay', 'other')),
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  qr_code_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payment_requests table
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  payment_method_id UUID NOT NULL REFERENCES public.payment_methods(id),
  amount NUMERIC(10, 2) NOT NULL,
  transfer_content TEXT,
  proof_image_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES public.users(id),
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view own payment requests" ON public.payment_requests;
DROP POLICY IF EXISTS "Users can create own payment requests" ON public.payment_requests;
DROP POLICY IF EXISTS "Admins can view all payment requests" ON public.payment_requests;
DROP POLICY IF EXISTS "Admins can update payment requests" ON public.payment_requests;
DROP POLICY IF EXISTS "Anyone can view active payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Admins can manage payment methods" ON public.payment_methods;

-- Payment requests policies
CREATE POLICY "Users can view own payment requests" ON public.payment_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own payment requests" ON public.payment_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all payment requests" ON public.payment_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update payment requests" ON public.payment_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Payment methods policies
CREATE POLICY "Anyone can view active payment methods" ON public.payment_methods
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage payment methods" ON public.payment_methods
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_requests_user_id ON public.payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON public.payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_created_at ON public.payment_requests(created_at DESC);

-- Drop existing functions if they exist (for idempotency)
DROP FUNCTION IF EXISTS approve_payment_request(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS reject_payment_request(UUID, UUID, TEXT);

-- Function to approve payment request
CREATE OR REPLACE FUNCTION approve_payment_request(
  request_id UUID,
  admin_id UUID,
  note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request payment_requests%ROWTYPE;
  v_plan plans%ROWTYPE;
  v_wallet wallets%ROWTYPE;
  v_new_balance NUMERIC;
BEGIN
  -- Get payment request
  SELECT * INTO v_request FROM payment_requests WHERE id = request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment request not found';
  END IF;
  
  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Payment request already processed';
  END IF;
  
  -- Get plan details
  SELECT * INTO v_plan FROM plans WHERE id = v_request.plan_id;
  
  -- Get user wallet
  SELECT * INTO v_wallet FROM wallets WHERE user_id = v_request.user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;
  
  -- Calculate new balance
  v_new_balance := v_wallet.balance_credits + v_plan.credits_monthly;
  
  -- Update wallet
  UPDATE wallets 
  SET balance_credits = v_new_balance,
      updated_at = NOW()
  WHERE user_id = v_request.user_id;
  
  -- Create transaction record
  INSERT INTO wallet_transactions (
    user_id,
    wallet_id,
    type,
    amount,
    balance_after,
    reason,
    description,
    admin_id,
    admin_note,
    reference_type,
    reference_id,
    receipt_url,
    metadata
  ) VALUES (
    v_request.user_id,
    v_wallet.id,
    'credit',
    v_plan.credits_monthly,
    v_new_balance,
    'Payment approved - ' || v_plan.name,
    'Payment approved for plan: ' || v_plan.name,
    admin_id,
    note,
    'payment_request',
    request_id,
    v_request.proof_image_url,
    jsonb_build_object(
      'plan_id', v_plan.id,
      'plan_name', v_plan.name,
      'amount_paid', v_request.amount
    )
  );
  
  -- Update payment request
  UPDATE payment_requests
  SET status = 'approved',
      approved_by = admin_id,
      approved_at = NOW(),
      admin_note = note,
      updated_at = NOW()
  WHERE id = request_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'credits_added', v_plan.credits_monthly,
    'new_balance', v_new_balance
  );
END;
$$;

-- Function to reject payment request
CREATE OR REPLACE FUNCTION reject_payment_request(
  request_id UUID,
  admin_id UUID,
  note TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request payment_requests%ROWTYPE;
BEGIN
  -- Get payment request
  SELECT * INTO v_request FROM payment_requests WHERE id = request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment request not found';
  END IF;
  
  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Payment request already processed';
  END IF;
  
  -- Update payment request
  UPDATE payment_requests
  SET status = 'rejected',
      rejected_by = admin_id,
      rejected_at = NOW(),
      admin_note = note,
      updated_at = NOW()
  WHERE id = request_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Payment request rejected'
  );
END;
$$;

-- Add updated_at trigger
CREATE TRIGGER update_payment_requests_updated_at 
  BEFORE UPDATE ON public.payment_requests 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at 
  BEFORE UPDATE ON public.payment_methods 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default payment methods
INSERT INTO public.payment_methods (method_type, bank_name, account_number, account_name, is_active)
VALUES 
  ('bank_transfer', 'Vietcombank', '1234567890', 'NGUYEN VAN A', true),
  ('momo', 'MoMo', '0123456789', 'NGUYEN VAN A', true)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.payment_requests IS 'Stores payment requests from users for plan purchases';
COMMENT ON TABLE public.payment_methods IS 'Stores available payment methods';

