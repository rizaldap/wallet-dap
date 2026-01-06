-- ============================================
-- WALLET-DAP DATABASE MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('bank', 'e-wallet', 'cash', 'investment')),
    icon TEXT DEFAULT '💰',
    color TEXT DEFAULT '#ffffff',
    initial_balance BIGINT DEFAULT 0,
    balance BIGINT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit Cards table
CREATE TABLE IF NOT EXISTS credit_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    credit_limit BIGINT DEFAULT 0,
    current_balance BIGINT DEFAULT 0,
    billing_date INTEGER DEFAULT 25 CHECK (billing_date >= 1 AND billing_date <= 31),
    due_date INTEGER DEFAULT 10 CHECK (due_date >= 1 AND due_date <= 31),
    color TEXT DEFAULT '#ffffff',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '📦',
    color TEXT DEFAULT '#ffffff',
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    budget_monthly BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    credit_card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer', 'credit_expense', 'credit_payment')),
    amount BIGINT NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    from_wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
    to_wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
    is_installment BOOLEAN DEFAULT false,
    installment_total INTEGER,
    installment_current INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_cards_user ON credit_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own wallets" ON wallets;
DROP POLICY IF EXISTS "Users can insert own wallets" ON wallets;
DROP POLICY IF EXISTS "Users can update own wallets" ON wallets;
DROP POLICY IF EXISTS "Users can delete own wallets" ON wallets;

DROP POLICY IF EXISTS "Users can view own credit_cards" ON credit_cards;
DROP POLICY IF EXISTS "Users can insert own credit_cards" ON credit_cards;
DROP POLICY IF EXISTS "Users can update own credit_cards" ON credit_cards;
DROP POLICY IF EXISTS "Users can delete own credit_cards" ON credit_cards;

DROP POLICY IF EXISTS "Users can view own categories" ON categories;
DROP POLICY IF EXISTS "Users can insert own categories" ON categories;
DROP POLICY IF EXISTS "Users can update own categories" ON categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON categories;

DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;

-- Wallets policies
CREATE POLICY "Users can view own wallets" ON wallets FOR SELECT USING (true);
CREATE POLICY "Users can insert own wallets" ON wallets FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own wallets" ON wallets FOR UPDATE USING (true);
CREATE POLICY "Users can delete own wallets" ON wallets FOR DELETE USING (true);

-- Credit cards policies
CREATE POLICY "Users can view own credit_cards" ON credit_cards FOR SELECT USING (true);
CREATE POLICY "Users can insert own credit_cards" ON credit_cards FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own credit_cards" ON credit_cards FOR UPDATE USING (true);
CREATE POLICY "Users can delete own credit_cards" ON credit_cards FOR DELETE USING (true);

-- Categories policies
CREATE POLICY "Users can view own categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Users can insert own categories" ON categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own categories" ON categories FOR UPDATE USING (true);
CREATE POLICY "Users can delete own categories" ON categories FOR DELETE USING (true);

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (true);
CREATE POLICY "Users can insert own transactions" ON transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own transactions" ON transactions FOR UPDATE USING (true);
CREATE POLICY "Users can delete own transactions" ON transactions FOR DELETE USING (true);

-- ============================================
-- TRIGGERS
-- ============================================

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
DROP TRIGGER IF EXISTS update_wallets_updated_at ON wallets;
CREATE TRIGGER update_wallets_updated_at
    BEFORE UPDATE ON wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_credit_cards_updated_at ON credit_cards;
CREATE TRIGGER update_credit_cards_updated_at
    BEFORE UPDATE ON credit_cards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================
-- DONE!
-- ============================================
SELECT 'Migration completed successfully!' as status;
