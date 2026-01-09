-- ============================================
-- WALLET-DAP COMPLETE DATABASE SCHEMA
-- Run this in Supabase SQL Editor for fresh setup
-- ============================================

-- ============================================
-- HELPER FUNCTIONS (Must be created first)
-- ============================================

-- Check if user is a goal member (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION is_goal_member(_goal_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM goal_members 
    WHERE goal_id = _goal_id 
    AND user_id = auth.uid()
    AND accepted_at IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is goal owner
CREATE OR REPLACE FUNCTION is_goal_owner(_goal_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM goals 
    WHERE id = _goal_id 
    AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user ID by email
CREATE OR REPLACE FUNCTION get_user_id_by_email(p_email TEXT)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment goal amount (for contributions)
CREATE OR REPLACE FUNCTION increment_goal_amount(goal_id UUID, amount DECIMAL)
RETURNS VOID AS $$
BEGIN
  UPDATE goals 
  SET current_amount = current_amount + amount,
      updated_at = NOW()
  WHERE id = goal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- CORE TABLES
-- ============================================

-- Wallets
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('cash', 'bank', 'e-wallet', 'other')),
  icon VARCHAR(10) DEFAULT '💰',
  color VARCHAR(7) DEFAULT '#ffffff',
  initial_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit Cards
CREATE TABLE IF NOT EXISTS credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  credit_limit DECIMAL(15,2) NOT NULL,
  current_balance DECIMAL(15,2) DEFAULT 0,
  billing_date INTEGER CHECK (billing_date BETWEEN 1 AND 31),
  due_date INTEGER CHECK (due_date BETWEEN 1 AND 31),
  icon VARCHAR(10) DEFAULT '💳',
  color VARCHAR(7) DEFAULT '#6366f1',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  icon VARCHAR(10) DEFAULT '📦',
  color VARCHAR(7) DEFAULT '#ffffff',
  type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
  credit_card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense', 'transfer', 'credit_expense', 'credit_payment')),
  amount DECIMAL(15,2) NOT NULL,
  description VARCHAR(200),
  date DATE NOT NULL,
  notes TEXT,
  from_wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
  to_wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- GOALS TABLES
-- ============================================

-- Goals (Main)
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(10) DEFAULT '🎯',
  color VARCHAR(7) DEFAULT '#6366f1',
  target_amount DECIMAL(15,2) NOT NULL,
  current_amount DECIMAL(15,2) DEFAULT 0,
  deadline DATE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goal Members
CREATE TABLE IF NOT EXISTS goal_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  user_name VARCHAR(100),
  user_email VARCHAR(255),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(goal_id, user_id)
);

-- Goal Budgets (Budget items for goals)
CREATE TABLE IF NOT EXISTS goal_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  paid_amount DECIMAL(15,2) DEFAULT 0,
  vendor VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid')),
  due_date DATE,
  notes TEXT,
  description TEXT,
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_by UUID REFERENCES auth.users(id),
  created_by_name VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goal Budget Payments
CREATE TABLE IF NOT EXISTS goal_budget_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES goal_budgets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  user_name VARCHAR(100),
  amount DECIMAL(15,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goal Contributions (Deposits to goal)
CREATE TABLE IF NOT EXISTS goal_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name VARCHAR(100),
  amount DECIMAL(15,2) NOT NULL,
  wallet_id UUID NOT NULL REFERENCES wallets(id),
  transaction_id UUID REFERENCES transactions(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goal Activities (Activity log)
CREATE TABLE IF NOT EXISTS goal_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action VARCHAR(50) NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goal Invitations (One-time invite links)
CREATE TABLE IF NOT EXISTS goal_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  token TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'used'))
);

-- ============================================
-- GOLD INVESTMENT TABLES
-- ============================================

-- Gold Holdings
CREATE TABLE IF NOT EXISTS gold_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  total_grams DECIMAL(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Gold Transactions
CREATE TABLE IF NOT EXISTS gold_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  holding_id UUID NOT NULL REFERENCES gold_holdings(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('buy', 'sell')),
  grams DECIMAL(10,4) NOT NULL,
  price_per_gram DECIMAL(15,2) NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  wallet_id UUID NOT NULL REFERENCES wallets(id),
  transaction_id UUID REFERENCES transactions(id),
  notes TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_cards_user ON credit_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_goals_owner ON goals(owner_id);
CREATE INDEX IF NOT EXISTS idx_goal_members_user ON goal_members(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_members_goal ON goal_members(goal_id);
CREATE INDEX IF NOT EXISTS idx_gold_holdings_user ON gold_holdings(user_id);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_budget_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gold_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gold_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: Personal Tables
-- ============================================

-- Wallets
DROP POLICY IF EXISTS "Users can manage own wallets" ON wallets;
CREATE POLICY "Users can manage own wallets" ON wallets
  FOR ALL USING (auth.uid() = user_id);

-- Credit Cards
DROP POLICY IF EXISTS "Users can manage own credit_cards" ON credit_cards;
CREATE POLICY "Users can manage own credit_cards" ON credit_cards
  FOR ALL USING (auth.uid() = user_id);

-- Categories
DROP POLICY IF EXISTS "Users can manage own categories" ON categories;
CREATE POLICY "Users can manage own categories" ON categories
  FOR ALL USING (auth.uid() = user_id);

-- Transactions
DROP POLICY IF EXISTS "Users can manage own transactions" ON transactions;
CREATE POLICY "Users can manage own transactions" ON transactions
  FOR ALL USING (auth.uid() = user_id);

-- Gold Holdings
DROP POLICY IF EXISTS "Users can manage own gold_holdings" ON gold_holdings;
CREATE POLICY "Users can manage own gold_holdings" ON gold_holdings
  FOR ALL USING (auth.uid() = user_id);

-- Gold Transactions
DROP POLICY IF EXISTS "Users can manage own gold_transactions" ON gold_transactions;
CREATE POLICY "Users can manage own gold_transactions" ON gold_transactions
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES: Goals (Collaborative)
-- ============================================

-- Goals: View if owner or member
DROP POLICY IF EXISTS "Users can view goals" ON goals;
CREATE POLICY "Users can view goals" ON goals
  FOR SELECT USING (owner_id = auth.uid() OR is_goal_member(id));

-- Goals: Modify if owner
DROP POLICY IF EXISTS "Owner can modify goals" ON goals;
CREATE POLICY "Owner can modify goals" ON goals
  FOR ALL USING (owner_id = auth.uid());

-- Goal Members: View if owner, member, or self
DROP POLICY IF EXISTS "Users can view goal members" ON goal_members;
CREATE POLICY "Users can view goal members" ON goal_members
  FOR SELECT USING (is_goal_owner(goal_id) OR is_goal_member(goal_id) OR user_id = auth.uid());

-- Goal Members: Owner can manage
DROP POLICY IF EXISTS "Owner can manage goal members" ON goal_members;
CREATE POLICY "Owner can manage goal members" ON goal_members
  FOR ALL USING (is_goal_owner(goal_id));

-- Goal Members: Members can add members
DROP POLICY IF EXISTS "Members can add members" ON goal_members;
CREATE POLICY "Members can add members" ON goal_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM goal_members 
      WHERE goal_id = goal_members.goal_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'editor')
    )
  );

-- Goal Budgets
DROP POLICY IF EXISTS "Members can view goal_budgets" ON goal_budgets;
CREATE POLICY "Members can view goal_budgets" ON goal_budgets
  FOR SELECT USING (is_goal_member(goal_id) OR is_goal_owner(goal_id));

DROP POLICY IF EXISTS "Editors can manage goal_budgets" ON goal_budgets;
CREATE POLICY "Editors can manage goal_budgets" ON goal_budgets
  FOR ALL USING (
    is_goal_owner(goal_id) OR 
    EXISTS (
      SELECT 1 FROM goal_members 
      WHERE goal_id = goal_budgets.goal_id 
      AND user_id = auth.uid() 
      AND role IN ('admin', 'editor')
    )
  );

-- Goal Budget Payments
DROP POLICY IF EXISTS "Members can view payments" ON goal_budget_payments;
CREATE POLICY "Members can view payments" ON goal_budget_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM goal_budgets gb 
      WHERE gb.id = budget_id 
      AND (is_goal_member(gb.goal_id) OR is_goal_owner(gb.goal_id))
    )
  );

DROP POLICY IF EXISTS "Editors can add payments" ON goal_budget_payments;
CREATE POLICY "Editors can add payments" ON goal_budget_payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM goal_budgets gb 
      JOIN goal_members gm ON gm.goal_id = gb.goal_id
      WHERE gb.id = budget_id 
      AND gm.user_id = auth.uid() 
      AND gm.role IN ('owner', 'admin', 'editor')
    )
  );

-- Goal Contributions
DROP POLICY IF EXISTS "Members can view goal_contributions" ON goal_contributions;
CREATE POLICY "Members can view goal_contributions" ON goal_contributions
  FOR SELECT USING (is_goal_member(goal_id) OR is_goal_owner(goal_id));

DROP POLICY IF EXISTS "Editors can add goal_contributions" ON goal_contributions;
CREATE POLICY "Editors can add goal_contributions" ON goal_contributions
  FOR INSERT WITH CHECK (
    is_goal_owner(goal_id) OR 
    EXISTS (
      SELECT 1 FROM goal_members 
      WHERE goal_id = goal_contributions.goal_id 
      AND user_id = auth.uid() 
      AND role IN ('admin', 'editor')
    )
  );

-- Goal Activities
DROP POLICY IF EXISTS "Members can view goal_activities" ON goal_activities;
CREATE POLICY "Members can view goal_activities" ON goal_activities
  FOR SELECT USING (is_goal_member(goal_id) OR is_goal_owner(goal_id));

-- Goal Invitations
DROP POLICY IF EXISTS "Creators can view invitations" ON goal_invitations;
CREATE POLICY "Creators can view invitations" ON goal_invitations
  FOR SELECT USING (auth.uid() = created_by);

-- ============================================
-- RPC FUNCTIONS
-- ============================================

-- Create Invitation (returns token)
CREATE OR REPLACE FUNCTION create_invitation(p_goal_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token TEXT;
BEGIN
  -- Check permissions
  IF NOT EXISTS (
    SELECT 1 FROM goal_members 
    WHERE goal_id = p_goal_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'admin', 'editor')
  ) THEN
    RAISE EXCEPTION 'Not authorized to create invitations';
  END IF;

  -- Create invitation
  INSERT INTO goal_invitations (goal_id, created_by)
  VALUES (p_goal_id, auth.uid())
  RETURNING token INTO v_token;

  RETURN v_token;
END;
$$;

-- Claim Invitation (returns goal_id)
CREATE OR REPLACE FUNCTION claim_invitation(p_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation goal_invitations%ROWTYPE;
  v_user_email TEXT;
  v_user_name TEXT;
BEGIN
  -- Get invitation
  SELECT * INTO v_invitation FROM goal_invitations WHERE token = p_token;
  
  IF v_invitation IS NULL THEN
    RAISE EXCEPTION 'Invalid invitation link';
  END IF;

  IF v_invitation.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invitation already used';
  END IF;

  -- Get user info
  SELECT email, COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1))
  INTO v_user_email, v_user_name
  FROM auth.users WHERE id = auth.uid();

  -- Check if already member
  IF EXISTS (
    SELECT 1 FROM goal_members 
    WHERE goal_id = v_invitation.goal_id AND user_id = auth.uid()
  ) THEN
    RETURN v_invitation.goal_id;
  END IF;

  -- Add as member
  INSERT INTO goal_members (goal_id, user_id, role, user_email, user_name, invited_by, accepted_at)
  VALUES (v_invitation.goal_id, auth.uid(), 'editor', v_user_email, v_user_name, v_invitation.created_by, NOW());

  -- Mark used
  UPDATE goal_invitations SET used_at = NOW(), status = 'used' WHERE id = v_invitation.id;

  RETURN v_invitation.goal_id;
END;
$$;

-- ============================================
-- DONE!
-- ============================================
SELECT 'Wallet-Dap schema initialized successfully!' AS status;
