'use client';

import { useState } from 'react';
import { Plus, Loader2, AlertCircle } from 'lucide-react';
import { formatRupiah } from '@/types';
import { useCreditCards } from '@/lib/hooks/useData';

export default function CreditCardsPage() {
  const { cards, loading, totalBalance, totalLimit, create, remove } = useCreditCards();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    limit: 0,
    billingDate: 25,
    dueDate: 10,
  });
  const [submitting, setSubmitting] = useState(false);

  const getDaysUntilDue = (dueDate: number) => {
    const today = new Date();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), dueDate);
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, dueDate);
    const targetDate = thisMonth > today ? thisMonth : nextMonth;
    return Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await create({
        name: formData.name,
        limit: formData.limit,
        currentBalance: 0,
        billingDate: formData.billingDate,
        dueDate: formData.dueDate,
        color: '#ffffff',
      });
      setShowModal(false);
      setFormData({ name: '', limit: 0, billingDate: 25, dueDate: 10 });
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const totalAvailable = totalLimit - totalBalance;

  return (
    <div className="credit-cards-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Credit Cards</h1>
          <p className="page-subtitle">Manage your credit</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} />
          Add Card
        </button>
      </header>

      <div className="bento-grid">
        {/* Summary */}
        <div className="bento-card bento-1x1">
          <p className="text-tiny">Total Limit</p>
          {loading ? (
            <Loader2 className="animate-spin" style={{ marginTop: 'auto' }} />
          ) : (
            <p className="text-large" style={{ marginTop: 'auto' }}>{formatRupiah(totalLimit)}</p>
          )}
        </div>

        <div className="bento-card bento-1x1">
          <p className="text-tiny">Outstanding</p>
          {loading ? (
            <Loader2 className="animate-spin" style={{ marginTop: 'auto' }} />
          ) : (
            <p className="text-large text-red" style={{ marginTop: 'auto' }}>{formatRupiah(totalBalance)}</p>
          )}
        </div>

        <div className="bento-card bento-1x1">
          <p className="text-tiny">Available</p>
          {loading ? (
            <Loader2 className="animate-spin" style={{ marginTop: 'auto' }} />
          ) : (
            <p className="text-large text-green" style={{ marginTop: 'auto' }}>{formatRupiah(totalAvailable)}</p>
          )}
        </div>

        <div className="bento-card bento-1x1">
          <p className="text-tiny">Cards</p>
          <p className="text-display" style={{ marginTop: 'auto' }}>{cards.length}</p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bento-card bento-4x1" style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 className="animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!loading && cards.length === 0 && (
          <div className="bento-card bento-4x1">
            <div className="empty-state">
              <div className="icon">💳</div>
              <p className="title">No credit cards</p>
              <p className="desc">Add a card to track your credit spending</p>
            </div>
          </div>
        )}

        {/* Card List */}
        {!loading && cards.map((card) => {
          const usage = card.limit > 0 ? ((card.currentBalance || 0) / card.limit) * 100 : 0;
          const daysUntilDue = getDaysUntilDue(card.dueDate || 10);

          return (
            <div key={card.id} className="bento-card bento-2x1 credit-card-item">
              <div className="bento-card-header">
                <span className="bento-card-title">💳 {card.name}</span>
                {daysUntilDue <= 7 && (
                  <span className="due-badge">
                    <AlertCircle size={12} />
                    {daysUntilDue}d
                  </span>
                )}
              </div>

              <div className="card-details">
                <div className="card-row">
                  <span className="text-small">Balance</span>
                  <span className="text-medium text-red">{formatRupiah(card.currentBalance || 0)}</span>
                </div>
                <div className="card-row">
                  <span className="text-small">Limit</span>
                  <span className="text-medium">{formatRupiah(card.limit || 0)}</span>
                </div>
                <div className="card-row">
                  <span className="text-small">Due Date</span>
                  <span className="text-medium">Every {card.dueDate || 10}th</span>
                </div>
              </div>

              <div className="usage-section">
                <div className="progress-bar">
                  <div
                    className="fill"
                    style={{
                      width: `${usage}%`,
                      background: usage > 80 ? 'var(--accent-red)' : 'var(--text-primary)'
                    }}
                  ></div>
                </div>
                <span className="text-tiny">{usage.toFixed(0)}% used</span>
              </div>
            </div>
          );
        })}
      </div>

      <button className="fab" onClick={() => setShowModal(true)}>
        <Plus size={24} />
      </button>

      {/* Modal - Simplified */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Credit Card</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Card Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. BCA Platinum, Mandiri Gold"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <p className="text-tiny" style={{ marginTop: '4px' }}>Name it however you like</p>
              </div>
              <div className="form-group">
                <label className="form-label">Credit Limit</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="10000000"
                  value={formData.limit || ''}
                  onChange={(e) => setFormData({ ...formData, limit: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Billing Date</label>
                  <input
                    type="number"
                    className="form-input"
                    min={1}
                    max={31}
                    value={formData.billingDate}
                    onChange={(e) => setFormData({ ...formData, billingDate: parseInt(e.target.value) || 25 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input
                    type="number"
                    className="form-input"
                    min={1}
                    max={31}
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: parseInt(e.target.value) || 10 })}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={submitting}
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : 'Save Card'}
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
        
        .credit-card-item {
          gap: 12px;
        }
        
        .card-details {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
        }
        
        .card-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .due-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          padding: 4px 8px;
          background: rgba(239, 68, 68, 0.15);
          color: var(--accent-red);
          border-radius: var(--radius-full);
        }
        
        .usage-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .usage-section .progress-bar {
          flex: 1;
        }
      `}</style>
    </div>
  );
}
