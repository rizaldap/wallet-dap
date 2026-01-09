'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Camera } from 'lucide-react';
import { formatRupiah } from '@/types';
import { useWallets, useCategories, useTransactions } from '@/lib/hooks/useData';
import { ReceiptScanner } from './ReceiptScanner';

interface TransactionModalProps {
    onClose: () => void;
    onSuccess?: () => void;
}

type TransactionType = 'expense' | 'income' | 'transfer' | 'credit_expense' | 'credit_payment';

export default function TransactionModal({ onClose, onSuccess }: TransactionModalProps) {
    const { wallets, loading: walletsLoading, refresh: refreshWallets } = useWallets();
    const { incomeCategories, expenseCategories, loading: catsLoading } = useCategories();
    const { refresh: refreshTransactions } = useTransactions();

    const [creditCards, setCreditCards] = useState<any[]>([]);

    const [type, setType] = useState<TransactionType>('expense');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [walletId, setWalletId] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [creditCardId, setCreditCardId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [fromWalletId, setFromWalletId] = useState('');
    const [toWalletId, setToWalletId] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showScanner, setShowScanner] = useState(false);

    // Fetch credit cards on mount
    useEffect(() => {
        fetch('/api/credit-cards').then(res => res.json()).then(data => setCreditCards(data.data || []));
    }, []);

    // Use DB categories only
    const categories = (type === 'expense' || type === 'credit_expense') ? expenseCategories : incomeCategories;

    // Debug: log categories
    console.log('TransactionModal categories:', {
        type,
        expenseCount: expenseCategories.length,
        incomeCount: incomeCategories.length,
        currentCategories: categories.map(c => ({ id: c.id, name: c.name, type: c.type })),
        selectedCategoryId: categoryId
    });

    const handleScanComplete = (data: { amount: number; description: string; date: string }) => {
        if (data.amount > 0) {
            setAmount(data.amount.toString());
        }
        if (data.description) {
            setDescription(data.description);
        }
        if (data.date) {
            setDate(data.date);
        }
        setShowScanner(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount) return;

        // Helper to validate UUID
        const isUUID = (str: string): boolean => {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            return uuidRegex.test(str);
        };

        // Only send valid UUIDs, not default category string IDs like 'food'
        const validCategoryId = categoryId && isUUID(categoryId) ? categoryId : null;
        const validWalletId = walletId && isUUID(walletId) ? walletId : null;
        const validFromWalletId = fromWalletId && isUUID(fromWalletId) ? fromWalletId : null;
        const validToWalletId = toWalletId && isUUID(toWalletId) ? toWalletId : null;
        const validCreditCardId = creditCardId && isUUID(creditCardId) ? creditCardId : null;

        console.log('Creating transaction:', {
            categoryId,
            validCategoryId,
            isValidUUID: categoryId ? isUUID(categoryId) : false,
            availableCategories: categories.map(c => ({ id: c.id, name: c.name }))
        });

        setSubmitting(true);
        try {
            const payload: any = {
                type,
                amount: parseFloat(amount),
                description,
                date,
                notes: notes || null,
            };

            if (type === 'income' || type === 'expense') {
                payload.walletId = validWalletId;
                payload.categoryId = validCategoryId;

                // Validate: expense can't exceed wallet balance
                if (type === 'expense' && validWalletId) {
                    const selectedWallet = wallets.find(w => w.id === validWalletId);
                    if (selectedWallet && parseFloat(amount) > selectedWallet.balance) {
                        alert(`Saldo wallet tidak cukup! Saldo tersedia: Rp ${selectedWallet.balance.toLocaleString('id-ID')}`);
                        setSubmitting(false);
                        return;
                    }
                }
            } else if (type === 'transfer') {
                payload.fromWalletId = validFromWalletId;
                payload.toWalletId = validToWalletId;

                // Validate: transfer can't exceed source wallet balance
                if (validFromWalletId) {
                    const fromWallet = wallets.find(w => w.id === validFromWalletId);
                    if (fromWallet && parseFloat(amount) > fromWallet.balance) {
                        alert(`Saldo wallet asal tidak cukup! Saldo tersedia: Rp ${fromWallet.balance.toLocaleString('id-ID')}`);
                        setSubmitting(false);
                        return;
                    }
                }
            } else if (type === 'credit_expense') {
                payload.creditCardId = validCreditCardId;
                payload.categoryId = validCategoryId;
            } else if (type === 'credit_payment') {
                payload.walletId = validWalletId; // paying from wallet
                payload.creditCardId = validCreditCardId; // paying to cc

                // Validate: payment can't exceed wallet balance
                if (validWalletId) {
                    const selectedWallet = wallets.find(w => w.id === validWalletId);
                    if (selectedWallet && parseFloat(amount) > selectedWallet.balance) {
                        alert(`Saldo wallet tidak cukup untuk bayar kartu kredit! Saldo tersedia: Rp ${selectedWallet.balance.toLocaleString('id-ID')}`);
                        setSubmitting(false);
                        return;
                    }
                }
            }

            await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            await refreshTransactions();
            await refreshWallets();
            onSuccess?.();
            onClose();
        } catch (err) {
            console.error('Failed to create transaction:', err);
            alert('Gagal membuat transaksi. Silakan coba lagi.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
            <div className="modal-content animate-slide-up" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Transaksi Baru</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    {/* Amount Input with Scanner */}
                    <div className="amount-input-container" style={{ position: 'relative', marginBottom: '20px' }}>
                        <span className="currency-symbol" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>Rp</span>
                        <input
                            type="number"
                            className="amount-input"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0"
                            required
                            autoFocus
                            style={{
                                width: '100%',
                                padding: '16px 16px 16px 40px',
                                fontSize: '24px',
                                fontWeight: 'bold',
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                color: 'var(--text-primary)'
                            }}
                        />
                        <button
                            type="button"
                            className="scanner-btn"
                            onClick={() => setShowScanner(true)}
                            style={{
                                position: 'absolute',
                                right: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                color: 'var(--accent-primary)',
                                cursor: 'pointer'
                            }}
                        >
                            <Camera size={24} />
                        </button>
                    </div>

                    {/* Type Selector */}
                    <div className="type-selector-scroll" style={{ overflowX: 'auto', marginBottom: '20px', paddingBottom: '8px' }}>
                        <div className="type-selector" style={{ display: 'flex', gap: '8px' }}>
                            {(['expense', 'income', 'transfer', 'credit_expense', 'credit_payment'] as const).map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    className={`type-btn ${type === t ? 'active' : ''}`}
                                    onClick={() => setType(t)}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '20px',
                                        border: '1px solid var(--border)',
                                        background: type === t ? 'var(--accent-primary)' : 'transparent',
                                        color: type === t ? 'white' : 'var(--text-muted)',
                                        whiteSpace: 'nowrap',
                                        fontSize: '14px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {t === 'expense' ? 'Pengeluaran' :
                                        t === 'income' ? 'Pemasukan' :
                                            t === 'transfer' ? 'Transfer' :
                                                t === 'credit_expense' ? 'Kartu Kredit' : 'Bayar Tagihan'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Form Fields */}
                    <div className="form-fields" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* DESCRIPTION */}
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>Deskripsi</label>
                            <input
                                type="text"
                                className="form-input"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Contoh: Makan siang"
                                required
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                            />
                        </div>

                        {/* DATE */}
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>Tanggal</label>
                            <input
                                type="date"
                                className="form-input"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                            />
                        </div>

                        {/* EXPENSE & INCOME FIELDS */}
                        {(type === 'expense' || type === 'income') && (
                            <>
                                <div className="form-group">
                                    <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>Wallet</label>
                                    {walletsLoading ? (
                                        <div style={{ padding: '12px' }}><Loader2 size={18} className="animate-spin" /></div>
                                    ) : wallets.length === 0 ? (
                                        <p className="text-small text-muted">No wallets. Create one first.</p>
                                    ) : (
                                        <select className="form-select" value={walletId} onChange={(e) => setWalletId(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                                            <option value="">Pilih Wallet</option>
                                            {wallets.map((w) => (
                                                <option key={w.id} value={w.id}>{w.icon} {w.name}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>Kategori</label>
                                    {catsLoading ? (
                                        <div style={{ padding: '12px' }}><Loader2 size={18} className="animate-spin" /></div>
                                    ) : (
                                        <div className="category-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {categories.map((cat) => (
                                                <button
                                                    key={cat.id}
                                                    type="button"
                                                    className={`category-chip ${categoryId === cat.id ? 'active' : ''}`}
                                                    onClick={() => setCategoryId(cat.id)}
                                                    style={{
                                                        padding: '8px 12px',
                                                        borderRadius: '20px',
                                                        border: categoryId === cat.id ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
                                                        background: categoryId === cat.id ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-secondary)',
                                                        color: categoryId === cat.id ? 'var(--accent-primary)' : 'var(--text-primary)',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px'
                                                    }}
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

                        {/* TRANSFER FIELDS */}
                        {type === 'transfer' && (
                            <>
                                <div className="form-group">
                                    <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>Dari Wallet</label>
                                    <select className="form-select" value={fromWalletId} onChange={(e) => setFromWalletId(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                                        <option value="">Pilih Wallet Asal</option>
                                        {wallets.map((w) => (
                                            <option key={w.id} value={w.id}>{w.icon} {w.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>Ke Wallet</label>
                                    <select className="form-select" value={toWalletId} onChange={(e) => setToWalletId(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                                        <option value="">Pilih Wallet Tujuan</option>
                                        {wallets.map((w) => (
                                            <option key={w.id} value={w.id}>{w.icon} {w.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        )}

                        {/* CREDIT CARD EXPENSE FIELDS */}
                        {type === 'credit_expense' && (
                            <>
                                <div className="form-group">
                                    <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>Kartu Kredit</label>
                                    {creditCards.length === 0 ? (
                                        <p className="text-small text-muted">Belum ada kartu kredit.</p>
                                    ) : (
                                        <select className="form-select" value={creditCardId} onChange={(e) => setCreditCardId(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                                            <option value="">Pilih Kartu Kredit</option>
                                            {creditCards.map((cc) => (
                                                <option key={cc.id} value={cc.id}>💳 {cc.name}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>Kategori</label>
                                    <div className="category-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {categories.map((cat) => (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                className={`category-chip ${categoryId === cat.id ? 'active' : ''}`}
                                                onClick={() => setCategoryId(cat.id)}
                                                style={{
                                                    padding: '8px 12px',
                                                    borderRadius: '20px',
                                                    border: categoryId === cat.id ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
                                                    background: categoryId === cat.id ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-secondary)',
                                                    color: categoryId === cat.id ? 'var(--accent-primary)' : 'var(--text-primary)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}
                                            >
                                                <span className="chip-icon">{cat.icon}</span>
                                                <span className="chip-name">{cat.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* CREDIT PAYMENT FIELDS */}
                        {type === 'credit_payment' && (
                            <>
                                <div className="form-group">
                                    <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>Bayar Pakai Wallet</label>
                                    <select className="form-select" value={walletId} onChange={(e) => setWalletId(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                                        <option value="">Pilih Sumber Dana</option>
                                        {wallets.map((w) => (
                                            <option key={w.id} value={w.id}>{w.icon} {w.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>Bayar Kartu Kredit</label>
                                    <select className="form-select" value={creditCardId} onChange={(e) => setCreditCardId(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                                        <option value="">Pilih Kartu Tujuan</option>
                                        {creditCards.map((cc) => (
                                            <option key={cc.id} value={cc.id}>💳 {cc.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        )}

                        {/* Notes */}
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>Catatan (opsional)</label>
                            <textarea
                                className="form-textarea"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                            />
                        </div>
                    </div>

                    <div className="modal-footer" style={{ marginTop: '24px' }}>
                        <button
                            type="submit"
                            className="submit-btn"
                            disabled={submitting}
                            style={{ width: '100%', padding: '14px', borderRadius: '8px', background: 'var(--accent-primary)', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            {submitting ? <Loader2 className="animate-spin" /> : 'Simpan Transaksi'}
                        </button>
                    </div>
                </form>
            </div>

            {showScanner && (
                <ReceiptScanner
                    onScanComplete={handleScanComplete}
                    onClose={() => setShowScanner(false)}
                />
            )}
        </div>
    );
}
