'use client';

import { formatRupiah } from '@/types';
import { useMonthlySummary, useCategorySummary, useTransactions, useWallets } from '@/lib/hooks/useData';
import { useGoals, useGold } from '@/lib/hooks/useGoals';
import { Loader2, Target, Coins } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

// Colors for pie chart
const COLORS = ['#ffffff', '#a1a1a1', '#666666', '#444444', '#333333', '#222222'];

export default function AnalyticsPage() {
  const { income, expense, net, loading: summaryLoading } = useMonthlySummary();
  const { categories: categoryData, loading: categoryLoading } = useCategorySummary();
  const { transactions, loading: txLoading } = useTransactions();
  const { wallets, totalBalance, loading: walletsLoading } = useWallets();
  const { goals, loading: goalsLoading } = useGoals();
  const { summary: goldSummary, transactions: goldTransactions, loading: goldLoading } = useGold();

  const loading = summaryLoading || categoryLoading || txLoading || walletsLoading || goalsLoading || goldLoading;

  // Goals calculations
  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const totalGoalsTarget = activeGoals.reduce((sum, g) => sum + g.target_amount, 0);
  const totalGoalsCurrent = activeGoals.reduce((sum, g) => sum + g.current_amount, 0);
  const goalsProgress = totalGoalsTarget > 0 ? (totalGoalsCurrent / totalGoalsTarget) * 100 : 0;

  // Gold calculations
  const totalGoldInvested = goldTransactions.filter(tx => tx.type === 'buy').reduce((sum, tx) => sum + tx.total_amount, 0);
  const totalGoldSold = goldTransactions.filter(tx => tx.type === 'sell').reduce((sum, tx) => sum + tx.total_amount, 0);
  const goldNetInvestment = totalGoldInvested - totalGoldSold;

  // Transform category data for chart
  const chartCategoryData = categoryData.map((cat, idx) => ({
    name: cat.name,
    value: cat.total,
    color: COLORS[idx % COLORS.length],
    icon: cat.icon,
  }));

  const totalExpense = expense;
  const avgDailyExpense = expense / 30;
  const highestCategory = chartCategoryData.length > 0
    ? chartCategoryData.reduce((a, b) => a.value > b.value ? a : b)
    : { name: 'N/A', value: 0 };

  // Get current month data for chart
  const currentMonthData = [
    { name: 'Income', value: income },
    { name: 'Expense', value: expense },
    { name: 'Net', value: net },
  ];

  return (
    <div className="analytics-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Financial insights</p>
        </div>
      </header>

      {/* Bento Grid */}
      <div className="bento-grid">
        {/* Stats Row */}
        <div className="bento-card bento-1x1">
          <p className="text-tiny">Daily Average</p>
          <p className="text-large" style={{ marginTop: 'auto' }}>{formatRupiah(avgDailyExpense)}</p>
        </div>

        <div className="bento-card bento-1x1">
          <p className="text-tiny">Top Category</p>
          <p className="text-large" style={{ marginTop: 'auto' }}>{highestCategory.name}</p>
        </div>

        <div className="bento-card bento-1x1">
          <p className="text-tiny">Transactions</p>
          <p className="text-display" style={{ marginTop: 'auto' }}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : transactions.length}
          </p>
        </div>

        <div className="bento-card bento-1x1">
          <p className="text-tiny">Total Balance</p>
          <p className="text-large" style={{ marginTop: 'auto' }}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : formatRupiah(totalBalance)}
          </p>
        </div>

        {/* This Month Summary */}
        <div className="bento-card bento-4x2">
          <div className="bento-card-header">
            <span className="bento-card-title">This Month</span>
            <span className="text-small">{new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>
          </div>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : (
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={currentMonthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#666" fontSize={12} />
                  <YAxis stroke="#666" fontSize={12} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #222', borderRadius: '8px' }}
                    formatter={(value) => formatRupiah(Number(value))}
                  />
                  <Bar dataKey="value" fill="#ffffff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="bento-card bento-2x2">
          <div className="bento-card-header">
            <span className="bento-card-title">By Category</span>
          </div>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : chartCategoryData.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <p className="text-muted">No expenses this month</p>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: 1 }}>
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie
                    data={chartCategoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1 }}>
                {chartCategoryData.slice(0, 5).map((cat, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: cat.color }}></span>
                    <span className="text-small" style={{ flex: 1 }}>{cat.icon} {cat.name}</span>
                    <span className="text-small">{totalExpense > 0 ? ((cat.value / totalExpense) * 100).toFixed(0) : 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Wallets Breakdown */}
        <div className="bento-card bento-2x2">
          <div className="bento-card-header">
            <span className="bento-card-title">Wallets</span>
          </div>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : wallets.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <p className="text-muted">No wallets yet</p>
            </div>
          ) : (
            <div style={{ flex: 1 }}>
              {wallets.slice(0, 5).map((wallet, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0' }}>
                  <span style={{ fontSize: '20px' }}>{wallet.icon}</span>
                  <span className="text-small" style={{ flex: 1 }}>{wallet.name}</span>
                  <span className="text-small">{formatRupiah(wallet.balance)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Goals Progress */}
        <div className="bento-card bento-2x1">
          <div className="bento-card-header">
            <span className="bento-card-title">Goals Progress</span>
            <Target size={16} className="text-muted" />
          </div>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : activeGoals.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <p className="text-muted">Belum ada goal aktif</p>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: 1 }}>
              <div style={{ textAlign: 'center' }}>
                <p className="text-display" style={{ color: '#22c55e' }}>{goalsProgress.toFixed(0)}%</p>
                <p className="text-tiny">Progress</p>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="text-small">{formatRupiah(totalGoalsCurrent)}</span>
                  <span className="text-small text-muted">{formatRupiah(totalGoalsTarget)}</span>
                </div>
                <div className="progress-bar">
                  <div className="fill success" style={{ width: `${goalsProgress}%` }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                  <span className="text-tiny">{activeGoals.length} aktif</span>
                  <span className="text-tiny">{completedGoals.length} selesai</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Gold Investment */}
        <div className="bento-card bento-2x1">
          <div className="bento-card-header">
            <span className="bento-card-title">Gold Investment</span>
            <Coins size={16} style={{ color: '#f59e0b' }} />
          </div>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : goldSummary.totalGrams === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <p className="text-muted">Belum ada investasi emas</p>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: 1 }}>
              <div style={{ textAlign: 'center' }}>
                <p className="text-display" style={{ color: '#f59e0b' }}>{goldSummary.totalGrams.toFixed(2)}g</p>
                <p className="text-tiny">Total Emas</p>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span className="text-tiny">Total Beli</span>
                  <span className="text-small">{formatRupiah(totalGoldInvested)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span className="text-tiny">Total Jual</span>
                  <span className="text-small">{formatRupiah(totalGoldSold)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <span className="text-tiny">Net Investment</span>
                  <span className="text-small" style={{ color: '#f59e0b' }}>{formatRupiah(goldNetInvestment)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Insights */}
        <div className="bento-card bento-4x1">
          <div className="bento-card-header">
            <span className="bento-card-title">Insights</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', display: 'flex', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>📊</span>
              <p className="text-small">
                {highestCategory.name !== 'N/A'
                  ? <><strong>{highestCategory.name}</strong> is your top expense category this month.</>
                  : 'Start tracking expenses to see insights!'}
              </p>
            </div>
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', display: 'flex', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>💰</span>
              <p className="text-small">
                {income > 0
                  ? <>You earned <strong className="text-green">{formatRupiah(income)}</strong> this month.</>
                  : 'Record your income to track your finances.'}
              </p>
            </div>
            <div style={{ padding: '12px', background: net >= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', display: 'flex', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>{net >= 0 ? '🎉' : '⚠️'}</span>
              <p className="text-small">
                {net >= 0
                  ? <>Great! You saved <strong className="text-green">{formatRupiah(net)}</strong> this month.</>
                  : <>Heads up! You overspent by <strong className="text-red">{formatRupiah(Math.abs(net))}</strong>.</>}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
