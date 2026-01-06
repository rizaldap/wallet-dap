import Dexie, { type EntityTable } from 'dexie';
import type { Wallet, CreditCard, Category, Transaction, ScheduledIncome } from '@/types';

// Dexie database for local caching
const db = new Dexie('WalletDapCache') as Dexie & {
    wallets: EntityTable<Wallet, 'id'>;
    creditCards: EntityTable<CreditCard, 'id'>;
    categories: EntityTable<Category, 'id'>;
    transactions: EntityTable<Transaction, 'id'>;
    scheduledIncomes: EntityTable<ScheduledIncome, 'id'>;
};

db.version(1).stores({
    wallets: 'id, user_id, name, type, is_active',
    creditCards: 'id, user_id, name, is_active',
    categories: 'id, user_id, name, type, parent_id',
    transactions: 'id, user_id, date, type, wallet_id, category_id, credit_card_id',
    scheduledIncomes: 'id, user_id, wallet_id, is_active',
});

export { db };

// Cache operations
export const cache = {
    // Wallets
    async getWallets(userId: string): Promise<Wallet[]> {
        return db.wallets.where('user_id').equals(userId).toArray();
    },

    async setWallets(wallets: Wallet[]): Promise<void> {
        await db.wallets.bulkPut(wallets);
    },

    async clearWallets(userId: string): Promise<void> {
        await db.wallets.where('user_id').equals(userId).delete();
    },

    // Credit Cards
    async getCreditCards(userId: string): Promise<CreditCard[]> {
        return db.creditCards.where('user_id').equals(userId).toArray();
    },

    async setCreditCards(creditCards: CreditCard[]): Promise<void> {
        await db.creditCards.bulkPut(creditCards);
    },

    // Categories
    async getCategories(userId: string): Promise<Category[]> {
        return db.categories.where('user_id').equals(userId).toArray();
    },

    async setCategories(categories: Category[]): Promise<void> {
        await db.categories.bulkPut(categories);
    },

    // Transactions
    async getTransactions(userId: string): Promise<Transaction[]> {
        return db.transactions.where('user_id').equals(userId).sortBy('date');
    },

    async setTransactions(transactions: Transaction[]): Promise<void> {
        await db.transactions.bulkPut(transactions);
    },

    async addTransaction(transaction: Transaction): Promise<void> {
        await db.transactions.put(transaction);
    },

    // Clear all cache
    async clearAll(): Promise<void> {
        await Promise.all([
            db.wallets.clear(),
            db.creditCards.clear(),
            db.categories.clear(),
            db.transactions.clear(),
            db.scheduledIncomes.clear(),
        ]);
    },
};
