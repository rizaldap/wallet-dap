-- ============================================
-- WALLET-DAP SEED DATA
-- Run this AFTER migration to populate default data
-- ============================================

-- Note: Replace 'YOUR_USER_ID' with actual user ID after first login
-- You can find your user_id in the session after logging in

-- ============================================
-- DEFAULT CATEGORIES (akan diinsert saat user pertama kali login)
-- ============================================

-- This function creates default categories for a new user
CREATE OR REPLACE FUNCTION create_default_categories(p_user_id TEXT)
RETURNS void AS $$
BEGIN
    -- Income Categories
    INSERT INTO categories (user_id, name, icon, color, type) VALUES
    (p_user_id, 'Salary', '💰', '#22c55e', 'income'),
    (p_user_id, 'Bonus', '🎁', '#10b981', 'income'),
    (p_user_id, 'Freelance', '💻', '#14b8a6', 'income'),
    (p_user_id, 'Investment', '📈', '#06b6d4', 'income'),
    (p_user_id, 'Other Income', '✨', '#8b5cf6', 'income')
    ON CONFLICT DO NOTHING;
    
    -- Expense Categories
    INSERT INTO categories (user_id, name, icon, color, type) VALUES
    (p_user_id, 'Food & Drinks', '🍔', '#f97316', 'expense'),
    (p_user_id, 'Transport', '🚗', '#eab308', 'expense'),
    (p_user_id, 'Bills', '💡', '#f59e0b', 'expense'),
    (p_user_id, 'Phone & Internet', '📱', '#84cc16', 'expense'),
    (p_user_id, 'Entertainment', '🎮', '#ec4899', 'expense'),
    (p_user_id, 'Subscriptions', '📺', '#a855f7', 'expense'),
    (p_user_id, 'Shopping', '🛍️', '#f43f5e', 'expense'),
    (p_user_id, 'Fashion', '👕', '#d946ef', 'expense'),
    (p_user_id, 'Installments', '🏦', '#64748b', 'expense'),
    (p_user_id, 'Savings', '🐷', '#0ea5e9', 'expense'),
    (p_user_id, 'Insurance', '🛡️', '#6366f1', 'expense'),
    (p_user_id, 'Gifts', '🎀', '#f472b6', 'expense'),
    (p_user_id, 'Donations', '❤️', '#ef4444', 'expense'),
    (p_user_id, 'Other', '📦', '#94a3b8', 'expense')
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DEFAULT WALLETS (sample, optional)
-- ============================================

CREATE OR REPLACE FUNCTION create_default_wallets(p_user_id TEXT)
RETURNS void AS $$
BEGIN
    INSERT INTO wallets (user_id, name, type, icon, color, balance) VALUES
    (p_user_id, 'Cash', 'cash', '💵', '#22c55e', 0),
    (p_user_id, 'Bank Account', 'bank', '🏦', '#3b82f6', 0),
    (p_user_id, 'E-Wallet', 'e-wallet', '📱', '#8b5cf6', 0)
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- HELPER: Initialize user data on first login
-- Call this after user authenticates
-- ============================================

CREATE OR REPLACE FUNCTION initialize_user_data(p_user_id TEXT)
RETURNS TEXT AS $$
DECLARE
    wallet_count INTEGER;
    category_count INTEGER;
BEGIN
    -- Check if user already has data
    SELECT COUNT(*) INTO wallet_count FROM wallets WHERE user_id = p_user_id;
    SELECT COUNT(*) INTO category_count FROM categories WHERE user_id = p_user_id;
    
    -- Create defaults if empty
    IF wallet_count = 0 THEN
        PERFORM create_default_wallets(p_user_id);
    END IF;
    
    IF category_count = 0 THEN
        PERFORM create_default_categories(p_user_id);
    END IF;
    
    RETURN 'User data initialized successfully!';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SAMPLE DATA (optional - for testing)
-- Uncomment to insert sample data
-- ============================================

/*
-- Sample user ID (replace with actual)
DO $$
DECLARE
    test_user_id TEXT := 'test-user-123';
    wallet_id UUID;
    cat_food_id UUID;
    cat_salary_id UUID;
BEGIN
    -- Initialize defaults
    PERFORM initialize_user_data(test_user_id);
    
    -- Get wallet and category IDs
    SELECT id INTO wallet_id FROM wallets WHERE user_id = test_user_id AND name = 'Bank Account' LIMIT 1;
    SELECT id INTO cat_food_id FROM categories WHERE user_id = test_user_id AND name = 'Food & Drinks' LIMIT 1;
    SELECT id INTO cat_salary_id FROM categories WHERE user_id = test_user_id AND name = 'Salary' LIMIT 1;
    
    -- Sample transactions
    INSERT INTO transactions (user_id, wallet_id, category_id, type, amount, description, date) VALUES
    (test_user_id, wallet_id, cat_salary_id, 'income', 8500000, 'Monthly Salary', CURRENT_DATE - 5),
    (test_user_id, wallet_id, cat_food_id, 'expense', 35000, 'Lunch', CURRENT_DATE - 3),
    (test_user_id, wallet_id, cat_food_id, 'expense', 55000, 'Coffee', CURRENT_DATE - 2),
    (test_user_id, wallet_id, cat_food_id, 'expense', 75000, 'Dinner', CURRENT_DATE - 1);
    
    -- Update wallet balance
    UPDATE wallets SET balance = 8500000 - 35000 - 55000 - 75000 WHERE id = wallet_id;
END;
$$;
*/

-- ============================================
-- DONE!
-- ============================================
SELECT 'Seed functions created successfully!' as status;
SELECT 'Call initialize_user_data(user_id) after user logs in' as next_step;
