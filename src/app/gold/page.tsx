'use client';

import { useState } from 'react';
import { Plus, TrendingUp, TrendingDown, Loader2, Wallet } from 'lucide-react';
import { useGold } from '@/lib/hooks/useGoals';
import { useWallets } from '@/lib/hooks/useData';
import { formatRupiah } from '@/types';

const PLATFORMS = [
    'Pegadaian Digital',
    'Tokopedia Emas',
    'Pluang',
    'Bibit',
    'Treasury',
    'Other',
];

export default function GoldPage() {
    const { summary, transactions, loading, buy, sell } = useGold();
    const { wallets } = useWallets();
    const [showBuyModal, setShowBuyModal] = useState(false);
    const [showSellModal, setShowSellModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [buyForm, setBuyForm] = useState({
        platform: '',
        grams: '',
        pricePerGram: '',
        walletId: '',
        notes: '',
    });

    const [sellForm, setSellForm] = useState({
        holdingId: '',
        grams: '',
        pricePerGram: '',
        walletId: '',
        notes: '',
    });

    const handleBuy = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!buyForm.platform || !buyForm.grams || !buyForm.pricePerGram || !buyForm.walletId) return;

        // Calculate total cost
        const totalCost = parseFloat(buyForm.grams) * parseFloat(buyForm.pricePerGram);

        // Validate wallet balance
        const selectedWallet = wallets.find(w => w.id === buyForm.walletId);
        if (selectedWallet && totalCost > selectedWallet.balance) {
            alert(`Saldo wallet tidak cukup untuk beli emas!\nTotal: Rp ${totalCost.toLocaleString('id-ID')}\nSaldo tersedia: Rp ${selectedWallet.balance.toLocaleString('id-ID')}`);
            return;
        }

        setSubmitting(true);
        try {
            await buy({
                platform: buyForm.platform,
                grams: parseFloat(buyForm.grams),
                pricePerGram: parseFloat(buyForm.pricePerGram),
                walletId: buyForm.walletId,
                notes: buyForm.notes,
            });
            setShowBuyModal(false);
            setBuyForm({ platform: '', grams: '', pricePerGram: '', walletId: '', notes: '' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleSell = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sellForm.holdingId || !sellForm.grams || !sellForm.pricePerGram || !sellForm.walletId) return;

        setSubmitting(true);
        try {
            await sell({
                holdingId: sellForm.holdingId,
                grams: parseFloat(sellForm.grams),
                pricePerGram: parseFloat(sellForm.pricePerGram),
                walletId: sellForm.walletId,
                notes: sellForm.notes,
            });
            setShowSellModal(false);
            setSellForm({ holdingId: '', grams: '', pricePerGram: '', walletId: '', notes: '' });
        } finally {
            setSubmitting(false);
        }
    };

    // Calculate total invested from buy transactions
    const totalInvested = transactions
        .filter(tx => tx.type === 'buy')
        .reduce((sum, tx) => sum + tx.total_amount, 0);

    const totalSold = transactions
        .filter(tx => tx.type === 'sell')
        .reduce((sum, tx) => sum + tx.total_amount, 0);

    // Calculate Asset Value & PnL
    const lastPrice = transactions.length > 0 ? transactions[0].price_per_gram : 0;
    const currentAssetValue = summary.totalGrams * lastPrice;
    const totalPnL = (totalSold + currentAssetValue) - totalInvested;
    const isPnLPositive = totalPnL >= 0;

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <p>Loading gold portfolio...</p>
            </div>
        );
    }

    return (
        <div className="gold-page">
            <header className="page-header">
                <div>
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img src="/gold-bar.png" alt="Gold" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                        Gold Investment
                    </h1>
                    <p className="page-subtitle">Track your gold holdings</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={() => setShowSellModal(true)}>
                        <TrendingDown size={18} />
                        Jual
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowBuyModal(true)}>
                        <Plus size={18} />
                        Beli
                    </button>
                </div>
            </header>

            {/* Summary Cards */}
            <div className="bento-grid">
                <div className="bento-card bento-2x1">
                    <div className="bento-card-header">
                        <span className="bento-card-title">Total Gold</span>
                        <img src="/gold-bar.png" alt="Gold" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                    </div>
                    <div className="bento-value-large">{summary.totalGrams.toFixed(4)} gram</div>
                    <p className="text-muted text-small">{summary.holdingCount} platform</p>
                </div>

                <div className="bento-card bento-2x1">
                    <div className="bento-card-header">
                        <span className="bento-card-title">Estimasi Aset</span>
                        <Wallet size={16} />
                    </div>
                    <div className="bento-value-large">{formatRupiah(currentAssetValue)}</div>
                    <div className={`pnl-indicator ${isPnLPositive ? 'success' : 'danger'}`}>
                        {isPnLPositive ? '+' : ''}{formatRupiah(totalPnL)}
                        <span className="text-muted text-small" style={{ marginLeft: '8px', color: 'var(--text-muted)' }}>
                            (PnL)
                        </span>
                    </div>
                </div>
            </div>

            {/* Holdings by Platform */}
            <section className="section">
                <h2 className="section-title">Holdings by Platform</h2>
                {summary.holdings.length === 0 ? (
                    <div className="empty-state">
                        <p>Belum ada gold. Mulai dengan membeli emas!</p>
                    </div>
                ) : (
                    <div className="holdings-list">
                        {summary.holdings.map((holding) => (
                            <div key={holding.id} className="holding-card">
                                <div className="holding-icon">🏛️</div>
                                <div className="holding-info">
                                    <h3>{holding.platform}</h3>
                                    <p>{holding.total_grams.toFixed(4)} gram</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Transaction History */}
            <section className="section">
                <h2 className="section-title">Riwayat Transaksi</h2>
                {transactions.length === 0 ? (
                    <div className="empty-state">
                        <p>Belum ada transaksi</p>
                    </div>
                ) : (
                    <div className="transactions-list">
                        {transactions.slice(0, 10).map((tx) => (
                            <div key={tx.id} className="transaction-row">
                                <div className={`tx-icon ${tx.type}`}>
                                    {tx.type === 'buy' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                </div>
                                <div className="tx-info">
                                    <span className="tx-type">{tx.type === 'buy' ? 'Beli' : 'Jual'}</span>
                                    <span className="tx-date">{new Date(tx.created_at).toLocaleDateString('id-ID')}</span>
                                </div>
                                <div className="tx-details">
                                    <span className="tx-grams">{tx.grams.toFixed(4)} g</span>
                                    <span className="tx-price">@ {formatRupiah(tx.price_per_gram)}/g</span>
                                </div>
                                <div className={`tx-amount ${tx.type}`}>
                                    {tx.type === 'buy' ? '-' : '+'}{formatRupiah(tx.total_amount)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Buy Modal */}
            {showBuyModal && (
                <div className="modal-overlay" onClick={() => setShowBuyModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>🪙 Beli Emas</h2>
                        <form onSubmit={handleBuy}>
                            <div className="form-group">
                                <label>Platform</label>
                                <select
                                    value={buyForm.platform}
                                    onChange={(e) => setBuyForm({ ...buyForm, platform: e.target.value })}
                                    required
                                    className="form-select"
                                >
                                    <option value="">Pilih platform</option>
                                    {PLATFORMS.map((p) => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Jumlah (gram)</label>
                                    <input
                                        type="number"
                                        step="0.0001"
                                        min="0.0001"
                                        value={buyForm.grams}
                                        onChange={(e) => setBuyForm({ ...buyForm, grams: e.target.value })}
                                        required
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Harga/gram (Rp)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={buyForm.pricePerGram}
                                        onChange={(e) => setBuyForm({ ...buyForm, pricePerGram: e.target.value })}
                                        required
                                        className="form-input"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Sumber Dana</label>
                                <select
                                    value={buyForm.walletId}
                                    onChange={(e) => setBuyForm({ ...buyForm, walletId: e.target.value })}
                                    required
                                    className="form-select"
                                >
                                    <option value="">Pilih wallet</option>
                                    {wallets.map((w) => (
                                        <option key={w.id} value={w.id}>{w.name} ({formatRupiah(w.balance)})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Catatan (opsional)</label>
                                <input
                                    type="text"
                                    value={buyForm.notes}
                                    onChange={(e) => setBuyForm({ ...buyForm, notes: e.target.value })}
                                    className="form-input"
                                />
                            </div>

                            {buyForm.grams && buyForm.pricePerGram && (
                                <div className="total-preview">
                                    <span>Total Bayar</span>
                                    <strong>{formatRupiah(parseFloat(buyForm.grams) * parseFloat(buyForm.pricePerGram))}</strong>
                                </div>
                            )}

                            {/* Balance warning */}
                            {buyForm.walletId && buyForm.grams && buyForm.pricePerGram && (() => {
                                const totalCost = parseFloat(buyForm.grams) * parseFloat(buyForm.pricePerGram);
                                const selectedWallet = wallets.find(w => w.id === buyForm.walletId);
                                const isInsufficient = selectedWallet && totalCost > selectedWallet.balance;
                                return isInsufficient ? (
                                    <div style={{
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        borderRadius: '8px',
                                        padding: '12px',
                                        color: '#ef4444',
                                        fontSize: '14px',
                                        marginBottom: '16px'
                                    }}>
                                        ⚠️ Saldo tidak cukup! Tersedia: {formatRupiah(selectedWallet?.balance || 0)}
                                    </div>
                                ) : null;
                            })()}

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowBuyModal(false)}>
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={
                                        submitting ||
                                        !!(buyForm.walletId && buyForm.grams && buyForm.pricePerGram &&
                                            (parseFloat(buyForm.grams) * parseFloat(buyForm.pricePerGram)) > (wallets.find(w => w.id === buyForm.walletId)?.balance || 0))
                                    }
                                >
                                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                    Beli Emas
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Sell Modal */}
            {showSellModal && (
                <div className="modal-overlay" onClick={() => setShowSellModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>🪙 Jual Emas</h2>
                        <form onSubmit={handleSell}>
                            <div className="form-group">
                                <label>Dari Platform</label>
                                <select
                                    value={sellForm.holdingId}
                                    onChange={(e) => setSellForm({ ...sellForm, holdingId: e.target.value })}
                                    required
                                    className="form-select"
                                >
                                    <option value="">Pilih holding</option>
                                    {summary.holdings.map((h) => (
                                        <option key={h.id} value={h.id}>{h.platform} ({h.total_grams.toFixed(4)}g)</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Jumlah (gram)</label>
                                    <input
                                        type="number"
                                        step="0.0001"
                                        min="0.0001"
                                        value={sellForm.grams}
                                        onChange={(e) => setSellForm({ ...sellForm, grams: e.target.value })}
                                        required
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Harga/gram (Rp)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={sellForm.pricePerGram}
                                        onChange={(e) => setSellForm({ ...sellForm, pricePerGram: e.target.value })}
                                        required
                                        className="form-input"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Terima di Wallet</label>
                                <select
                                    value={sellForm.walletId}
                                    onChange={(e) => setSellForm({ ...sellForm, walletId: e.target.value })}
                                    required
                                    className="form-select"
                                >
                                    <option value="">Pilih wallet</option>
                                    {wallets.map((w) => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Catatan (opsional)</label>
                                <input
                                    type="text"
                                    value={sellForm.notes}
                                    onChange={(e) => setSellForm({ ...sellForm, notes: e.target.value })}
                                    className="form-input"
                                />
                            </div>

                            {sellForm.grams && sellForm.pricePerGram && (
                                <div className="total-preview success">
                                    <span>Akan Diterima</span>
                                    <strong>{formatRupiah(parseFloat(sellForm.grams) * parseFloat(sellForm.pricePerGram))}</strong>
                                </div>
                            )}

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowSellModal(false)}>
                                    Batal
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <TrendingDown size={16} />}
                                    Jual Emas
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`
                .header-actions {
                    display: flex;
                    gap: 8px;
                }

                .holdings-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .holding-card {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 16px;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                }

                .holding-icon {
                    font-size: 24px;
                }

                .holding-info {
                    flex: 1;
                }

                .holding-info h3 {
                    font-size: 14px;
                    font-weight: 600;
                }

                .holding-info p {
                    font-size: 12px;
                    color: var(--text-muted);
                }

                .transactions-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .transaction-row {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-md);
                }

                .tx-icon {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .tx-icon.buy {
                    background: rgba(239, 68, 68, 0.1);
                    color: var(--accent-red);
                }

                .tx-icon.sell {
                    background: rgba(34, 197, 94, 0.1);
                    color: var(--accent-green);
                }

                .tx-info {
                    flex: 1;
                }

                .tx-type {
                    font-weight: 500;
                    display: block;
                }

                .tx-date {
                    font-size: 12px;
                    color: var(--text-muted);
                }

                .tx-details {
                    text-align: right;
                }

                .tx-grams {
                    display: block;
                    font-weight: 500;
                }

                .tx-price {
                    font-size: 12px;
                    color: var(--text-muted);
                }

                .tx-amount {
                    font-weight: 600;
                    min-width: 120px;
                    text-align: right;
                }

                .tx-amount.buy {
                    color: var(--accent-red);
                }

                .tx-amount.sell {
                    color: var(--accent-green);
                }

                .form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                }

                .total-preview {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px;
                    background: var(--bg-tertiary);
                    border-radius: var(--radius-md);
                    margin-top: 8px;
                }

                .total-preview span {
                    color: var(--text-muted);
                }

                .total-preview strong {
                    font-size: 18px;
                }

                .total-preview.success strong {
                    color: var(--accent-green);
                }

                .section {
                    margin-top: 24px;
                }

                .section-title {
                    font-size: 16px;
                    font-weight: 600;
                    margin-bottom: 12px;
                }

                .empty-state {
                    text-align: center;
                    padding: 40px 20px;
                    color: var(--text-muted);
                    background: var(--bg-secondary);
                    border-radius: var(--radius-lg);
                }

                .modal-actions {
                    display: flex;
                    gap: 12px;
                    margin-top: 20px;
                }
                
                .pnl-indicator {
                    font-size: 14px;
                    font-weight: 500;
                    margin-top: 4px;
                }
                
                .pnl-indicator.success {
                    color: var(--accent-green);
                }
                
                .pnl-indicator.danger {
                    color: var(--accent-red);
                }

                .modal-actions .btn {
                    flex: 1;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }

                @media (max-width: 480px) {
                    .form-row {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
}
