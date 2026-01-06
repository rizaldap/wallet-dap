import { supabase } from './client';

/**
 * Initialize user data dengan default categories dan wallets
 * Panggil ini setelah user berhasil login pertama kali
 */
export async function initializeUserData(userId: string): Promise<boolean> {
    try {
        // Check if user already has wallets
        const { data: wallets } = await supabase
            .from('wallets')
            .select('id')
            .eq('user_id', userId)
            .limit(1);

        // Check if user already has categories
        const { data: categories } = await supabase
            .from('categories')
            .select('id')
            .eq('user_id', userId)
            .limit(1);

        // Create default wallets if empty
        if (!wallets || wallets.length === 0) {
            await createDefaultWallets(userId);
        }

        // Create default categories if empty
        if (!categories || categories.length === 0) {
            await createDefaultCategories(userId);
        }

        console.log('User data initialized successfully');
        return true;
    } catch (error) {
        console.error('Failed to initialize user data:', error);
        return false;
    }
}

async function createDefaultWallets(userId: string) {
    const defaultWallets = [
        { user_id: userId, name: 'Cash', type: 'cash', icon: '💵', color: '#22c55e', balance: 0 },
        { user_id: userId, name: 'Bank', type: 'bank', icon: '🏦', color: '#3b82f6', balance: 0 },
        { user_id: userId, name: 'E-Wallet', type: 'e-wallet', icon: '📱', color: '#8b5cf6', balance: 0 },
    ];

    const { error } = await supabase.from('wallets').insert(defaultWallets);
    if (error) throw error;
}

async function createDefaultCategories(userId: string) {
    const incomeCategories = [
        { user_id: userId, name: 'Salary', icon: '💰', color: '#22c55e', type: 'income' },
        { user_id: userId, name: 'Bonus', icon: '🎁', color: '#10b981', type: 'income' },
        { user_id: userId, name: 'Freelance', icon: '💻', color: '#14b8a6', type: 'income' },
        { user_id: userId, name: 'Investment', icon: '📈', color: '#06b6d4', type: 'income' },
    ];

    const expenseCategories = [
        { user_id: userId, name: 'Food', icon: '🍔', color: '#f97316', type: 'expense' },
        { user_id: userId, name: 'Transport', icon: '🚗', color: '#eab308', type: 'expense' },
        { user_id: userId, name: 'Bills', icon: '💡', color: '#f59e0b', type: 'expense' },
        { user_id: userId, name: 'Entertainment', icon: '🎮', color: '#ec4899', type: 'expense' },
        { user_id: userId, name: 'Shopping', icon: '🛍️', color: '#f43f5e', type: 'expense' },
        { user_id: userId, name: 'Subscriptions', icon: '📺', color: '#a855f7', type: 'expense' },
        { user_id: userId, name: 'Other', icon: '📦', color: '#94a3b8', type: 'expense' },
    ];

    const { error: incomeError } = await supabase.from('categories').insert(incomeCategories);
    if (incomeError) throw incomeError;

    const { error: expenseError } = await supabase.from('categories').insert(expenseCategories);
    if (expenseError) throw expenseError;
}

/**
 * Seed sample transactions for testing
 */
export async function seedSampleData(userId: string) {
    // Get wallet and category IDs
    const { data: wallets } = await supabase
        .from('wallets')
        .select('id, name')
        .eq('user_id', userId);

    const { data: categories } = await supabase
        .from('categories')
        .select('id, name, type')
        .eq('user_id', userId);

    if (!wallets?.length || !categories?.length) {
        console.log('No wallets or categories found. Initialize user data first.');
        return false;
    }

    const bankWallet = wallets.find(w => w.name === 'Bank');
    const salaryCategory = categories.find(c => c.name === 'Salary');
    const foodCategory = categories.find(c => c.name === 'Food');
    const transportCategory = categories.find(c => c.name === 'Transport');

    if (!bankWallet || !salaryCategory || !foodCategory) {
        console.log('Required wallet/categories not found');
        return false;
    }

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const sampleTransactions = [
        {
            user_id: userId,
            wallet_id: bankWallet.id,
            category_id: salaryCategory.id,
            type: 'income',
            amount: 8500000,
            description: 'Monthly Salary',
            date: yesterday,
        },
        {
            user_id: userId,
            wallet_id: bankWallet.id,
            category_id: foodCategory.id,
            type: 'expense',
            amount: 35000,
            description: 'Lunch',
            date: today,
        },
        {
            user_id: userId,
            wallet_id: bankWallet.id,
            category_id: foodCategory.id,
            type: 'expense',
            amount: 55000,
            description: 'Coffee',
            date: today,
        },
        {
            user_id: userId,
            wallet_id: bankWallet.id,
            category_id: transportCategory?.id || foodCategory.id,
            type: 'expense',
            amount: 25000,
            description: 'Ojek',
            date: today,
        },
    ];

    const { error } = await supabase.from('transactions').insert(sampleTransactions);
    if (error) {
        console.error('Failed to seed transactions:', error);
        return false;
    }

    // Update wallet balance
    const totalIncome = 8500000;
    const totalExpense = 35000 + 55000 + 25000;
    await supabase
        .from('wallets')
        .update({ balance: totalIncome - totalExpense })
        .eq('id', bankWallet.id);

    console.log('Sample data seeded successfully!');
    return true;
}
