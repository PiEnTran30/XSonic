-- Rename transactions table to wallet_transactions (only if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public'
             AND table_name = 'transactions') THEN

    -- Rename table
    ALTER TABLE public.transactions RENAME TO wallet_transactions;

    -- Update indexes
    ALTER INDEX IF EXISTS idx_transactions_user_id RENAME TO idx_wallet_transactions_user_id;
    ALTER INDEX IF EXISTS idx_transactions_created_at RENAME TO idx_wallet_transactions_created_at;

  END IF;
END $$;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view own transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Admins can create transactions" ON public.wallet_transactions;

-- Drop new policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view own wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Admins can view all wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Admins can create wallet transactions" ON public.wallet_transactions;

-- Create new policies for wallet_transactions
CREATE POLICY "Users can view own wallet transactions" ON public.wallet_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all wallet transactions" ON public.wallet_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can create wallet transactions" ON public.wallet_transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add reason column if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'wallet_transactions'
                 AND column_name = 'reason') THEN
    ALTER TABLE public.wallet_transactions ADD COLUMN reason TEXT;
  END IF;
END $$;

-- Make wallet_id nullable since we're using user_id
DO $$
BEGIN
  ALTER TABLE public.wallet_transactions ALTER COLUMN wallet_id DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Update existing records to have reason from description
UPDATE public.wallet_transactions SET reason = description WHERE reason IS NULL;

-- Add comment
COMMENT ON TABLE public.wallet_transactions IS 'Stores all wallet credit transactions for users';

