'use client';

import { useState, useMemo } from 'react';
import { Plus, Search, Loader2 } from 'lucide-react';
import { formatRupiah } from '@/types';
import TransactionModal from '@/components/transactions/TransactionModal';
import { useTransactions, useCategories, useWallets } from '@/lib/hooks/useData';

export default function TransactionsPage() {
  const { transactions, loading, refresh } = useTransactions();
  const { categories } = useCategories();
  const { wallets } = useWallets();
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState('');

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

    if (dateStr === today.toISOString().split('T')[0]) return 'Today';
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';
    return date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const handleModalClose = () => {
    setShowAddTransaction(false);
    refresh();
  };

  return (
    <div className="transactions-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">All your transactions</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddTransaction(true)}>
          <Plus size={18} />
          Add
        </button>
      </header>

      <div className="bento-grid">
        {/* Summary */}
        <div className="bento-card bento-1x1">
          <p className="text-tiny">Income</p>
          <p className="text-large text-green" style={{ marginTop: 'auto' }}>
            +{formatRupiah(totalIncome)}
          </p>
        </div>

        <div className="bento-card bento-1x1">
          <p className="text-tiny">Expense</p>
          <p className="text-large text-red" style={{ marginTop: 'auto' }}>
            -{formatRupiah(totalExpense)}
          </p>
        </div>

        <div className="bento-card bento-1x1">
          <p className="text-tiny">Net</p>
          <p className={`text-large ${totalIncome - totalExpense >= 0 ? 'text-green' : 'text-red'}`} style={{ marginTop: 'auto' }}>
            {formatRupiah(totalIncome - totalExpense)}
          </p>
        </div>

        <div className="bento-card bento-1x1">
          <p className="text-tiny">Count</p>
          <p className="text-display" style={{ marginTop: 'auto' }}>{filteredTransactions.length}</p>
        </div>

        {/* Search & Filter */}
        <div className="bento-card bento-4x1" style={{ flexDirection: 'row', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="filter-tabs">
            {(['all', 'income', 'expense'] as const).map((type) => (
              <button
                key={type}
                className={`filter-tab ${filterType === type ? 'active' : ''}`}
                onClick={() => setFilterType(type)}
              >
                {type === 'all' ? 'All' : type === 'income' ? 'Income' : 'Expense'}
              </button>
            ))}
          </div>
        </div>

        {/* Transaction List */}
        <div className="bento-card bento-4x2" style={{ overflow: 'auto' }}>
          <div className="bento-card-header">
            <span className="bento-card-title">History</span>
          </div>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <Loader2 className="animate-spin" />
            </div>
          ) : Object.keys(groupedByDate).length === 0 ? (
            <div className="empty-state">
              <div className="icon">📝</div>
              <p className="title">No transactions</p>
              <p className="desc">Add your first transaction to get started</p>
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
                        <div key={tx.id} className="transaction-item">
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

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        
        .search-box {
          flex: 1;
          min-width: 200px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          color: var(--text-muted);
        }
        
        .search-box input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 14px;
          outline: none;
        }
        
        .filter-tabs {
          display: flex;
          gap: 8px;
        }
        
        .filter-tab {
          padding: 8px 16px;
          border: 1px solid var(--border-color);
          background: transparent;
          color: var(--text-muted);
          font-size: 13px;
          font-weight: 500;
          border-radius: var(--radius-full);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        
        .filter-tab:hover {
          border-color: var(--border-color-strong);
        }
        
        .filter-tab.active {
          background: var(--text-primary);
          border-color: var(--text-primary);
          color: var(--bg-primary);
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
      `}</style>
    </div>
  );
}
