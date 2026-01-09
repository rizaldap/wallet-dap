import { createClient } from './server';
import type {
    Wallet,
    CreditCard,
    Transaction,
    Category
} from '@/types';

// ============ WALLETS ============

export async function getWallets(userId: string): Promise<Wallet[]> {
    const supabase = await createClient();

    // Get wallets with their transactions for balance calculation
    const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    if (walletError) throw walletError;

    // Get all transactions for this user's wallets
    const walletIds = (walletData || []).map(w => w.id);
    const { data: txData } = await supabase
        .from('transactions')
        .select('wallet_id, type, amount')
        .in('wallet_id', walletIds);

    // Calculate balance per wallet
    const balanceMap: Record<string, number> = {};
    (txData || []).forEach(tx => {
        if (!balanceMap[tx.wallet_id]) balanceMap[tx.wallet_id] = 0;
        if (tx.type === 'income') {
            balanceMap[tx.wallet_id] += tx.amount;
        } else if (tx.type === 'expense') {
            balanceMap[tx.wallet_id] -= tx.amount;
        }
    });

    // Transform snake_case to camelCase
    return (walletData || []).map((w: {
        id: string;
        user_id: string;
        name: string;
        type: string;
        icon: string;
        color: string;
        initial_balance: number;
        is_active: boolean;
        created_at: string;
        updated_at: string;
    }) => {
        const txBalance = balanceMap[w.id] || 0;
        return {
            id: w.id,
            userId: w.user_id,
            name: w.name,
            type: w.type as Wallet['type'],
            icon: w.icon,
            color: w.color,
            initialBalance: w.initial_balance || 0,
            balance: (w.initial_balance || 0) + txBalance, // Actual calculated balance
            isActive: w.is_active,
            createdAt: w.created_at,
            updatedAt: w.updated_at,
        };
    });
}

export async function createWallet(wallet: Omit<Wallet, 'id' | 'createdAt' | 'updatedAt'>): Promise<Wallet> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('wallets')
        .insert({
            user_id: wallet.userId,
            name: wallet.name,
            type: wallet.type,
            icon: wallet.icon,
            color: wallet.color,
            initial_balance: wallet.balance || wallet.initialBalance || 0,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateWallet(id: string, updates: Partial<Wallet>): Promise<Wallet> {
    const supabase = await createClient();
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.icon !== undefined) updateData.icon = updates.icon;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.balance !== undefined) updateData.initial_balance = updates.balance;
    if (updates.initialBalance !== undefined) updateData.initial_balance = updates.initialBalance;

    const { data, error } = await supabase
        .from('wallets')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteWallet(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
        .from('wallets')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// ============ CREDIT CARDS ============

export async function getCreditCards(userId: string): Promise<CreditCard[]> {
    const supabase = await createClient();

    // Get cards
    const { data: cards, error: cardsError } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    if (cardsError) throw cardsError;

    // Get transactions for these cards to calculate dynamic balance
    const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('credit_card_id, type, amount')
        .eq('user_id', userId)
        .in('type', ['credit_expense', 'credit_payment'])
        .not('credit_card_id', 'is', null);

    if (txError) throw txError;

    // Calculate balances
    const balances: Record<string, number> = {};
    (transactions || []).forEach((tx: any) => {
        if (!balances[tx.credit_card_id]) balances[tx.credit_card_id] = 0;

        if (tx.type === 'credit_expense') {
            balances[tx.credit_card_id] += tx.amount;
        } else if (tx.type === 'credit_payment') {
            balances[tx.credit_card_id] -= tx.amount;
        }
    });

    // Transform and inject balance
    return (cards || []).map((c: any) => ({
        id: c.id,
        userId: c.user_id,
        name: c.name,
        limit: c.credit_limit,
        currentBalance: balances[c.id] || 0, // Dynamic balance
        billingDate: c.billing_date,
        dueDate: c.due_date,
        color: c.color,
        lastFourDigits: c.last_four_digits,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
    }));
}

export async function createCreditCard(card: Omit<CreditCard, 'id' | 'createdAt' | 'updatedAt'>): Promise<CreditCard> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('credit_cards')
        .insert({
            user_id: card.userId,
            name: card.name,
            credit_limit: card.limit,
            billing_date: card.billingDate || 1,
            due_date: card.dueDate || 15,
            color: card.color || '#ffffff',
            last_four_digits: '0000',
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateCreditCard(id: string, updates: Partial<CreditCard>): Promise<CreditCard> {
    const supabase = await createClient();
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.limit !== undefined) updateData.credit_limit = updates.limit;
    if (updates.billingDate !== undefined) updateData.billing_date = updates.billingDate;
    if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
    if (updates.color !== undefined) updateData.color = updates.color;

    const { data, error } = await supabase
        .from('credit_cards')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteCreditCard(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
        .from('credit_cards')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// ============ CATEGORIES ============

export async function getCategories(userId: string): Promise<Category[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

    if (error) throw error;

    // Transform snake_case to camelCase
    return (data || []).map((c: {
        id: string;
        user_id: string;
        name: string;
        icon: string;
        color: string;
        type: string;
        parent_id: string | null;
        budget: number | null;
        created_at: string;
    }) => ({
        id: c.id,
        userId: c.user_id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        type: c.type as 'income' | 'expense',
        parentId: c.parent_id,
        budgetMonthly: c.budget,
        createdAt: c.created_at,
    }));
}

export async function createCategory(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('categories')
        .insert({
            user_id: category.userId,
            name: category.name,
            icon: category.icon,
            color: category.color,
            type: category.type,
            parent_id: category.parentId,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

// ============ TRANSACTIONS ============

export async function getTransactions(userId: string, limit?: number): Promise<Transaction[]> {
    const supabase = await createClient();
    let query = supabase
        .from('transactions')
        .select(`
      *,
      category:categories(name, icon)
    `)
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

    if (limit) {
        query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transform snake_case to camelCase
    return (data || []).map((t: any) => ({
        id: t.id,
        userId: t.user_id,
        date: t.date,
        amount: t.amount,
        type: t.type,
        description: t.description,
        notes: t.notes,
        walletId: t.wallet_id,
        categoryId: t.category_id,
        creditCardId: t.credit_card_id,
        fromWalletId: t.from_wallet_id,
        toWalletId: t.to_wallet_id,
        isInstallment: t.is_installment,
        installmentTotal: t.installment_total,
        installmentCurrent: t.installment_current,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
    }));
}

export async function getTransactionsByMonth(userId: string, year: number, month: number): Promise<Transaction[]> {
    const supabase = await createClient();
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('transactions')
        .select(`
      *,
      category:categories(name, icon)
    `)
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

    if (error) throw error;

    // Transform snake_case to camelCase
    return (data || []).map((t: any) => ({
        id: t.id,
        userId: t.user_id,
        date: t.date,
        amount: t.amount,
        type: t.type,
        description: t.description,
        notes: t.notes,
        walletId: t.wallet_id,
        categoryId: t.category_id,
        creditCardId: t.credit_card_id,
        fromWalletId: t.from_wallet_id,
        toWalletId: t.to_wallet_id,
        isInstallment: t.is_installment,
        installmentTotal: t.installment_total,
        installmentCurrent: t.installment_current,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
    }));
}

export async function createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    const supabase = await createClient();

    // Validate UUIDs - don't insert non-UUID values
    const walletId = transaction.walletId && isValidUUID(transaction.walletId) ? transaction.walletId : null;
    const categoryId = transaction.categoryId && isValidUUID(transaction.categoryId) ? transaction.categoryId : null;
    const creditCardId = transaction.creditCardId && isValidUUID(transaction.creditCardId) ? transaction.creditCardId : null;
    const fromWalletId = transaction.fromWalletId && isValidUUID(transaction.fromWalletId) ? transaction.fromWalletId : null;
    const toWalletId = transaction.toWalletId && isValidUUID(transaction.toWalletId) ? transaction.toWalletId : null;

    const { data, error } = await supabase
        .from('transactions')
        .insert({
            user_id: transaction.userId,
            wallet_id: walletId,
            category_id: categoryId,
            credit_card_id: creditCardId,
            type: transaction.type,
            amount: transaction.amount,
            description: transaction.description,
            date: transaction.date,
            notes: transaction.notes,
            from_wallet_id: fromWalletId,
            to_wallet_id: toWalletId,
            is_installment: transaction.isInstallment,
            installment_total: transaction.installmentTotal,
            installment_current: transaction.installmentCurrent,
        })
        .select()
        .single();

    if (error) throw error;

    // Update wallet balance based on transaction type
    if (walletId && (transaction.type === 'income' || transaction.type === 'expense' || transaction.type === 'credit_payment')) {
        // Get current wallet balance
        const { data: wallet } = await supabase
            .from('wallets')
            .select('initial_balance')
            .eq('id', walletId)
            .single();

        if (wallet) {
            const currentBalance = wallet.initial_balance || 0;
            const newBalance = transaction.type === 'income'
                ? currentBalance + transaction.amount
                : currentBalance - transaction.amount;

            await supabase
                .from('wallets')
                .update({ initial_balance: newBalance })
                .eq('id', walletId);
        }
    }

    // Handle transfer - deduct from source, add to destination
    if (transaction.type === 'transfer' && fromWalletId && toWalletId) {
        // Deduct from source wallet
        const { data: fromWallet } = await supabase
            .from('wallets')
            .select('initial_balance')
            .eq('id', fromWalletId)
            .single();

        if (fromWallet) {
            await supabase
                .from('wallets')
                .update({ initial_balance: (fromWallet.initial_balance || 0) - transaction.amount })
                .eq('id', fromWalletId);
        }

        // Add to destination wallet
        const { data: toWallet } = await supabase
            .from('wallets')
            .select('initial_balance')
            .eq('id', toWalletId)
            .single();

        if (toWallet) {
            await supabase
                .from('wallets')
                .update({ initial_balance: (toWallet.initial_balance || 0) + transaction.amount })
                .eq('id', toWalletId);
        }
    }

    return data;
}

// Helper function to validate UUID
function isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
}

export async function deleteTransaction(id: string): Promise<void> {
    const supabase = await createClient();

    // First, get the transaction to restore wallet balance
    const { data: tx } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single();

    if (tx) {
        // Restore wallet balance based on transaction type
        if (tx.wallet_id && (tx.type === 'income' || tx.type === 'expense' || tx.type === 'credit_payment')) {
            const { data: wallet } = await supabase
                .from('wallets')
                .select('initial_balance')
                .eq('id', tx.wallet_id)
                .single();

            if (wallet) {
                // Reverse the original transaction effect
                const newBalance = tx.type === 'income'
                    ? (wallet.initial_balance || 0) - tx.amount  // Undo income: subtract
                    : (wallet.initial_balance || 0) + tx.amount; // Undo expense/payment: add back

                await supabase
                    .from('wallets')
                    .update({ initial_balance: newBalance })
                    .eq('id', tx.wallet_id);
            }
        }

        // Handle transfer reversal
        if (tx.type === 'transfer') {
            // Add back to source wallet
            if (tx.from_wallet_id) {
                const { data: fromWallet } = await supabase
                    .from('wallets')
                    .select('initial_balance')
                    .eq('id', tx.from_wallet_id)
                    .single();

                if (fromWallet) {
                    await supabase
                        .from('wallets')
                        .update({ initial_balance: (fromWallet.initial_balance || 0) + tx.amount })
                        .eq('id', tx.from_wallet_id);
                }
            }

            // Subtract from destination wallet
            if (tx.to_wallet_id) {
                const { data: toWallet } = await supabase
                    .from('wallets')
                    .select('initial_balance')
                    .eq('id', tx.to_wallet_id)
                    .single();

                if (toWallet) {
                    await supabase
                        .from('wallets')
                        .update({ initial_balance: (toWallet.initial_balance || 0) - tx.amount })
                        .eq('id', tx.to_wallet_id);
                }
            }
        }
    }

    // Now delete the transaction
    const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// ============ SUMMARY ============

export async function getMonthlySummary(userId: string, year: number, month: number) {
    const supabase = await createClient();
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate);

    if (error) throw error;

    type TxRecord = { type: string; amount: number };
    const income = (data || [])
        .filter((t: TxRecord) => t.type === 'income')
        .reduce((sum: number, t: TxRecord) => sum + t.amount, 0);

    const expense = (data || [])
        .filter((t: TxRecord) => t.type === 'expense' || t.type === 'credit_expense')
        .reduce((sum: number, t: TxRecord) => sum + t.amount, 0);

    return { income, expense, net: income - expense };
}

export async function getCategorySummary(userId: string, year: number, month: number) {
    const supabase = await createClient();
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
