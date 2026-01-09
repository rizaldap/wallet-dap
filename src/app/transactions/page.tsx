'use client';

import { useState, useMemo } from 'react';
import { Plus, Search, Loader2, X, Trash2 } from 'lucide-react';
import { formatRupiah, Transaction } from '@/types';
import TransactionModal from '@/components/transactions/TransactionModal';
import { useTransactions, useCategories, useWallets } from '@/lib/hooks/useData';

export default function TransactionsPage() {
  const { transactions, loading, refresh } = useTransactions();
  const { categories } = useCategories();
  const { wallets } = useWallets();
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Create lookup maps
  const categoryMap = useMemo(() => {
    const map = new Map<string, { name: string; icon: string }>();
    categories.forEach(c => map.set(c.id, { name: c.name, icon: c.icon }));
    return map;
  }, [categories]);

  const walletMap = useMemo(() => {
    const map = new Map<string, string>();
    wallets.forEach(w => map.set(w.id, w.name));
    return map;
  }, [wallets]);

  const filteredTransactions = transactions.filter(tx => {
    if (filterType !== 'all' && tx.type !== filterType) return false;
    if (searchQuery && !tx.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Group by date
  const groupedByDate = filteredTransactions.reduce((acc, tx) => {
    const date = tx.date?.split('T')[0] || 'Unknown';
    if (!acc[date]) acc[date] = [];
    acc[date].push(tx);
    return acc;
  }, {} as Record<string, typeof transactions>);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === today.toISOString().split('T')[0]) return 'Hari Ini';
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Kemarin';
    return date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const handleModalClose = () => {
    setShowAddTransaction(false);
    refresh();
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Hapus transaksi ini?')) return;
    setDeleting(true);
    try {
      await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
      setSelectedTx(null);
      await refresh();
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="transactions-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Transaksi</h1>
          <p className="page-subtitle">Semua transaksimu</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddTransaction(true)}>
          <Plus size={18} />
          Tambah
        </button>
      </header>

      <div className="bento-grid">
        {/* Summary */}
        <div className="bento-card bento-1x1">
          <p className="text-tiny">Pemasukan</p>
          <p className="text-large text-green" style={{ marginTop: 'auto' }}>
            +{formatRupiah(totalIncome)}
          </p>
        </div>

        <div className="bento-card bento-1x1">
          <p className="text-tiny">Pengeluaran</p>
          <p className="text-large text-red" style={{ marginTop: 'auto' }}>
            -{formatRupiah(totalExpense)}
          </p>
        </div>

        <div className="bento-card bento-1x1">
          <p className="text-tiny">Bersih</p>
          <p className={`text-large ${totalIncome - totalExpense >= 0 ? 'text-green' : 'text-red'}`} style={{ marginTop: 'auto' }}>
            {formatRupiah(totalIncome - totalExpense)}
          </p>
        </div>

        <div className="bento-card bento-1x1">
          <p className="text-tiny">Total</p>
          <p className="text-display" style={{ marginTop: 'auto' }}>{filteredTransactions.length}</p>
        </div>

        {/* Search & Filter - Fixed Layout */}
        <div
          className="bento-card bento-4x1"
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '16px',
            padding: '16px 20px',
          }}
        >
          {/* Search Box */}
          <div
            style={{
              flex: 1,
              minWidth: '200px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 16px',
              background: 'var(--bg-tertiary)',
              border: searchFocused ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
              borderRadius: '24px',
              transition: 'all 0.2s ease',
              boxShadow: searchFocused ? '0 0 0 3px rgba(99, 102, 241, 0.1)' : 'none',
            }}
          >
            <Search size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Cari transaksi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-secondary)',
                  border: 'none',
                  borderRadius: '50%',
                  color: 'var(--text-muted)',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >×</button>
            )}
          </div>

          {/* Filter Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {(['all', 'income', 'expense'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                style={{
                  padding: '8px 16px',
                  background: filterType === type ? 'var(--accent-primary)' : 'transparent',
                  border: filterType === type ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
                  borderRadius: '20px',
                  color: filterType === type ? 'white' : 'var(--text-muted)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {type === 'all' ? 'Semua' : type === 'income' ? 'Masuk' : 'Keluar'}
              </button>
            ))}
          </div>
        </div>

        {/* Transaction List */}
        <div className="bento-card bento-4x2" style={{ overflow: 'auto' }}>
          <div className="bento-card-header">
            <span className="bento-card-title">Riwayat</span>
          </div>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <Loader2 className="animate-spin" />
            </div>
          ) : Object.keys(groupedByDate).length === 0 ? (
            <div className="empty-state">
              <div className="icon">📝</div>
              <p className="title">Belum ada transaksi</p>
              <p className="desc">Tambah transaksi pertamamu</p>
            </div>
          ) : (
            <div className="transaction-groups">
              {Object.entries(groupedByDate).map(([date, txs]) => (
                <div key={date} className="transaction-group">
                  <p className="group-date">{formatDate(date)}</p>
                  <div className="transaction-list">
                    {txs.map((tx) => {
                      const category = tx.categoryId ? categoryMap.get(tx.categoryId) : null;
                      const walletName = tx.walletId ? walletMap.get(tx.walletId) : '';
                      return (
                        <div
                          key={tx.id}
                          className="transaction-item"
                          onClick={() => setSelectedTx(tx)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="transaction-icon">
                            {category?.icon || '💸'}
                          </div>
                          <div className="transaction-info">
                            <p className="transaction-desc">{tx.description}</p>
                            <p className="transaction-category">
                              {category?.name || 'Uncategorized'}{walletName ? ` · ${walletName}` : ''}
                            </p>
                          </div>
                          <p className={`transaction-amount ${tx.type === 'income' ? 'income' : 'expense'}`}>
                            {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <button className="fab" onClick={() => setShowAddTransaction(true)}>
        <Plus size={24} />
      </button>

      {showAddTransaction && (
        <TransactionModal onClose={handleModalClose} />
      )}

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <div className="modal-overlay" onClick={() => setSelectedTx(null)}>
          <div className="modal-content animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Detail Transaksi</h2>
              <button className="modal-close" onClick={() => setSelectedTx(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Amount */}
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  {selectedTx.type === 'income' ? 'PEMASUKAN' : selectedTx.type === 'expense' ? 'PENGELUARAN' : 'TRANSFER'}
                </p>
                <p style={{
                  fontSize: '32px',
                  fontWeight: 700,
                  color: selectedTx.type === 'income' ? 'var(--success)' : 'var(--error)'
                }}>
                  {selectedTx.type === 'income' ? '+' : '-'}{formatRupiah(selectedTx.amount)}
                </p>
              </div>

              {/* Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-tertiary)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Deskripsi</span>
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>{selectedTx.description}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Tanggal</span>
                  <span style={{ fontSize: '14px' }}>{new Date(selectedTx.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Kategori</span>
                  <span style={{ fontSize: '14px' }}>
                    {selectedTx.categoryId ? (categoryMap.get(selectedTx.categoryId)?.icon + ' ' + categoryMap.get(selectedTx.categoryId)?.name) : 'Uncategorized'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Wallet</span>
                  <span style={{ fontSize: '14px' }}>
                    {selectedTx.walletId ? walletMap.get(selectedTx.walletId) : '-'}
                  </span>
                </div>
                {selectedTx.notes && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Catatan</span>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{selectedTx.notes}</span>
                  </div>
                )}
              </div>

              {/* Delete Button */}
              <button
                onClick={() => handleDeleteTransaction(selectedTx.id)}
                disabled={deleting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  color: '#ef4444',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Hapus Transaksi
              </button>
            </div>
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
        
        .search-filter-container {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%);
          backdrop-filter: blur(10px);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          flex-wrap: wrap;
        }
        
        .search-box {
          flex: 1;
          min-width: 220px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: var(--radius-full);
          transition: all 0.2s ease;
        }
        
        .search-box.focused {
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        
        .search-icon {
          color: var(--text-muted);
          flex-shrink: 0;
        }
        
        .search-box input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 14px;
          outline: none;
        }
        
        .search-box input::placeholder {
          color: var(--text-muted);
        }
        
        .clear-btn {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-tertiary);
          border: none;
          border-radius: 50%;
          color: var(--text-muted);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        
        .clear-btn:hover {
          background: var(--text-muted);
          color: var(--bg-primary);
        }
        
        .filter-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .filter-icon {
          color: var(--text-muted);
        }
        
        .filter-pills {
          display: flex;
          gap: 8px;
        }
        
        .filter-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-muted);
          font-size: 13px;
          font-weight: 500;
          border-radius: var(--radius-full);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .filter-pill:hover {
          background: rgba(255,255,255,0.03);
          border-color: var(--text-muted);
        }
        
        .filter-pill.active {
          background: var(--accent-primary);
          border-color: var(--accent-primary);
          color: white;
        }
        
        .filter-pill .pill-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
          opacity: 0.6;
        }
        
        .filter-pill.active .pill-dot {
          opacity: 1;
          background: white;
        }
        
        .transaction-groups {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        
        .group-date {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }

        @media (max-width: 600px) {
          .search-filter-container {
            flex-direction: column;
            align-items: stretch;
          }
          
          .search-box {
            min-width: 100%;
          }
          
          .filter-group {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
