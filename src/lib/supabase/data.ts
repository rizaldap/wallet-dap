import { supabase } from './client';
import type {
    Wallet,
    CreditCard,
    Transaction,
    Category
} from '@/types';

// ============ WALLETS ============

export async function getWallets(userId: string): Promise<Wallet[]> {
    const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
}

export async function createWallet(wallet: Omit<Wallet, 'id' | 'createdAt' | 'updatedAt'>): Promise<Wallet> {
    const { data, error } = await supabase
        .from('wallets')
        .insert({
            user_id: wallet.userId,
            name: wallet.name,
            type: wallet.type,
            icon: wallet.icon,
            color: wallet.color,
            initial_balance: wallet.initialBalance,
            balance: wallet.balance,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateWallet(id: string, updates: Partial<Wallet>): Promise<Wallet> {
    const { data, error } = await supabase
        .from('wallets')
        .update({
            name: updates.name,
            type: updates.type,
            icon: updates.icon,
            color: updates.color,
            balance: updates.balance,
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteWallet(id: string): Promise<void> {
    const { error } = await supabase
        .from('wallets')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// ============ CREDIT CARDS ============

export async function getCreditCards(userId: string): Promise<CreditCard[]> {
    const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
}

export async function createCreditCard(card: Omit<CreditCard, 'id' | 'createdAt' | 'updatedAt'>): Promise<CreditCard> {
    const { data, error } = await supabase
        .from('credit_cards')
        .insert({
            user_id: card.userId,
            name: card.name,
            credit_limit: card.limit,
            current_balance: card.currentBalance,
            billing_date: card.billingDate,
            due_date: card.dueDate,
            color: card.color,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateCreditCard(id: string, updates: Partial<CreditCard>): Promise<CreditCard> {
    const { data, error } = await supabase
        .from('credit_cards')
        .update({
            name: updates.name,
            credit_limit: updates.limit,
            current_balance: updates.currentBalance,
            billing_date: updates.billingDate,
            due_date: updates.dueDate,
            color: updates.color,
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteCreditCard(id: string): Promise<void> {
    const { error } = await supabase
        .from('credit_cards')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// ============ CATEGORIES ============

export async function getCategories(userId: string): Promise<Category[]> {
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
}

export async function createCategory(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
    const { data, error } = await supabase
        .from('categories')
        .insert({
            user_id: category.userId,
            name: category.name,
            icon: category.icon,
            color: category.color,
            type: category.type,
            parent_id: category.parentId,
            budget_monthly: category.budgetMonthly,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

// ============ TRANSACTIONS ============

export async function getTransactions(userId: string, limit?: number): Promise<Transaction[]> {
    let query = supabase
        .from('transactions')
        .select(`
      *,
      wallet:wallets(name, icon),
      category:categories(name, icon),
      credit_card:credit_cards(name)
    `)
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

    if (limit) {
        query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
}

export async function getTransactionsByMonth(userId: string, year: number, month: number): Promise<Transaction[]> {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('transactions')
        .select(`
      *,
      wallet:wallets(name, icon),
      category:categories(name, icon)
    `)
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    const { data, error } = await supabase
        .from('transactions')
        .insert({
            user_id: transaction.userId,
            wallet_id: transaction.walletId,
            category_id: transaction.categoryId,
            credit_card_id: transaction.creditCardId,
            type: transaction.type,
            amount: transaction.amount,
            description: transaction.description,
            date: transaction.date,
            notes: transaction.notes,
            from_wallet_id: transaction.fromWalletId,
            to_wallet_id: transaction.toWalletId,
            is_installment: transaction.isInstallment,
            installment_total: transaction.installmentTotal,
            installment_current: transaction.installmentCurrent,
        })
        .select()
        .single();

    if (error) throw error;

    // Update wallet balance
    if (transaction.walletId) {
        const amountChange = transaction.type === 'income' ? transaction.amount : -transaction.amount;
        await supabase.rpc('update_wallet_balance', {
            wallet_id: transaction.walletId,
            amount_change: amountChange
        });
    }

    return data;
}

export async function deleteTransaction(id: string): Promise<void> {
    const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// ============ SUMMARY ============

export async function getMonthlySummary(userId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate);

    if (error) throw error;

    const income = (data || [])
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const expense = (data || [])
        .filter(t => t.type === 'expense' || t.type === 'credit_expense')
        .reduce((sum, t) => sum + t.amount, 0);

    return { income, expense, net: income - expense };
}

export async function getCategorySummary(userId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('transactions')
        .select(`
      amount,
      category:categories(id, name, icon)
    `)
        .eq('user_id', userId)
        .eq('type', 'expense')
        .gte('date', startDate)
        .lte('date', endDate);

    if (error) throw error;

    // Group by category
    const categoryMap = new Map<string, { name: string; icon: string; total: number }>();

    for (const tx of data || []) {
        // Supabase returns joined data as array or object depending on relationship
        const categoryData = tx.category as unknown;
        if (categoryData && typeof categoryData === 'object' && !Array.isArray(categoryData)) {
            const cat = categoryData as { id: string; name: string; icon: string };
            const existing = categoryMap.get(cat.id) || { name: cat.name, icon: cat.icon, total: 0 };
            existing.total += tx.amount;
            categoryMap.set(cat.id, existing);
        }
    }

    return Array.from(categoryMap.values()).sort((a, b) => b.total - a.total);
}
