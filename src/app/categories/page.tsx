'use client';

import { useState } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { useCategories } from '@/lib/hooks/useData';

const CATEGORY_ICONS = ['🍔', '🚗', '🎮', '🛍️', '💡', '📦', '💰', '🎁', '💻', '📈', '🏠', '💊', '✈️', '📚', '🎬', '☕', '🍕', '🎵', '💳', '🎉'];
const CATEGORY_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];

export default function CategoriesPage() {
    const { incomeCategories, expenseCategories, loading, refresh } = useCategories();
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        icon: '🍔',
        color: '#3b82f6',
        type: 'expense' as 'income' | 'expense',
    });
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;

        setSubmitting(true);
        try {
            await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            setShowModal(false);
            setFormData({ name: '', icon: '🍔', color: '#3b82f6', type: 'expense' });
            await refresh();
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Hapus kategori ini?')) return;
        setDeleting(id);
        try {
            await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
            await refresh();
        } catch (err) {
            console.error(err);
        } finally {
            setDeleting(null);
        }
    };

    return (
        <div className="categories-page">
            <header className="page-header">
                <div>
                    <h1 className="page-title">Kategori</h1>
                    <p className="page-subtitle">Kelola kategori transaksimu</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={18} />
                    Tambah
                </button>
            </header>

            <div className="bento-grid">
                {/* Stats */}
                <div className="bento-card bento-1x1">
                    <p className="text-tiny">Pengeluaran</p>
                    <p className="text-display" style={{ marginTop: 'auto' }}>{expenseCategories.length}</p>
                </div>
                <div className="bento-card bento-1x1">
                    <p className="text-tiny">Pemasukan</p>
                    <p className="text-display" style={{ marginTop: 'auto' }}>{incomeCategories.length}</p>
                </div>
                <div className="bento-card bento-2x1" style={{ justifyContent: 'center', alignItems: 'center' }}>
                    <p className="text-tiny">Total Kategori</p>
                    <p className="text-display">{incomeCategories.length + expenseCategories.length}</p>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="bento-card bento-4x1" style={{ alignItems: 'center', justifyContent: 'center' }}>
                        <Loader2 className="animate-spin" />
                    </div>
                )}

                {/* Expense Categories */}
                {!loading && (
                    <div className="bento-card bento-2x2">
                        <div className="bento-card-header">
                            <span className="bento-card-title">💸 Pengeluaran</span>
                        </div>
                        {expenseCategories.length === 0 ? (
                            <div className="empty-state">
                                <p className="desc">Belum ada kategori pengeluaran</p>
                            </div>
                        ) : (
                            <div className="category-list">
                                {expenseCategories.map((cat) => (
                                    <div key={cat.id} className="category-item">
                                        <span className="category-icon" style={{ backgroundColor: cat.color + '20' }}>{cat.icon}</span>
                                        <span className="category-name">{cat.name}</span>
                                        <button
                                            className="delete-btn"
                                            onClick={() => handleDelete(cat.id)}
                                            disabled={deleting === cat.id}
                                        >
                                            {deleting === cat.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Income Categories */}
                {!loading && (
                    <div className="bento-card bento-2x2">
                        <div className="bento-card-header">
                            <span className="bento-card-title">💰 Pemasukan</span>
                        </div>
                        {incomeCategories.length === 0 ? (
                            <div className="empty-state">
                                <p className="desc">Belum ada kategori pemasukan</p>
                            </div>
                        ) : (
                            <div className="category-list">
                                {incomeCategories.map((cat) => (
                                    <div key={cat.id} className="category-item">
                                        <span className="category-icon" style={{ backgroundColor: cat.color + '20' }}>{cat.icon}</span>
                                        <span className="category-name">{cat.name}</span>
                                        <button
                                            className="delete-btn"
                                            onClick={() => handleDelete(cat.id)}
                                            disabled={deleting === cat.id}
                                        >
                                            {deleting === cat.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <button className="fab" onClick={() => setShowModal(true)}>
                <Plus size={24} />
            </button>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content animate-slide-up" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Tambah Kategori</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            {/* Type Toggle */}
                            <div className="form-group">
                                <label className="form-label">Tipe</label>
                                <div className="type-toggle">
                                    <button
                                        type="button"
                                        className={`toggle-btn ${formData.type === 'expense' ? 'active expense' : ''}`}
                                        onClick={() => setFormData({ ...formData, type: 'expense' })}
                                    >
                                        💸 Pengeluaran
                                    </button>
                                    <button
                                        type="button"
                                        className={`toggle-btn ${formData.type === 'income' ? 'active income' : ''}`}
                                        onClick={() => setFormData({ ...formData, type: 'income' })}
                                    >
                                        💰 Pemasukan
                                    </button>
                                </div>
                            </div>

                            {/* Name */}
                            <div className="form-group">
                                <label className="form-label">Nama Kategori</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Contoh: Makanan, Gaji..."
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            {/* Icon Picker */}
                            <div className="form-group">
                                <label className="form-label">Icon</label>
                                <div className="icon-grid">
                                    {CATEGORY_ICONS.map((icon) => (
                                        <button
                                            key={icon}
                                            type="button"
                                            className={`icon-btn ${formData.icon === icon ? 'active' : ''}`}
                                            onClick={() => setFormData({ ...formData, icon })}
                                        >
                                            {icon}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Color Picker */}
                            <div className="form-group">
                                <label className="form-label">Warna</label>
                                <div className="color-grid">
                                    {CATEGORY_COLORS.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            className={`color-btn ${formData.color === color ? 'active' : ''}`}
                                            style={{ backgroundColor: color }}
                                            onClick={() => setFormData({ ...formData, color })}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Preview */}
                            <div className="form-group">
                                <label className="form-label">Preview</label>
                                <div className="preview-chip" style={{ backgroundColor: formData.color + '20', borderColor: formData.color }}>
                                    <span>{formData.icon}</span>
                                    <span>{formData.name || 'Nama Kategori'}</span>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{ width: '100%' }}
                                disabled={submitting}
                            >
                                {submitting ? <Loader2 size={18} className="animate-spin" /> : 'Simpan Kategori'}
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

        .category-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 12px;
          overflow-y: auto;
          max-height: 280px;
        }

        .category-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: var(--bg-tertiary);
          border-radius: var(--radius-md);
        }

        .category-icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          border-radius: var(--radius-md);
        }

        .category-name {
          flex: 1;
          font-size: 14px;
          font-weight: 500;
        }

        .delete-btn {
          padding: 6px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          border-radius: var(--radius-sm);
          transition: all 0.15s;
        }

        .delete-btn:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        .type-toggle {
          display: flex;
          gap: 8px;
        }

        .toggle-btn {
          flex: 1;
          padding: 10px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          color: var(--text-muted);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .toggle-btn:hover {
          border-color: var(--text-muted);
        }

        .toggle-btn.active.expense {
          background: rgba(239, 68, 68, 0.1);
          border-color: #ef4444;
          color: #ef4444;
        }

        .toggle-btn.active.income {
          background: rgba(34, 197, 94, 0.1);
          border-color: #22c55e;
          color: #22c55e;
        }

        .icon-grid {
          display: grid;
          grid-template-columns: repeat(10, 1fr);
          gap: 6px;
        }

        .icon-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.15s;
        }

        .icon-btn:hover {
          border-color: var(--text-muted);
        }

        .icon-btn.active {
          background: var(--accent-primary);
          border-color: var(--accent-primary);
        }

        .color-grid {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .color-btn {
          width: 28px;
          height: 28px;
          border: 2px solid transparent;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.15s;
        }

        .color-btn:hover {
          transform: scale(1.1);
        }

        .color-btn.active {
          border-color: white;
          box-shadow: 0 0 0 2px var(--bg-primary), 0 0 0 4px currentColor;
        }

        .preview-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border: 1px solid;
          border-radius: var(--radius-full);
          font-size: 14px;
        }

        @media (max-width: 600px) {
          .icon-grid {
            grid-template-columns: repeat(7, 1fr);
          }
        }
      `}</style>
        </div>
    );
}
