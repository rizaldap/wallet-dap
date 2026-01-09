'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/providers/SessionProvider';
import type { Wallet, CreditCard, Transaction, Category } from '@/types';

// ============ WALLETS HOOK ============

export function useWallets() {
    const { user } = useAuth();
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isAuthenticated = !!user;

    const refresh = useCallback(async () => {
        if (!isAuthenticated) return;
        setLoading(true);
        try {
            const res = await fetch('/api/wallets');
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to fetch');
            setWallets(json.data || []);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load wallets');
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const create = async (wallet: Omit<Wallet, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
        if (!isAuthenticated) return;
        await fetch('/api/wallets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(wallet),
        });
        await refresh();
    };

    const remove = async (id: string) => {
        await fetch(`/api/wallets?id=${id}`, { method: 'DELETE' });
        await refresh();
    };

    const totalBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);

    return { wallets, loading, error, refresh, create, remove, totalBalance };
}

// ============ CREDIT CARDS HOOK ============

export function useCreditCards() {
    const { user } = useAuth();
    const [cards, setCards] = useState<CreditCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isAuthenticated = !!user;

    const refresh = useCallback(async () => {
        if (!isAuthenticated) return;
        setLoading(true);
        try {
            const res = await fetch('/api/credit-cards');
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to fetch');
            setCards(json.data || []);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load credit cards');
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const create = async (card: Omit<CreditCard, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
        if (!isAuthenticated) return;
        await fetch('/api/credit-cards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(card),
        });
        await refresh();
    };

    const remove = async (id: string) => {
        await fetch(`/api/credit-cards?id=${id}`, { method: 'DELETE' });
        await refresh();
    };

    const totalBalance = cards.reduce((sum, c) => sum + (c.currentBalance || 0), 0);
    const totalLimit = cards.reduce((sum, c) => sum + (c.limit || 0), 0);

    return { cards, loading, error, refresh, create, remove, totalBalance, totalLimit };
}

// ============ TRANSACTIONS HOOK ============

export function useTransactions(limit?: number) {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isAuthenticated = !!user;

    const refresh = useCallback(async () => {
        if (!isAuthenticated) return;
        setLoading(true);
        try {
            const url = limit ? `/api/transactions?limit=${limit}` : '/api/transactions';
            const res = await fetch(url);
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to fetch');
            setTransactions(json.data || []);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load transactions');
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, limit]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const create = async (tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
        if (!isAuthenticated) return;
        await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tx),
        });
        await refresh();
    };

    const remove = async (id: string) => {
        await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
        await refresh();
    };

    return { transactions, loading, error, refresh, create, remove };
}

// ============ CATEGORIES HOOK ============

export function useCategories() {
    const { user } = useAuth();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isAuthenticated = !!user;

    const refresh = useCallback(async () => {
        if (!isAuthenticated) return;
        setLoading(true);
        try {
            const res = await fetch('/api/categories');
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to fetch');
            setCategories(json.data || []);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load categories');
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const create = async (cat: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
        if (!isAuthenticated) return;
        await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cat),
        });
        await refresh();
    };

    const incomeCategories = categories.filter(c => c.type === 'income');
    const expenseCategories = categories.filter(c => c.type === 'expense');

    return { categories, incomeCategories, expenseCategories, loading, error, refresh, create };
}

// ============ SUMMARY HOOK ============

export function useMonthlySummary() {
    const { user } = useAuth();
    const [summary, setSummary] = useState({ income: 0, expense: 0, net: 0 });
    const [loading, setLoading] = useState(true);

    const isAuthenticated = !!user;

    useEffect(() => {
        if (!isAuthenticated) return;

        const now = new Date();
        fetch(`/api/summary?type=monthly&year=${now.getFullYear()}&month=${now.getMonth() + 1}`)
            .then(res => res.json())
            .then(json => setSummary(json.data || { income: 0, expense: 0, net: 0 }))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [isAuthenticated]);

    return { ...summary, loading };
}

export function useCategorySummary() {
    const { user } = useAuth();
    const [categories, setCategories] = useState<{ name: string; icon: string; total: number }[]>([]);
    const [loading, setLoading] = useState(true);

    const isAuthenticated = !!user;

    useEffect(() => {
        if (!isAuthenticated) return;

        const now = new Date();
        fetch(`/api/summary?type=category&year=${now.getFullYear()}&month=${now.getMonth() + 1}`)
            .then(res => res.json())
            .then(json => setCategories(json.data || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [isAuthenticated]);

    return { categories, loading };
}
