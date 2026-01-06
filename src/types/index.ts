// Wallet-Dap Types - Using camelCase for frontend

export type WalletType = 'bank' | 'e-wallet' | 'cash' | 'investment';

export interface Wallet {
    id: string;
    userId: string;
    name: string;
    type: WalletType;
    icon: string;
    color: string;
    initialBalance: number;
    balance: number;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreditCard {
    id: string;
    userId: string;
    name: string;
    limit: number;
    currentBalance: number;
    billingDate: number;
    dueDate: number;
    color: string;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export type TransactionType = 'income' | 'expense' | 'transfer' | 'credit_expense' | 'credit_payment';

export interface Category {
    id: string;
    userId: string;
    name: string;
    icon: string;
    color: string;
    type: 'income' | 'expense';
    parentId?: string | null;
    budgetMonthly?: number | null;
    createdAt?: string;
}

export interface Transaction {
    id: string;
    userId: string;
    date: string;
    amount: number;
    type: TransactionType;
    description: string;
    notes?: string | null;

    // Relational IDs
    walletId?: string | null;
    categoryId?: string | null;
    creditCardId?: string | null;

    // For transfer
    fromWalletId?: string | null;
    toWalletId?: string | null;

    // Installment
    isInstallment?: boolean;
    installmentTotal?: number | null;
    installmentCurrent?: number | null;

    createdAt?: string;
    updatedAt?: string;
}

export interface ScheduledIncome {
    id: string;
    userId: string;
    name: string;
    amount: number;
    walletId: string;
    dayOfMonth: number;
    isActive: boolean;
    createdAt?: string;
}

// Summary types for dashboard
export interface MonthlySummary {
    month: string;
    totalIncome: number;
    totalExpense: number;
    balance: number;
}

export interface CategorySummary {
    categoryId: string;
    categoryName: string;
    categoryIcon: string;
    categoryColor: string;
    total: number;
    percentage: number;
}

// Currency formatter
export const formatRupiah = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};
