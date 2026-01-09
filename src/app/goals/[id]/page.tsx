'use client';

import React, { useState, useEffect } from 'react';
import { useGoal, useGoalBudgets, useGoalContributions, useGoalMembers, useGoalActivities, useGoalBalance } from '@/lib/hooks/useGoals';
import { useAuth } from '@/components/providers/SessionProvider';
import { useWallets } from '@/lib/hooks/useData';
import { GoalBudget } from '@/lib/supabase/goals';
import { createClient } from '@/lib/supabase/browser';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft, Target, Calendar, TrendingUp, Plus,
    Edit2, Check, X, AlertCircle, ShoppingBag, PiggyBank,
    Users, Activity, Wallet, Mail, CheckCircle2, Link, Copy
} from 'lucide-react';
import confetti from 'canvas-confetti';

const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(number);
};

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string, children: React.ReactNode }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/85 backdrop-blur-xl transition-opacity" onClick={onClose}></div>
            <div className="relative w-full max-w-xl bg-gradient-to-b from-zinc-800 to-zinc-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="px-10 py-8 border-b border-white/10 flex justify-between items-center bg-black/30 sticky top-0 z-10">
                    <h3 className="text-2xl font-bold text-white tracking-tight">{title}</h3>
                    <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors rounded-full p-3 hover:bg-white/10 -mr-2">
                        <X size={24} />
                    </button>
                </div>
                {/* Content */}
                <div className="p-10">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default function GoalDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const { user } = useAuth();

    // Hooks
    const { goal, loading: goalLoading, error, update } = useGoal(id);
    const { budgets, create: createBudget, pay } = useGoalBudgets(id);
    const { contributions, add: addContribution } = useGoalContributions(id);
    const { wallets } = useWallets();

    // State
    const [activeTab, setActiveTab] = useState<'overview' | 'budgets' | 'contributions' | 'members'>('overview');
    const [isEditingTarget, setIsEditingTarget] = useState(false);
    const [editTargetAmount, setEditTargetAmount] = useState('');

    const { activities, refresh: refreshActivities } = useGoalActivities(id);
    const { members, refresh: refreshMembers, invite: inviteMember } = useGoalMembers(id);
    const { balance, refresh: refreshBalance } = useGoalBalance(id);
    const [celebrated, setCelebrated] = useState(false);

    // Modal States
    const [showBudgetModal, setShowBudgetModal] = useState(false);
    const [showContributionModal, setShowContributionModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Form States
    const [newBudgetName, setNewBudgetName] = useState('');
    const [newBudgetAmount, setNewBudgetAmount] = useState('');
    const [newBudgetDescription, setNewBudgetDescription] = useState('');
    const [newBudgetPriority, setNewBudgetPriority] = useState('medium');

    // Payment States
    const [selectedBudgetForPayment, setSelectedBudgetForPayment] = useState<GoalBudget | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [newContributionAmount, setNewContributionAmount] = useState('');
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [isGeneratingLink, setIsGeneratingLink] = useState(false);
    const [selectedWalletId, setSelectedWalletId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Invite States
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');

    useEffect(() => {
        if (goal) {
            setEditTargetAmount(goal.target_amount.toString());

            const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
            if (progress >= 100 && !celebrated) {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#60a5fa', '#a855f7', '#34d399', '#fbbf24']
                });
                setCelebrated(true);
            }
        }
    }, [goal, celebrated]);

    const handleSaveTarget = async () => {
        if (!goal) return;
        try {
            await update({ target_amount: parseFloat(editTargetAmount) });
            setIsEditingTarget(false);
        } catch (err) {
            console.error('Failed to update target:', err);
        }
    };

    const handleAddBudget = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBudgetName || !newBudgetAmount || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await createBudget({
                name: newBudgetName,
                amount: parseFloat(newBudgetAmount),
                description: newBudgetDescription,
                priority: newBudgetPriority,
            });
            setShowBudgetModal(false);
            setNewBudgetName('');
            setNewBudgetAmount('');
            setNewBudgetDescription('');
            setNewBudgetPriority('medium');
        } catch (error) {
            console.error('Failed to create budget:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBudgetForPayment || !paymentAmount || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await pay(selectedBudgetForPayment.id, parseFloat(paymentAmount), paymentNotes);
            setShowPaymentModal(false);
            setSelectedBudgetForPayment(null);
            setPaymentAmount('');
            setPaymentNotes('');
        } catch (error) {
            console.error('Payment failed:', error);
            alert("Failed to process payment. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveContribution = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedWalletId) {
            alert("Pilih wallet terlebih dahulu");
            return;
        }

        const amount = parseFloat(newContributionAmount);
        const selectedWallet = wallets.find(w => w.id === selectedWalletId);

        // Validate: Can't deposit more than wallet balance
        if (selectedWallet && amount > selectedWallet.balance) {
            alert(`Saldo wallet tidak cukup! Saldo tersedia: Rp ${selectedWallet.balance.toLocaleString('id-ID')}`);
            return;
        }

        if (amount <= 0) {
            alert("Jumlah harus lebih dari 0");
            return;
        }

        try {
            await addContribution({
                amount: amount,
                walletId: selectedWalletId,
            });
            setShowContributionModal(false);
            setNewContributionAmount('');
            setSelectedWalletId('');
        } catch (err) {
            console.error('Failed to create contribution:', err);
            alert("Gagal menambah deposit. Silakan coba lagi.");
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await inviteMember(inviteEmail, 'editor');
            setShowInviteModal(false);
            setInviteEmail('');
            alert("Invitation sent!");
        } catch (error) {
            console.error('Failed to invite member:', error);
            alert("Failed to invite member. Make sure the email is registered.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (goalLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                <p className="text-muted font-medium animate-pulse">Loading amazing things...</p>
            </div>
        );
    }

    if (error || !goal) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 text-red-500">
                    <AlertCircle size={40} />
                </div>
                <h2 className="text-2xl font-bold mb-2">Goal Not Found</h2>
                <button className="btn btn-primary mt-4" onClick={() => router.push('/goals')}>
                    <ArrowLeft size={18} className="mr-2" /> Back to Goals
                </button>
            </div>
        );
    }

    const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
    const remaining = Math.max(goal.target_amount - goal.current_amount, 0);

    // Tab Configuration
    const tabs = [
        { id: 'overview', icon: <Activity size={16} />, label: 'Overview' },
        { id: 'budgets', icon: <ShoppingBag size={16} />, label: 'Budgets' },
        { id: 'contributions', icon: <PiggyBank size={16} />, label: 'Deposits' },
        { id: 'members', icon: <Users size={16} />, label: 'Team' },
    ] as const;
    return (
        <div className="min-h-screen w-full bg-black/50">
            <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-10 lg:px-16 pb-24 pt-8">
                {/* Header Navigation */}
                <div className="mb-8">
                    <button
                        onClick={() => router.push('/goals')}
                        className="flex items-center text-zinc-400 hover:text-white transition-colors group"
                    >
                        <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-white/10 flex items-center justify-center mr-3 transition-colors">
                            <ArrowLeft size={16} />
                        </div>
                        <span className="font-medium">Back to Goals</span>
                    </button>
                </div>

                {/* Main Hero Card */}
                <div className="glass-card p-10 md:p-14 mb-12 relative overflow-hidden group border-blue-500/20 shadow-blue-900/10 shadow-xl">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

                    <div className="relative z-10">
                        {/* Title Section */}
                        <div className="flex flex-col md:flex-row justify-between md:items-start gap-8 mb-10">
                            <div className="flex items-start gap-6">
                                <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-zinc-800/80 flex items-center justify-center text-4xl md:text-5xl shadow-inner border border-white/5 shrink-0">
                                    {goal.icon}
                                </div>
                                <div>
                                    <h1 className="text-3xl md:text-5xl font-bold text-white mb-3 tracking-tight">{goal.name}</h1>
                                    <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
                                        <span className={`px-3 py-1 rounded-full border text-xs font-semibold uppercase tracking-wider ${goal.status === 'active' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-zinc-800 text-zinc-400'
                                            }`}>
                                            {goal.status}
                                        </span>
                                        {goal.deadline && (
                                            <span className="flex items-center gap-1.5 bg-zinc-800/50 px-3 py-1 rounded-full border border-white/5">
                                                <Calendar size={14} />
                                                {new Date(goal.deadline).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-zinc-900/60 rounded-2xl p-6 border border-white/10 backdrop-blur-sm min-w-[260px] shadow-lg">
                                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2 font-semibold">Current Savings</div>
                                <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 truncate tracking-tight">
                                    {formatRupiah(goal.current_amount)}
                                </div>
                            </div>
                        </div>

                        {/* Progress Section */}
                        <div className="mb-2">
                            <div className="flex justify-between items-end mb-4">
                                <span className="text-sm font-medium text-white/80">Progress to Target</span>
                                <div className="flex items-center gap-2">
                                    {isEditingTarget ? (
                                        <div className="flex items-center gap-2 bg-zinc-900/80 p-1.5 rounded-lg border border-blue-500/30">
                                            <span className="text-xs text-zinc-500 pl-2">Target:</span>
                                            <input
                                                type="number"
                                                value={editTargetAmount}
                                                onChange={(e) => setEditTargetAmount(e.target.value)}
                                                className="w-36 bg-transparent border-none text-white text-right focus:ring-0 focus:outline-none font-mono text-lg"
                                                autoFocus
                                            />
                                            <button onClick={handleSaveTarget} className="w-8 h-8 flex items-center justify-center rounded bg-green-500/20 text-green-500 hover:bg-green-500/30 transition-colors"><Check size={16} /></button>
                                            <button onClick={() => setIsEditingTarget(false)} className="w-8 h-8 flex items-center justify-center rounded bg-red-500/20 text-red-500 hover:bg-red-500/30 transition-colors"><X size={16} /></button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setIsEditingTarget(true)}
                                            className="group/edit flex items-center gap-3 text-zinc-400 hover:text-white transition-colors bg-zinc-900/30 hover:bg-zinc-900/50 px-4 py-2 rounded-lg border border-transparent hover:border-white/10"
                                        >
                                            <span className="text-sm">Target: <span className="font-mono text-zinc-300 text-base ml-1">{formatRupiah(goal.target_amount)}</span></span>
                                            <Edit2 size={14} className="opacity-50 group-hover/edit:opacity-100 transition-opacity" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Progress Bar Section */}
                            {(() => {
                                const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
                                const totalPaid = budgets.reduce((sum, b) => sum + b.paid_amount, 0);
                                const budgetProgress = totalBudget > 0 ? Math.min((totalPaid / totalBudget) * 100, 100) : 0;

                                return (
                                    <div className="mt-10 pt-8 border-t border-white/10 space-y-6">
                                        {/* Savings Progress */}
                                        <div>
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                                    💰 Deposit Progress
                                                </span>
                                                <span className={`text-lg font-bold ${progress >= 100 ? 'text-green-400' : 'text-emerald-400'}`}>
                                                    {progress.toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="relative h-4 bg-zinc-900/80 rounded-full overflow-hidden border border-white/10">
                                                <div
                                                    className={`absolute top-0 left-0 h-full transition-all duration-1000 ease-out ${progress >= 100
                                                        ? 'bg-gradient-to-r from-green-500 via-emerald-400 to-cyan-400'
                                                        : 'bg-gradient-to-r from-green-600 via-emerald-500 to-teal-400'
                                                        }`}
                                                    style={{ width: `${Math.min(progress, 100)}%` }}
                                                ></div>
                                            </div>
                                            <div className="flex justify-between items-center mt-2 text-sm">
                                                <span className="text-emerald-400 font-semibold">{formatRupiah(goal.current_amount)} tersimpan</span>
                                                <span className="text-zinc-500">Target: {formatRupiah(goal.target_amount)}</span>
                                            </div>
                                        </div>

                                        {/* Budget/Expense Progress */}
                                        {totalBudget > 0 && (
                                            <div>
                                                <div className="flex justify-between items-center mb-3">
                                                    <span className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                                        � Budget Terbayar
                                                    </span>
                                                    <span className={`text-lg font-bold ${budgetProgress >= 100 ? 'text-green-400' : 'text-orange-400'}`}>
                                                        {budgetProgress.toFixed(1)}%
                                                    </span>
                                                </div>
                                                <div className="relative h-4 bg-zinc-900/80 rounded-full overflow-hidden border border-white/10">
                                                    <div
                                                        className={`absolute top-0 left-0 h-full transition-all duration-1000 ease-out ${budgetProgress >= 100
                                                            ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                                                            : 'bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400'
                                                            }`}
                                                        style={{ width: `${budgetProgress}%` }}
                                                    ></div>
                                                </div>
                                                <div className="flex justify-between items-center mt-2 text-sm">
                                                    <span className="text-orange-400 font-semibold">{formatRupiah(totalPaid)} terbayar</span>
                                                    <span className="text-zinc-500">Total Budget: {formatRupiah(totalBudget)}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Summary */}
                                        <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                                            <span className="text-base text-zinc-400">
                                                {remaining > 0 ? (
                                                    <>Butuh <span className="text-white font-bold">{formatRupiah(remaining)}</span> lagi</>
                                                ) : (
                                                    <span className="text-green-400 font-bold">🎉 Target Tercapai!</span>
                                                )}
                                            </span>
                                            {totalBudget > 0 && (
                                                <span className="text-sm text-zinc-500">
                                                    Sisa budget: <span className="text-orange-400 font-semibold">{formatRupiah(totalBudget - totalPaid)}</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>

                {/* Custom Tabs */}
                <div className="flex gap-4 mb-10 overflow-x-auto pb-2 scrollbar-hide border-b border-white/5 px-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-3 px-8 py-4 rounded-t-2xl text-sm font-medium transition-all duration-300 relative top-[1px] ${activeTab === tab.id
                                ? 'bg-zinc-900 text-white border-b-2 border-blue-500 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.5)]'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Total Saved Card */}
                            <div className="glass-card p-6 lg:p-8 flex flex-col justify-between hover:bg-white/5 transition-colors group min-h-[180px]">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform border border-blue-500/10">
                                        <TrendingUp size={28} />
                                    </div>
                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-800/80 px-3 py-1.5 rounded-full border border-white/5">All Time</span>
                                </div>
                                <div>
                                    <div className="text-zinc-500 text-sm font-medium mb-2">Total Saved</div>
                                    <div className="text-3xl lg:text-4xl font-bold text-white tracking-tight">{formatRupiah(goal.current_amount)}</div>
                                </div>
                            </div>

                            {/* Contributors Card */}
                            <div className="glass-card p-6 lg:p-8 flex flex-col justify-between hover:bg-white/5 transition-colors group min-h-[180px]">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform border border-purple-500/10">
                                        <Users size={28} />
                                    </div>
                                    <button
                                        onClick={() => { setActiveTab('members'); setShowInviteModal(true); }}
                                        className="text-[10px] font-bold text-zinc-400 hover:text-white uppercase tracking-widest bg-zinc-800/80 hover:bg-zinc-700 px-3 py-1.5 rounded-full border border-white/5 transition-colors"
                                    >
                                        Manage
                                    </button>
                                </div>
                                <div>
                                    <div className="text-zinc-500 text-sm font-medium mb-2">Contributors</div>
                                    <div className="text-3xl lg:text-4xl font-bold text-white tracking-tight flex items-baseline gap-2">
                                        {members ? members.length : 1} <span className="text-base text-zinc-500 font-normal">member{(!members || members.length !== 1) && 's'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions Card */}
                            <div className="glass-card p-6 lg:p-8 flex flex-col justify-center gap-4 min-h-[180px]">
                                <button
                                    onClick={() => { setActiveTab('contributions'); setShowContributionModal(true); }}
                                    className="w-full py-4 px-5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-3 shadow-xl shadow-green-500/25 active:scale-[0.98]"
                                >
                                    <Plus size={20} strokeWidth={2.5} /> Add Deposit
                                </button>
                                <button
                                    onClick={() => { setActiveTab('budgets'); setShowBudgetModal(true); }}
                                    className="w-full py-4 px-5 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-3 border border-white/10 hover:border-white/20"
                                >
                                    <ShoppingBag size={20} strokeWidth={2.5} /> Add Expense
                                </button>
                            </div>

                            {/* Recent Activity (Full Width) */}
                            <div className="md:col-span-2 lg:col-span-3 glass-card p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center">
                                            <Activity size={20} className="text-zinc-400" />
                                        </div>
                                        Recent Activity
                                    </h3>
                                    <div className="text-xs text-zinc-500 uppercase tracking-widest font-semibold flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                        Live Updates
                                    </div>
                                </div>

                                {(() => {
                                    // Combine contributions and budget payments into activities
                                    const recentItems: { type: 'deposit' | 'payment'; amount: number; date: string; name?: string; user_name?: string }[] = [];

                                    // Add contributions as deposits
                                    contributions.forEach(c => {
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        const cAny = c as any;
                                        recentItems.push({ type: 'deposit', amount: c.amount, date: c.created_at, name: c.wallet?.name, user_name: cAny.user_name || cAny.user?.raw_user_meta_data?.name });
                                    });

                                    // Add paid budgets as payments
                                    budgets.filter(b => b.paid_amount > 0).forEach(b => {
                                        const creatorName = b.created_by_name || undefined;
                                        recentItems.push({ type: 'payment', amount: b.paid_amount, date: b.created_at, name: b.name, user_name: creatorName });
                                    });

                                    // Sort by date (newest first)
                                    recentItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                                    if (recentItems.length === 0) {
                                        return (
                                            <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
                                                <div className="text-4xl mb-3 opacity-20">💤</div>
                                                <p className="text-zinc-500 text-sm font-medium">No recent activity. Add a deposit to get started!</p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="space-y-4">
                                            {recentItems.slice(0, 8).map((item, idx) => (
                                                <div key={idx} className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${item.type === 'deposit'
                                                    ? 'bg-green-500/5 border-green-500/10 hover:bg-green-500/10'
                                                    : 'bg-orange-500/5 border-orange-500/10 hover:bg-orange-500/10'
                                                    }`}>
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.type === 'deposit' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'
                                                            }`}>
                                                            {item.type === 'deposit' ? <PiggyBank size={20} /> : <ShoppingBag size={20} />}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-white text-sm">
                                                                {item.type === 'deposit' ? 'Deposit' : 'Payment'}
                                                                {item.user_name && <span className="text-zinc-300 font-normal"> by {item.user_name}</span>}
                                                                {item.name && !item.user_name && <span className="text-zinc-400 font-normal"> • {item.name}</span>}
                                                                {item.type === 'payment' && <span className="text-zinc-500 font-normal mx-1">for</span>}
                                                                {item.type === 'payment' && <span className="text-zinc-300">{item.name}</span>}
                                                            </p>
                                                            <p className="text-xs text-zinc-500">
                                                                {new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className={`font-bold font-mono text-lg ${item.type === 'deposit' ? 'text-green-400' : 'text-orange-400'
                                                        }`}>
                                                        {item.type === 'deposit' ? '+' : '-'}{formatRupiah(item.amount)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}

                    {activeTab === 'budgets' && (
                        <div className="glass-card p-10 min-h-[400px]">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-1">Planned Expenses</h3>
                                    <p className="text-zinc-400">Break down what you need to buy for this goal.</p>
                                </div>
                                <button
                                    onClick={() => setShowBudgetModal(true)}
                                    className="w-12 h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center justify-center transition-all shadow-xl shadow-blue-500/30 active:scale-95"
                                >
                                    <Plus size={22} />
                                </button>
                            </div>



                            {/* Add Expense Modal */}
                            <Modal isOpen={showBudgetModal} onClose={() => setShowBudgetModal(false)} title="Add Expense Item">
                                <form onSubmit={handleAddBudget} className="space-y-7">
                                    {/* Item Name */}
                                    <div>
                                        <label className="block text-sm font-semibold text-zinc-300 mb-3">
                                            Item Name
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Flight Ticket, Hotel Booking"
                                            value={newBudgetName}
                                            onChange={e => setNewBudgetName(e.target.value)}
                                            className="w-full bg-zinc-900/80 border-2 border-zinc-700 hover:border-zinc-500 rounded-xl px-5 py-4 text-white text-lg placeholder:text-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                            autoFocus
                                        />
                                    </div>

                                    {/* Estimated Cost */}
                                    <div>
                                        <label className="block text-sm font-semibold text-zinc-300 mb-3">
                                            Estimated Cost
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-lg">Rp</span>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                value={newBudgetAmount}
                                                onChange={e => setNewBudgetAmount(e.target.value)}
                                                className="w-full bg-zinc-900/80 border-2 border-zinc-700 hover:border-zinc-500 rounded-xl pl-14 pr-5 py-4 text-white text-xl font-mono placeholder:text-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Priority */}
                                    <div>
                                        <label className="block text-sm font-semibold text-zinc-300 mb-3">
                                            Priority
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={newBudgetPriority}
                                                onChange={e => setNewBudgetPriority(e.target.value)}
                                                className="w-full bg-zinc-900/80 border-2 border-zinc-700 hover:border-zinc-500 rounded-xl px-5 py-4 text-white text-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none transition-all cursor-pointer"
                                            >
                                                <option value="high">🔥 High Priority</option>
                                                <option value="medium">⚡ Medium Priority</option>
                                                <option value="low">☕ Low Priority</option>
                                            </select>
                                            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                                                <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="block text-sm font-semibold text-zinc-300 mb-3">
                                            Description <span className="font-normal text-zinc-500">(Optional)</span>
                                        </label>
                                        <textarea
                                            value={newBudgetDescription}
                                            onChange={e => setNewBudgetDescription(e.target.value)}
                                            className="w-full bg-zinc-900/80 border-2 border-zinc-700 hover:border-zinc-500 rounded-xl px-5 py-4 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all h-32 resize-none text-base"
                                            placeholder="Add details about this expense..."
                                        />
                                    </div>

                                    {/* Submit Button */}
                                    <div className="pt-4">
                                        <button
                                            type="submit"
                                            disabled={!newBudgetName || !newBudgetAmount}
                                            className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-lg shadow-xl shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                                        >
                                            Save Expense
                                        </button>
                                    </div>
                                </form>
                            </Modal>

                            <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Pay Expense Item">
                                <form onSubmit={handlePayment} className="space-y-6">
                                    {/* Balance Summary Card */}
                                    <div className="bg-black/40 p-5 rounded-2xl border border-white/10 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-zinc-400 text-sm">Your Goal Balance</span>
                                            <span className="text-white font-bold text-lg">{formatRupiah(balance?.availableBalance || 0)}</span>
                                        </div>
                                        <div className="h-px bg-white/10"></div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-zinc-400 text-sm">Item Remainder</span>
                                            <span className="text-amber-400 font-bold text-lg">
                                                {selectedBudgetForPayment && formatRupiah(selectedBudgetForPayment.amount - selectedBudgetForPayment.paid_amount)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Amount Input */}
                                    <div>
                                        <label className="block text-sm font-semibold text-zinc-300 mb-2">
                                            Amount to Pay
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500 font-semibold">Rp</span>
                                            <input
                                                type="number"
                                                value={paymentAmount}
                                                onChange={e => setPaymentAmount(e.target.value)}
                                                className="w-full bg-black/30 border-2 border-zinc-700/50 hover:border-zinc-600 rounded-2xl pl-14 pr-5 py-4 text-white text-xl font-mono placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                                                placeholder="0"
                                                autoFocus
                                            />
                                        </div>
                                        <p className="text-sm text-zinc-500 mt-3">
                                            This amount will be deducted from your personal goal balance.
                                        </p>
                                    </div>

                                    {/* Submit Button */}
                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || parseFloat(paymentAmount) > (balance?.availableBalance || 0)}
                                            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-2xl font-bold text-lg shadow-xl shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                                        >
                                            Confirm Payment
                                        </button>
                                    </div>
                                </form>
                            </Modal>

                            {budgets.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-zinc-800 rounded-2xl">
                                    <div className="text-5xl mb-4 grayscale opacity-30">📝</div>
                                    <h4 className="text-zinc-300 font-medium mb-1">List Your Expenses</h4>
                                    <p className="text-zinc-500 text-sm max-w-xs">Knowing exactly what you need to buy helps you save more accurately.</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    {budgets.map(item => {
                                        const progress = Math.min((item.paid_amount / item.amount) * 100, 100);
                                        const isPaid = item.status === 'paid' || progress >= 99.9;

                                        return (
                                            <div key={item.id} className={`relative bg-zinc-900/50 hover:bg-zinc-800/50 transition-all border rounded-xl overflow-hidden ${isPaid ? 'border-green-500/20' : 'border-white/5'}`}>
                                                {/* Progress bar as background */}
                                                <div className="absolute inset-0 pointer-events-none">
                                                    <div
                                                        className={`h-full transition-all duration-700 ${isPaid
                                                            ? 'bg-green-500/10'
                                                            : 'bg-orange-500/10'
                                                            }`}
                                                        style={{ width: `${progress}%` }}
                                                    ></div>
                                                </div>

                                                {/* Content */}
                                                <div className="relative p-5 flex items-center justify-between gap-4">
                                                    {/* Left: Icon + Info */}
                                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isPaid
                                                            ? 'bg-green-500/20 text-green-400'
                                                            : 'bg-orange-500/20 text-orange-400'
                                                            }`}>
                                                            {isPaid ? <CheckCircle2 size={22} /> : <ShoppingBag size={22} />}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="font-semibold text-white truncate flex items-center gap-2">
                                                                {item.name}
                                                                {item.priority === 'high' && <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold shrink-0">HIGH</span>}
                                                            </h4>
                                                            <div className="flex items-center gap-2 text-xs text-zinc-500 truncate">
                                                                <span>{item.description || 'No details'}</span>
                                                                {item.created_by_name && (
                                                                    <>
                                                                        <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                                                                        <span className="text-zinc-400">Added by {item.created_by_name}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Center: Progress */}
                                                    <div className="hidden sm:flex flex-col items-center gap-1 px-4">
                                                        <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full ${isPaid ? 'bg-green-500' : 'bg-orange-500'}`}
                                                                style={{ width: `${progress}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className={`text-xs font-bold ${isPaid ? 'text-green-400' : 'text-orange-400'}`}>
                                                            {Math.round(progress)}%
                                                        </span>
                                                    </div>

                                                    {/* Right: Amount + Action */}
                                                    <div className="flex items-center gap-4 shrink-0">
                                                        <div className="text-right">
                                                            <div className="font-bold font-mono text-lg text-white">{formatRupiah(item.amount)}</div>
                                                            <div className="text-xs">
                                                                {isPaid ? (
                                                                    <span className="text-green-400">✓ Paid</span>
                                                                ) : (
                                                                    <span className="text-zinc-500">
                                                                        Paid: <span className="text-green-400">{formatRupiah(item.paid_amount)}</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {!isPaid && (
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedBudgetForPayment(item);
                                                                    setPaymentAmount((item.amount - item.paid_amount).toString());
                                                                    setShowPaymentModal(true);
                                                                }}
                                                                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-semibold text-sm transition-all active:scale-95 flex items-center gap-1.5"
                                                            >
                                                                <Plus size={14} /> Pay
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'contributions' && (
                        <div className="glass-card p-10 min-h-[400px]">
                            {/* Balance Summary */}
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/20 rounded-2xl p-5">
                                    <p className="text-sm text-green-400 font-medium mb-1">Total Deposit</p>
                                    <p className="text-2xl font-bold text-white">{formatRupiah(balance?.totalContributed || 0)}</p>
                                    <p className="text-xs text-zinc-500 mt-1">Uang yang sudah disetorkan</p>
                                </div>
                                <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/20 rounded-2xl p-5">
                                    <p className="text-sm text-blue-400 font-medium mb-1">Sisa Dana</p>
                                    <p className="text-2xl font-bold text-white">{formatRupiah(balance?.availableBalance || 0)}</p>
                                    <p className="text-xs text-zinc-500 mt-1">Setelah pembayaran budget</p>
                                </div>
                            </div>

                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-1">Riwayat Deposit</h3>
                                    <p className="text-zinc-400">Semua deposit ke goal ini.</p>
                                </div>
                                <button
                                    onClick={() => setShowContributionModal(true)}
                                    className="w-12 h-12 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white flex items-center justify-center transition-all shadow-xl shadow-green-500/30 active:scale-95"
                                >
                                    <Plus size={22} />
                                </button>
                            </div>

                            <Modal isOpen={showContributionModal} onClose={() => setShowContributionModal(false)} title="New Deposit">
                                <form onSubmit={handleSaveContribution} className="space-y-6">
                                    {/* Wallet Selection */}
                                    <div>
                                        <label className="block text-sm font-semibold text-zinc-300 mb-2">
                                            Source Wallet
                                        </label>
                                        <div className="relative">
                                            <Wallet className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                                            <select
                                                value={selectedWalletId}
                                                onChange={(e) => setSelectedWalletId(e.target.value)}
                                                className="w-full bg-black/30 border-2 border-zinc-700/50 hover:border-zinc-600 rounded-2xl pl-14 pr-10 py-4 text-white text-base focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none appearance-none transition-all cursor-pointer"
                                            >
                                                <option value="" className="bg-zinc-900 text-zinc-500">Select a wallet...</option>
                                                {wallets.map(w => (
                                                    <option key={w.id} value={w.id} className="bg-zinc-900 text-white">
                                                        {w.name} ({formatRupiah(w.balance)})
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                                                <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Amount Input */}
                                    <div>
                                        <label className="block text-sm font-semibold text-zinc-300 mb-2">
                                            Jumlah Deposit
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500 font-semibold">Rp</span>
                                            <input
                                                type="number"
                                                value={newContributionAmount}
                                                onChange={e => setNewContributionAmount(e.target.value)}
                                                max={wallets.find(w => w.id === selectedWalletId)?.balance || 0}
                                                className="w-full bg-black/30 border-2 border-zinc-700/50 hover:border-zinc-600 rounded-2xl pl-14 pr-5 py-4 text-white text-xl font-mono placeholder:text-zinc-600 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all"
                                                placeholder="0"
                                                autoFocus
                                            />
                                        </div>
                                        {selectedWalletId && (
                                            <p className={`text-sm mt-3 ${parseFloat(newContributionAmount || '0') > (wallets.find(w => w.id === selectedWalletId)?.balance || 0)
                                                    ? 'text-red-400'
                                                    : 'text-zinc-500'
                                                }`}>
                                                Saldo tersedia: {formatRupiah(wallets.find(w => w.id === selectedWalletId)?.balance || 0)}
                                            </p>
                                        )}
                                    </div>

                                    {/* Submit Button */}
                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={
                                                !selectedWalletId ||
                                                !newContributionAmount ||
                                                parseFloat(newContributionAmount) <= 0 ||
                                                parseFloat(newContributionAmount) > (wallets.find(w => w.id === selectedWalletId)?.balance || 0)
                                            }
                                            className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-2xl font-bold text-lg shadow-xl shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                                        >
                                            Konfirmasi Deposit
                                        </button>
                                    </div>
                                </form>
                            </Modal>

                            {contributions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-zinc-800 rounded-2xl">
                                    <div className="text-5xl mb-4 grayscale opacity-30">💸</div>
                                    <h4 className="text-zinc-300 font-medium mb-1">Start Saving</h4>
                                    <p className="text-zinc-500 text-sm max-w-xs">Make your first deposit to get this goal moving!</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {contributions.map(c => (
                                        <div key={c.id} className="bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors border border-white/5 p-5 rounded-2xl flex justify-between items-center">
                                            <div className="flex items-center gap-5">
                                                <div className="w-14 h-14 bg-gradient-to-br from-green-500/20 to-emerald-500/10 rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-green-500/10">
                                                    {c.wallet?.icon || '💰'}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-lg text-white mb-1">Deposit</h4>
                                                    <p className="text-sm text-zinc-500">{new Date(c.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-green-400 font-mono text-xl mb-1">+{formatRupiah(c.amount)}</div>
                                                <p className="text-sm text-zinc-500">from {c.wallet?.name || 'Wallet'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'members' && (
                        <div className="glass-card min-h-[400px]">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-1">Team Members</h3>
                                    <p className="text-zinc-400">Invite friends or family to save together.</p>
                                </div>
                                <button
                                    onClick={() => setShowInviteModal(true)}
                                    className="w-12 h-12 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white flex items-center justify-center transition-all shadow-xl shadow-purple-500/30 active:scale-95"
                                >
                                    <Plus size={22} />
                                </button>
                            </div>

                            {!members || members.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-zinc-800 rounded-2xl">
                                    <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-pink-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-purple-500/10">
                                        <Users size={36} className="text-purple-400" />
                                    </div>
                                    <h4 className="text-xl font-bold text-white mb-2">No Team Members Yet</h4>
                                    <p className="text-zinc-400 max-w-sm mb-8">
                                        Saving together is more fun! Invite people to join this goal.
                                    </p>
                                    <button
                                        onClick={() => setShowInviteModal(true)}
                                        className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-semibold flex items-center gap-3 transition-colors border border-white/10"
                                    >
                                        <Mail size={18} /> Invite via Email
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {members.map(member => {
                                        const isCurrentUser = user && member.user_id === user.id;
                                        const displayName = isCurrentUser
                                            ? (user.user_metadata?.name || user.email?.split('@')[0] || 'You')
                                            : (member.user_name || member.user?.raw_user_meta_data?.name || (member.user_email ? member.user_email.split('@')[0] : 'Member'));
                                        const displayEmail = isCurrentUser
                                            ? (user.email || 'No email')
                                            : (member.user_email || 'No email');

                                        return (
                                            <div key={member.id} className="bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors border border-white/5 p-5 rounded-2xl flex justify-between items-center">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-14 h-14 bg-gradient-to-br from-purple-500/20 to-pink-500/10 rounded-2xl flex items-center justify-center text-xl font-bold text-purple-400 border border-purple-500/10">
                                                        {displayName.slice(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-lg text-white mb-1">
                                                            {displayName} {isCurrentUser && <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded ml-2">YOU</span>}
                                                        </h4>
                                                        <p className="text-sm text-zinc-500 capitalize">{member.role} • {displayEmail}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide ${member.role === 'owner' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-zinc-800 text-zinc-400 border border-white/5'}`}>
                                                        {member.role}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Invite Modal (Moved to root) */}
                <Modal isOpen={showInviteModal} onClose={() => { setShowInviteModal(false); setInviteLink(null); }} title="Invite Member">
                    <div className="space-y-6">
                        <form onSubmit={handleInvite} className="space-y-6">
                            <div>
                                <label className="block text-zinc-400 text-sm font-medium mb-2 pl-1">Email Address</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-purple-400 transition-colors" size={20} />
                                    <input
                                        type="email"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        placeholder="friend@example.com"
                                        className="w-full bg-zinc-900/50 border-2 border-zinc-800 focus:border-purple-500 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-zinc-600 outline-none transition-all font-medium"
                                        autoFocus
                                    />
                                </div>
                                <p className="text-xs text-zinc-500 mt-2 pl-1">They will be able to view and contribute to this goal.</p>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting || !inviteEmail}
                                className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-purple-500/20 active:scale-[0.98] text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Mail size={18} /> Send Invite
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                            <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#18181b] px-2 text-zinc-500">Or share link</span></div>
                        </div>

                        <div>
                            {!inviteLink ? (
                                <button
                                    onClick={async () => {
                                        setIsGeneratingLink(true);
                                        try {
                                            const supabase = createClient();
                                            const { data, error } = await supabase.rpc('create_invitation', {
                                                p_goal_id: id
                                            });
                                            if (error) throw error;
                                            setInviteLink(`${window.location.origin}/invite/${data}`);
                                        } catch (e) {
                                            console.error(e);
                                            alert('Failed to generate link. Make sure you are the owner.');
                                        } finally {
                                            setIsGeneratingLink(false);
                                        }
                                    }}
                                    disabled={isGeneratingLink}
                                    className="w-full py-3.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2 border border-white/5"
                                >
                                    {isGeneratingLink ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <Link size={18} />}
                                    Generate One-Time Link
                                </button>
                            ) : (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <label className="text-zinc-400 text-sm font-medium pl-1">One-Time Link</label>
                                    <div className="flex gap-2">
                                        <div className="w-full bg-black/50 border-2 border-zinc-800 rounded-xl py-3 px-4 text-zinc-300 text-sm truncate font-mono select-all">
                                            {inviteLink}
                                        </div>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(inviteLink);
                                                // Optional: Toast
                                            }}
                                            className="p-3 bg-purple-600 rounded-xl text-white hover:bg-purple-500 transition-colors shadow-lg shadow-purple-500/20 active:scale-95"
                                        >
                                            <Copy size={18} />
                                        </button>
                                    </div>
                                    <p className="text-xs text-amber-500/90 pl-1 font-medium flex items-center gap-1.5">
                                        <AlertCircle size={12} />
                                        Link expires immediately after use.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </Modal>

                <style jsx global>{`
                .glass-card {
                    background: rgba(24, 24, 27, 0.6);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 1.5rem;
                    padding: 24px;
                }
                
                @media (min-width: 1024px) {
                    .glass-card {
                        padding: 32px;
                    }
                }
                
                @keyframes shimmer {
                    100% {
                        transform: translateX(100%);
                    }
                }
                
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }

                /* Input styling for consistency */
                .goal-input {
                    width: 100%;
                    background: rgba(0, 0, 0, 0.3);
                    border: 2px solid rgba(113, 113, 122, 0.5);
                    border-radius: 1rem;
                    padding: 18px 20px 18px 56px;
                    color: white;
                    font-size: 1.125rem;
                    transition: all 0.2s ease;
                }
                
                .goal-input:hover {
                    border-color: rgba(113, 113, 122, 0.8);
                }
                
                .goal-input:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
                }
                
                .goal-input::placeholder {
                    color: rgba(113, 113, 122, 0.6);
                }
            `}</style>
            </div>
        </div>
    );
}
