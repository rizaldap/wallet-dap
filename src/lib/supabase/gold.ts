import { createClient } from './server';
import { createTransaction } from './data';

// ============ TYPES ============

export interface GoldHolding {
    id: string;
    user_id: string;
    platform: string;
    total_grams: number;
    created_at: string;
    updated_at: string;
}

export interface GoldTransaction {
    id: string;
    user_id: string;
    holding_id: string;
    type: 'buy' | 'sell';
    grams: number;
    price_per_gram: number;
    total_amount: number;
    wallet_id: string;
    transaction_id: string | null;
    notes: string | null;
    date: string;
    created_at: string;
    wallet?: { name: string; icon: string };
    holding?: { platform: string };
}

// ============ GOLD HOLDINGS ============

export async function getGoldHoldings(userId: string): Promise<GoldHolding[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('gold_holdings')
        .select('*')
        .eq('user_id', userId)
        .order('platform', { ascending: true });

    if (error) throw error;
    return data || [];
}

export async function getOrCreateHolding(userId: string, platform: string): Promise<GoldHolding> {
    const supabase = await createClient();
    // Try to get existing
    const { data: existing } = await supabase
        .from('gold_holdings')
        .select('*')
        .eq('user_id', userId)
        .eq('platform', platform)
        .single();

    if (existing) return existing;

    // Create new
    const { data, error } = await supabase
        .from('gold_holdings')
        .insert({
            user_id: userId,
            platform,
            total_grams: 0,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

// ============ GOLD TRANSACTIONS ============

export async function getGoldTransactions(userId: string, limit = 50): Promise<GoldTransaction[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('gold_transactions')
        .select(`
      *,
      wallet:wallets(name, icon),
      holding:gold_holdings(platform)
    `)
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data || [];
}

// Helper to get or create 'Investasi' category
async function getOrCreateInvestmentCategory(userId: string, type: 'income' | 'expense'): Promise<string> {
    const supabase = await createClient();

    // 1. Try to find existing "Investasi" category of correct type
    const { data: existing } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', userId)
        .eq('name', 'Investasi')
        .eq('type', type)
        .single();

    if (existing) return existing.id;

    // 2. If not found, create it
    const { data: newCategory, error } = await supabase
        .from('categories')
        .insert({
            user_id: userId,
            name: 'Investasi',
            type: type,
            icon: '📈',
            color: '#10B981', // Emerald-500
        })
        .select('id')
        .single();

    if (error) throw error;
    return newCategory.id;
}

export async function buyGold(params: {
    user_id: string;
    platform: string;
    grams: number;
    price_per_gram: number;
    wallet_id: string;
    notes?: string;
    date?: string;
}): Promise<GoldTransaction> {
    const supabase = await createClient();
    const totalAmount = params.grams * params.price_per_gram;
    const date = params.date || new Date().toISOString().split('T')[0];

    // 1. Get or create holding
    const holding = await getOrCreateHolding(params.user_id, params.platform);

    // 1b. Get investment category
    const categoryId = await getOrCreateInvestmentCategory(params.user_id, 'expense');

    // 2. Create expense transaction in wallet (updates wallet balance)
    const txData = await createTransaction({
        userId: params.user_id,
        walletId: params.wallet_id,
        type: 'expense',
        amount: totalAmount,
        description: `Beli Emas ${params.grams}g - ${params.platform}`,
        date,
        notes: params.notes,
        categoryId: categoryId,
        creditCardId: undefined,
        fromWalletId: undefined,
        toWalletId: undefined,
        isInstallment: false,
        installmentTotal: undefined,
        installmentCurrent: undefined
    });

    // 3. Create gold transaction
    const { data, error } = await supabase
        .from('gold_transactions')
        .insert({
            user_id: params.user_id,
            holding_id: holding.id,
            type: 'buy',
            grams: params.grams,
            price_per_gram: params.price_per_gram,
            total_amount: totalAmount,
            wallet_id: params.wallet_id,
            transaction_id: txData.id,
            notes: params.notes,
            date,
        })
        .select()
        .single();

    if (error) throw error;

    // 4. Update holding total_grams
    await supabase
        .from('gold_holdings')
        .update({ total_grams: holding.total_grams + params.grams })
        .eq('id', holding.id);

    return data;
}

export async function sellGold(params: {
    user_id: string;
    holding_id: string;
    grams: number;
    price_per_gram: number;
    wallet_id: string;
    notes?: string;
    date?: string;
}): Promise<GoldTransaction> {
    const supabase = await createClient();
    const totalAmount = params.grams * params.price_per_gram;
    const date = params.date || new Date().toISOString().split('T')[0];

    // 1. Get holding
    const { data: holding, error: holdingError } = await supabase
        .from('gold_holdings')
        .select('*')
        .eq('id', params.holding_id)
        .single();

    if (holdingError) throw holdingError;
    if (holding.total_grams < params.grams) {
        throw new Error('Insufficient gold balance');
    }

    // 1b. Get investment category
    const categoryId = await getOrCreateInvestmentCategory(params.user_id, 'income');

    // 2. Create income transaction in wallet (updates wallet balance)
    const txData = await createTransaction({
        userId: params.user_id,
        walletId: params.wallet_id,
        type: 'income',
        amount: totalAmount,
        description: `Jual Emas ${params.grams}g - ${holding.platform}`,
        date,
        notes: params.notes,
        categoryId: categoryId,
        creditCardId: undefined,
        fromWalletId: undefined,
        toWalletId: undefined,
        isInstallment: false,
        installmentTotal: undefined,
        installmentCurrent: undefined
    });

    // 3. Create gold transaction
    const { data, error } = await supabase
        .from('gold_transactions')
        .insert({
            user_id: params.user_id,
            holding_id: params.holding_id,
            type: 'sell',
            grams: params.grams,
            price_per_gram: params.price_per_gram,
            total_amount: totalAmount,
            wallet_id: params.wallet_id,
            transaction_id: txData.id,
            notes: params.notes,
            date,
        })
        .select()
        .single();

    if (error) throw error;

    // 4. Update holding total_grams
    await supabase
        .from('gold_holdings')
        .update({ total_grams: holding.total_grams - params.grams })
        .eq('id', params.holding_id);

    return data;
}

// ============ SUMMARY ============

export async function getGoldSummary(userId: string) {
    // Note: getGoldHoldings already creates its own client
    const holdings = await getGoldHoldings(userId);

    const totalGrams = holdings.reduce((sum, h) => sum + h.total_grams, 0);

    return {
        holdings,
        totalGrams,
        holdingCount: holdings.length,
    };
}
