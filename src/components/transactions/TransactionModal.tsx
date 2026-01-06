'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { formatRupiah } from '@/types';
import { useWallets, useCategories, useTransactions } from '@/lib/hooks/useData';
import { useSession } from 'next-auth/react';

interface TransactionModalProps {
    onClose: () => void;
    onSuccess?: () => void;
}

type TransactionType = 'expense' | 'income' | 'transfer';

// Default categories jika belum ada di database
const defaultCategories = {
    expense: [
        { id: 'food', name: 'Food', icon: '🍔' },
        { id: 'transport', name: 'Transport', icon: '🚗' },
        { id: 'entertainment', name: 'Entertainment', icon: '🎮' },
        { id: 'shopping', name: 'Shopping', icon: '🛍️' },
        { id: 'bills', name: 'Bills', icon: '💡' },
        { id: 'other', name: 'Other', icon: '📦' },
    ],
    income: [
        { id: 'salary', name: 'Salary', icon: '💰' },
        { id: 'bonus', name: 'Bonus', icon: '🎁' },
        { id: 'freelance', name: 'Freelance', icon: '💻' },
        { id: 'investment', name: 'Investment', icon: '📈' },
    ],
};

export default function TransactionModal({ onClose, onSuccess }: TransactionModalProps) {
    const { data: session } = useSession();
    const { wallets, loading: walletsLoading, refresh: refreshWallets } = useWallets();
    const { incomeCategories, expenseCategories, loading: catsLoading } = useCategories();
    const { refresh: refreshTransactions } = useTransactions();

    const [type, setType] = useState<TransactionType>('expense');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [walletId, setWalletId] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [fromWalletId, setFromWalletId] = useState('');
    const [toWalletId, setToWalletId] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const isAuthenticated = !!session?.user;

    // Use DB categories or defaults
    const categories = type === 'expense'
        ? (expenseCategories.length > 0 ? expenseCategories : defaultCategories.expense)
        : (incomeCategories.length > 0 ? incomeCategories : defaultCategories.income);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAuthenticated || !amount) return;

        setSubmitting(true);
        try {
            await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: 'default',
                    type: type === 'transfer' ? 'expense' : type,
                    amount: parseFloat(amount),
                    description,
                    date,
                    notes,
                    walletId: type === 'transfer' ? fromWalletId : walletId,
                    categoryId: categoryId || undefined,
                    fromWalletId: type === 'transfer' ? fromWalletId : undefined,
                    toWalletId: type === 'transfer' ? toWalletId : undefined,
                }),
            });
            await refreshTransactions();
            await refreshWallets();
            onSuccess?.();
            onClose();
        } catch (err) {
            console.error('Failed to create transaction:', err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content animate-slide-up" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">New Transaction</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Type Tabs */}
                <div className="type-tabs">
                    <button
                        className={`type-tab ${type === 'expense' ? 'active' : ''}`}
                        onClick={() => setType('expense')}
                        data-type="expense"
                    >
                        Expense
                    </button>
                    <button
                        className={`type-tab ${type === 'income' ? 'active' : ''}`}
                        onClick={() => setType('income')}
                        data-type="income"
                    >
                        Income
                    </button>
                    <button
                        className={`type-tab ${type === 'transfer' ? 'active' : ''}`}
                        onClick={() => setType('transfer')}
                        data-type="transfer"
                    >
                        Transfer
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Amount */}
                    <div className="form-group">
                        <label className="form-label">Amount</label>
                        <div className="amount-wrapper">
                            <span className="amount-prefix">Rp</span>
                            <input
                                type="number"
                                className="form-input amount-input"
                                placeholder="0"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                required
                            />
                        </div>
                        {amount && <p className="amount-preview">{formatRupiah(parseFloat(amount) || 0)}</p>}
                    </div>

                    {/* Description */}
                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="What's this for?"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                        />
                    </div>

                    {/* Date */}
                    <div className="form-group">
                        <label className="form-label">Date</label>
                        <input
                            type="date"
                            className="form-input"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                        />
                    </div>

                    {type === 'transfer' ? (
                        <div className="transfer-row">
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">From</label>
                                <select className="form-select" value={fromWalletId} onChange={(e) => setFromWalletId(e.target.value)} required>
                                    <option value="">Select</option>
                                    {wallets.map((w) => (
                                        <option key={w.id} value={w.id}>{w.icon} {w.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">To</label>
                                <select className="form-select" value={toWalletId} onChange={(e) => setToWalletId(e.target.value)} required>
                                    <option value="">Select</option>
                                    {wallets.filter(w => w.id !== fromWalletId).map((w) => (
                                        <option key={w.id} value={w.id}>{w.icon} {w.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="form-group">
                                <label className="form-label">Wallet</label>
                                {walletsLoading ? (
                                    <div style={{ padding: '12px' }}><Loader2 size={18} className="animate-spin" /></div>
                                ) : wallets.length === 0 ? (
                                    <p className="text-small text-muted">No wallets. Create one first.</p>
                                ) : (
                                    <select className="form-select" value={walletId} onChange={(e) => setWalletId(e.target.value)} required>
                                        <option value="">Select wallet</option>
                                        {wallets.map((w) => (
                                            <option key={w.id} value={w.id}>{w.icon} {w.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Category</label>
                                {catsLoading ? (
                                    <div style={{ padding: '12px' }}><Loader2 size={18} className="animate-spin" /></div>
                                ) : (
                                    <div className="category-grid">
                                        {categories.map((cat) => (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                className={`category-chip ${categoryId === cat.id ? 'active' : ''}`}
                                                onClick={() => setCategoryId(cat.id)}
                                            >
                                                <span className="chip-icon">{cat.icon}</span>
                                                <span className="chip-name">{cat.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Notes */}
                    <div className="form-group">
                        <label className="form-label">Notes (optional)</label>
                        <textarea
                            className="form-input"
                            placeholder="Add notes..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            style={{ resize: 'none' }}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '8px' }}
                        disabled={submitting || wallets.length === 0}
                    >
                        {submitting ? <Loader2 size={18} className="animate-spin" /> : 'Save Transaction'}
                    </button>
                </form>
            </div>

            <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        
        .type-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
        }
        
        .type-tab {
          flex: 1;
          padding: 12px;
          border: 1px solid var(--border-color);
          background: transparent;
          color: var(--text-muted);
          font-size: 13px;
          font-weight: 500;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        
        .type-tab:hover {
          border-color: var(--border-color-strong);
        }
        
        .type-tab.active[data-type="expense"] {
          background: rgba(239, 68, 68, 0.1);
          border-color: var(--accent-red);
          color: var(--accent-red);
        }
        
        .type-tab.active[data-type="income"] {
          background: rgba(34, 197, 94, 0.1);
          border-color: var(--accent-green);
          color: var(--accent-green);
        }
        
        .type-tab.active[data-type="transfer"] {
          background: rgba(255, 255, 255, 0.05);
          border-color: var(--text-primary);
          color: var(--text-primary);
        }
        
        .amount-wrapper {
          display: flex;
          align-items: center;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          overflow: hidden;
        }
        
        .amount-prefix {
          padding: 14px 16px;
          color: var(--text-muted);
          font-weight: 500;
          background: rgba(255,255,255,0.02);
        }
        
        .amount-input {
          border: none !important;
          font-size: 24px;
          font-weight: 600;
          padding-left: 0;
        }
        
        .amount-preview {
          margin-top: 8px;
          font-size: 13px;
          color: var(--text-muted);
        }
        
        .transfer-row {
          display: flex;
          gap: 12px;
        }
        
        .category-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }
        
        .category-chip {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 12px 8px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        
        .category-chip:hover {
          border-color: var(--border-color-strong);
        }
        
        .category-chip.active {
          background: rgba(255, 255, 255, 0.08);
          border-color: var(--text-primary);
        }
        
        .chip-icon {
          font-size: 20px;
        }
        
        .chip-name {
          font-size: 10px;
          color: var(--text-secondary);
          text-align: center;
        }
        
        @media (max-width: 480px) {
          .category-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>
        </div>
    );
}
