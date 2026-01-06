'use client';

import { formatRupiah } from '@/types';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowRight,
  Wallet,
  CreditCard,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import TransactionModal from '@/components/transactions/TransactionModal';
import { useWallets, useTransactions, useMonthlySummary, useCategorySummary, useCreditCards, useCategories } from '@/lib/hooks/useData';

export default function DashboardPage() {
  const [showAddTransaction, setShowAddTransaction] = useState(false);

  const { wallets, totalBalance, loading: walletsLoading } = useWallets();
  const { transactions, loading: txLoading } = useTransactions(5);
  const { income, expense, loading: summaryLoading } = useMonthlySummary();
  const { categories: categoryStats, loading: catLoading } = useCategorySummary();
  const { totalBalance: creditBalance, totalLimit: creditLimit, loading: ccLoading } = useCreditCards();
  const { categories } = useCategories();

  // Create a lookup map for categories and wallets
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

  const currentMonth = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const creditUsage = creditLimit > 0 ? (creditBalance / creditLimit) * 100 : 0;
  const isLoading = walletsLoading || txLoading || summaryLoading;

  const totalExpense = categoryStats.reduce((sum, c) => sum + c.total, 0);

  return (
    <>
      <div className="dashboard-page">
        <header className="page-header">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">{currentMonth}</p>
          </div>
        </header>

        <div className="bento-grid">

          {/* Balance Hero */}
          <div className="bento-card bento-2x1 balance-hero">
            <p className="label">Total Balance</p>
            {walletsLoading ? (
              <Loader2 className="animate-spin" style={{ marginTop: '12px' }} />
            ) : (
              <p className="amount">{formatRupiah(totalBalance)}</p>
            )}
            <div className="stats">
              <div className="stat-item">
                <div className="stat-icon income">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <p className="stat-label">Income</p>
                  <p className="stat-value text-green">
                    {summaryLoading ? '...' : formatRupiah(income)}
                  </p>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-icon expense">
                  <TrendingDown size={16} />
                </div>
                <div>
                  <p className="stat-label">Expense</p>
                  <p className="stat-value text-red">
                    {summaryLoading ? '...' : formatRupiah(expense)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Savings */}
          <div className="bento-card bento-1x1">
            <div className="bento-card-header">
              <span className="bento-card-title">Savings</span>
              <Wallet size={16} className="text-muted" />
            </div>
            <div className="bento-card-content" style={{ justifyContent: 'flex-end' }}>
              {summaryLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <p className={`text-display ${income - expense >= 0 ? 'text-green' : 'text-red'}`}>
                  {formatRupiah(income - expense)}
                </p>
              )}
              <p className="text-small" style={{ marginTop: '8px' }}>this month</p>
            </div>
          </div>

          {/* Credit Usage */}
          <div className="bento-card bento-1x1">
            <div className="bento-card-header">
              <span className="bento-card-title">Credit</span>
              <CreditCard size={16} className="text-muted" />
            </div>
            <div className="bento-card-content" style={{ justifyContent: 'flex-end' }}>
              {ccLoading ? (
                <Loader2 className="animate-spin" />
              ) : creditLimit > 0 ? (
                <>
                  <p className="text-display">{creditUsage.toFixed(0)}%</p>
                  <div className="progress-bar" style={{ marginTop: '12px' }}>
                    <div className="fill" style={{ width: `${creditUsage}%` }}></div>
                  </div>
                </>
              ) : (
                <p className="text-muted">No cards</p>
              )}
            </div>
          </div>

          {/* Wallet List */}
          <div className="bento-card bento-2x2">
            <div className="bento-card-header">
              <span className="bento-card-title">Wallets</span>
              <Link href="/wallets" className="section-link">
                View All <ArrowRight size={14} />
              </Link>
            </div>
            {walletsLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                <Loader2 className="animate-spin" />
              </div>
            ) : wallets.length === 0 ? (
              <div className="empty-state">
                <p className="desc">No wallets yet</p>
              </div>
            ) : (
              <div className="wallet-list">
                {wallets.slice(0, 4).map((wallet) => (
                  <div key={wallet.id} className="wallet-item">
                    <div className="wallet-icon">{wallet.icon || '💰'}</div>
                    <div className="wallet-info">
                      <p className="wallet-name">{wallet.name}</p>
                      <p className="wallet-type">{wallet.type}</p>
                    </div>
                    <p className="wallet-balance">{formatRupiah(wallet.balance || 0)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Spending Categories */}
          <div className="bento-card bento-2x2">
            <div className="bento-card-header">
              <span className="bento-card-title">Spending</span>
              <Link href="/analytics" className="section-link">
                Details <ArrowRight size={14} />
              </Link>
            </div>
            {catLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                <Loader2 className="animate-spin" />
              </div>
            ) : categoryStats.length === 0 ? (
              <div className="empty-state">
                <p className="desc">No spending data</p>
              </div>
            ) : (
              <div className="bento-card-content">
                {categoryStats.slice(0, 4).map((cat, idx) => (
                  <div key={idx} className="category-item">
                    <div className="category-header">
                      <span className="category-name">
                        <span>{cat.icon}</span>
                        {cat.name}
                      </span>
                      <span className="category-amount">{formatRupiah(cat.total)}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="fill" style={{ width: `${(cat.total / totalExpense) * 100}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Transactions */}
          <div className="bento-card bento-4x1">
            <div className="bento-card-header">
              <span className="bento-card-title">Recent Transactions</span>
              <Link href="/transactions" className="section-link">
                View All <ArrowRight size={14} />
              </Link>
            </div>
            {txLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                <Loader2 className="animate-spin" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="empty-state">
                <p className="desc">No transactions yet. Add your first one!</p>
              </div>
            ) : (
              <div className="transaction-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0 24px' }}>
                {transactions.map((tx) => {
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
            )}
          </div>

        </div>

        <button
          className="fab"
          onClick={() => setShowAddTransaction(true)}
          aria-label="Add Transaction"
        >
          <Plus size={24} />
        </button>
      </div>

      {showAddTransaction && (
        <TransactionModal onClose={() => setShowAddTransaction(false)} />
      )}

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </>
  );
}
