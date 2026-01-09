'use client';

import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { formatRupiah } from '@/types';
import { useWallets } from '@/lib/hooks/useData';

const walletTypeLabels: Record<string, string> = {
  bank: 'Bank',
  'e-wallet': 'E-Wallet',
  cash: 'Cash',
  investment: 'Investment',
};

const defaultIcons: Record<string, string> = {
  bank: '🏦',
  'e-wallet': '📱',
  cash: '💵',
  investment: '📈',
};

export default function WalletsPage() {
  const { wallets, loading, totalBalance, create, remove } = useWallets();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'bank' as 'bank' | 'e-wallet' | 'cash' | 'investment',
    balance: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const walletsByType = wallets.reduce((acc, wallet) => {
    const type = wallet.type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(wallet);
    return acc;
  }, {} as Record<string, typeof wallets>);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await create({
        name: formData.name,
        type: formData.type,
        icon: defaultIcons[formData.type] || '💰',
        color: '#ffffff',
        initialBalance: parseInt(formData.balance) || 0,
        balance: parseInt(formData.balance) || 0,
      });
      setShowModal(false);
      setFormData({ name: '', type: 'bank', balance: '' });
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="wallets-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Wallets</h1>
          <p className="page-subtitle">Manage your accounts</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} />
          Add Wallet
        </button>
      </header>

      <div className="bento-grid">
        {/* Total Balance */}
        <div className="bento-card bento-2x1" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
          <p className="text-tiny">Total Balance</p>
          {loading ? (
            <Loader2 className="animate-spin" style={{ marginTop: '12px' }} />
          ) : (
            <>
              <p className="text-display" style={{ marginTop: '8px' }}>{formatRupiah(totalBalance)}</p>
              <p className="text-small" style={{ marginTop: '8px' }}>{wallets.length} wallet{wallets.length !== 1 ? 's' : ''}</p>
            </>
          )}
        </div>

        {/* Quick Stats */}
        <div className="bento-card bento-1x1">
          <p className="text-tiny">Active</p>
          <p className="text-display" style={{ marginTop: 'auto' }}>{wallets.length}</p>
        </div>

        <div className="bento-card bento-1x1">
          <p className="text-tiny">Types</p>
          <p className="text-display" style={{ marginTop: 'auto' }}>{Object.keys(walletsByType).length}</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bento-card bento-4x1" style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 className="animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!loading && wallets.length === 0 && (
          <div className="bento-card bento-4x1">
            <div className="empty-state">
              <div className="icon">💰</div>
              <p className="title">No wallets yet</p>
              <p className="desc">Add your first wallet to start tracking</p>
            </div>
          </div>
        )}

        {/* Wallet Groups */}
        {!loading && Object.entries(walletsByType).map(([type, typeWallets]) => (
          <div key={type} className="bento-card bento-2x1">
            <div className="bento-card-header">
              <span className="bento-card-title">{walletTypeLabels[type] || type}</span>
              <span className="text-small">{typeWallets.length}</span>
            </div>
            <div className="wallet-list" style={{ marginTop: '8px' }}>
              {typeWallets.map((wallet) => (
                <div key={wallet.id} className="wallet-item" style={{ padding: '10px 0' }}>
                  <div className="wallet-icon">{wallet.icon || '💰'}</div>
                  <div className="wallet-info">
                    <p className="wallet-name">{wallet.name}</p>
                  </div>
                  <p className="wallet-balance">{formatRupiah(wallet.balance || 0)}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button className="fab" onClick={() => setShowModal(true)}>
        <Plus size={24} />
      </button>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Wallet</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. BCA, DANA, Cash"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select
                  className="form-select"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as typeof formData.type })}
                  required
                >
                  <option value="bank">Bank</option>
                  <option value="e-wallet">E-Wallet</option>
                  <option value="cash">Cash</option>
                  <option value="investment">Investment</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Current Balance</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="form-input"
                  placeholder="0"
                  value={formData.balance}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setFormData({ ...formData, balance: val });
                  }}
                />
                {formData.balance && (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    {formatRupiah(parseInt(formData.balance) || 0)}
                  </span>
                )}
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={submitting}
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : 'Save Wallet'}
              </button>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
