'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/providers/SessionProvider';
import type { Goal, GoalBudget, GoalContribution, GoalActivity } from '@/lib/supabase/goals';
import type { GoldHolding, GoldTransaction } from '@/lib/supabase/gold';

// ============ GOALS HOOK ============

export function useGoals() {
    const { user } = useAuth();
    const [goals, setGoals] = useState<Goal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isAuthenticated = !!user;

    const refresh = useCallback(async () => {
        if (!isAuthenticated) return;
        setLoading(true);
        try {
            const res = await fetch('/api/goals');
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to fetch');
            setGoals(json.data || []);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load goals');
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const create = async (goal: {
        name: string;
        icon?: string;
        color?: string;
        targetAmount: number;
        deadline?: string;
        description?: string;
    }) => {
        if (!isAuthenticated) return;
        await fetch('/api/goals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(goal),
        });
        await refresh();
    };

    const update = async (id: string, updates: Partial<Goal>) => {
        await fetch('/api/goals', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...updates }),
        });
        await refresh();
    };

    const remove = async (id: string) => {
        await fetch(`/api/goals?id=${id}`, { method: 'DELETE' });
        await refresh();
    };

    return { goals, loading, error, refresh, create, update, remove };
}

export function useGoal(id: string) {
    const { user } = useAuth();
    const [goal, setGoal] = useState<Goal | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isAuthenticated = !!user;

    const refresh = useCallback(async () => {
        if (!isAuthenticated || !id) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/goals?id=${id}`);
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to fetch goal');
            setGoal(json.data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load goal');
            setGoal(null);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, id]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const update = async (updates: Partial<Goal>) => {
        if (!id) return;
        await fetch('/api/goals', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...updates }),
        });
        await refresh();
    };

    return { goal, loading, error, refresh, update };
}

// ============ GOAL BUDGETS HOOK ============

export function useGoalBudgets(goalId: string) {
    const { user } = useAuth();
    const [budgets, setBudgets] = useState<GoalBudget[]>([]);
    const [loading, setLoading] = useState(true);

    const isAuthenticated = !!user;

    const refresh = useCallback(async () => {
        if (!isAuthenticated || !goalId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/goals/${goalId}/budgets`);
            const json = await res.json();
            setBudgets(json.data || []);
        } catch (err) {
            console.error('Failed to load budgets:', err);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, goalId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const create = async (budget: {
        name: string;
        amount: number;
        vendor?: string;
        dueDate?: string;
        notes?: string;
        description?: string;
        priority?: string;
    }) => {
        await fetch(`/api/goals/${goalId}/budgets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(budget),
        });
        await refresh();
    };

    const pay = async (budgetId: string, amount: number, notes?: string) => {
        const res = await fetch(`/api/goals/${goalId}/budgets/pay`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ budgetId, amount, notes }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Payment failed');
        await refresh();
    };

    const update = async (budgetId: string, updates: Partial<GoalBudget>) => {
        await fetch(`/api/goals/${goalId}/budgets`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ budgetId, ...updates }),
        });
        await refresh();
    };

    const remove = async (budgetId: string) => {
        await fetch(`/api/goals/${goalId}/budgets?budgetId=${budgetId}`, { method: 'DELETE' });
        await refresh();
    };

    const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
    const totalPaid = budgets.reduce((sum, b) => sum + b.paid_amount, 0);

    return { budgets, loading, refresh, create, update, remove, pay, totalBudget, totalPaid };
}

// ============ GOAL CONTRIBUTIONS HOOK ============

export function useGoalContributions(goalId: string) {
    const { user } = useAuth();
    const [contributions, setContributions] = useState<GoalContribution[]>([]);
    const [loading, setLoading] = useState(true);

    const isAuthenticated = !!user;

    const refresh = useCallback(async () => {
        if (!isAuthenticated || !goalId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/goals/${goalId}/contributions`);
            const json = await res.json();
            setContributions(json.data || []);
        } catch (err) {
            console.error('Failed to load contributions:', err);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, goalId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const add = async (contribution: {
        amount: number;
        walletId: string;
        notes?: string;
    }) => {
        await fetch(`/api/goals/${goalId}/contributions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(contribution),
        });
        await refresh();
    };

    const total = contributions.reduce((sum, c) => sum + c.amount, 0);

    return { contributions, loading, refresh, add, total };
}

// ============ GOAL MEMBERS HOOK ============

export function useGoalMembers(goalId: string) {
    const { user } = useAuth();
    const [members, setMembers] = useState<any[]>([]); // Type should be imported if available
    const [loading, setLoading] = useState(true);

    const isAuthenticated = !!user;

    const refresh = useCallback(async () => {
        if (!isAuthenticated || !goalId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/goals/${goalId}/members`);
            const json = await res.json();
            setMembers(json.data || []);
        } catch (err) {
            console.error('Failed to load members:', err);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, goalId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const invite = async (email: string, role: string) => {
        await fetch(`/api/goals/${goalId}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, role }),
        });
        await refresh();
    };

    const remove = async (userId: string) => {
        await fetch(`/api/goals/${goalId}/members?userId=${userId}`, { method: 'DELETE' });
        await refresh();
    };

    return { members, loading, refresh, invite, remove };
}

// ============ GOAL ACTIVITIES HOOK ============

export function useGoalBalance(goalId: string) {
    const { user } = useAuth();
    const [balance, setBalance] = useState<{ totalContributed: number; totalPaid: number; availableBalance: number } | null>(null);
    const [loading, setLoading] = useState(true);

    const isAuthenticated = !!user;

    const refresh = useCallback(async () => {
        if (!isAuthenticated || !goalId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/goals/${goalId}/balance`);
            const json = await res.json();
            setBalance(json.data || null);
        } catch (err) {
            console.error('Failed to load balance:', err);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, goalId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { balance, loading, refresh };
}

export function useGoalActivities(goalId: string) {
    const { user } = useAuth();
    const [activities, setActivities] = useState<GoalActivity[]>([]);
    const [loading, setLoading] = useState(true);

    const isAuthenticated = !!user;

    const refresh = useCallback(async () => {
        if (!isAuthenticated || !goalId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/goals/${goalId}/activities`);
            const json = await res.json();
            setActivities(json.data || []);
        } catch (err) {
            console.error('Failed to load activities:', err);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, goalId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { activities, loading, refresh };
}

// ============ GOLD HOOKS ============

interface GoldSummary {
    holdings: GoldHolding[];
    totalGrams: number;
    holdingCount: number;
}

export function useGold() {
    const { user } = useAuth();
    const [summary, setSummary] = useState<GoldSummary>({ holdings: [], totalGrams: 0, holdingCount: 0 });
    const [transactions, setTransactions] = useState<GoldTransaction[]>([]);
    const [loading, setLoading] = useState(true);

    const isAuthenticated = !!user;

    const refresh = useCallback(async () => {
        if (!isAuthenticated) return;
        setLoading(true);
        try {
            const [holdingsRes, txRes] = await Promise.all([
                fetch('/api/gold'),
                fetch('/api/gold/transactions'),
            ]);
            const holdingsJson = await holdingsRes.json();
            const txJson = await txRes.json();
            setSummary(holdingsJson.data || { holdings: [], totalGrams: 0, holdingCount: 0 });
            setTransactions(txJson.data || []);
        } catch (err) {
            console.error('Failed to load gold data:', err);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const buy = async (data: {
        platform: string;
        grams: number;
        pricePerGram: number;
        walletId: string;
        notes?: string;
        date?: string;
    }) => {
        await fetch('/api/gold/buy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        await refresh();
    };

    const sell = async (data: {
        holdingId: string;
        grams: number;
        pricePerGram: number;
        walletId: string;
        notes?: string;
        date?: string;
    }) => {
        await fetch('/api/gold/sell', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        await refresh();
    };

    return { summary, transactions, loading, refresh, buy, sell };
}

// Re-export types for convenience
export type { Goal, GoalBudget, GoalContribution, GoalActivity, GoldHolding, GoldTransaction };
