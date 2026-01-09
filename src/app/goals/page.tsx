'use client';

import { useState } from 'react';
import { Plus, Target, Calendar, Loader2 } from 'lucide-react';
import { useGoals } from '@/lib/hooks/useGoals';
import { formatRupiah } from '@/types';
import Link from 'next/link';

const GOAL_ICONS = ['🎯', '💒', '🏠', '🚗', '✈️', '📱', '💻', '🎓', '👶', '💰', '🎁', '🏥'];

export default function GoalsPage() {
    const { goals, loading, create } = useGoals();
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        icon: '🎯',
        color: '#6366f1',
        targetAmount: '',
        deadline: '',
        description: '',
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.targetAmount) return;

        setSubmitting(true);
        try {
            await create({
                name: formData.name,
                icon: formData.icon,
                color: formData.color,
                targetAmount: parseFloat(formData.targetAmount),
                deadline: formData.deadline || undefined,
                description: formData.description || undefined,
            });
            setShowModal(false);
            setFormData({ name: '', icon: '🎯', color: '#6366f1', targetAmount: '', deadline: '', description: '' });
        } finally {
            setSubmitting(false);
        }
    };

    const getProgressPercent = (current: number, target: number) => {
        return Math.min(100, Math.round((current / target) * 100));
    };

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <p>Memuat goals...</p>
            </div>
        );
    }

    return (
        <div className="goals-page">
            <header className="page-header">
                <div>
                    <h1 className="page-title">🎯 Savings Goals</h1>
                    <p className="page-subtitle">Kelola target tabunganmu</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={18} />
                    Buat Goal
                </button>
            </header>

            {goals.length === 0 ? (
                <div className="empty-state">
                    <Target size={48} />
                    <h3>Belum ada goal</h3>
                    <p>Buat goal tabungan pertamamu untuk mulai tracking!</p>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={18} /> Buat Goal
                    </button>
                </div>
            ) : (
                <div className="goals-grid">
                    {goals.map((goal) => {
                        const progress = getProgressPercent(goal.current_amount, goal.target_amount);
                        return (
                            <Link href={`/goals/${goal.id}`} key={goal.id} className="goal-card">
                                <div className="goal-card-header">
                                    <div className="goal-icon" style={{ background: goal.color }}>
                                        {goal.icon}
                                    </div>
                                    <div className="goal-info">
                                        <h3>{goal.name}</h3>
                                        {goal.deadline && (
                                            <span className="goal-deadline">
                                                <Calendar size={12} />
                                                {new Date(goal.deadline).toLocaleDateString('id-ID')}
                                            </span>
                                        )}
                                    </div>
                                    <span className={`goal-status ${goal.status}`}>
                                        {goal.status === 'active' ? 'Aktif' : goal.status === 'completed' ? 'Selesai' : goal.status}
                                    </span>
                                </div>

                                <div className="goal-progress">
                                    <div className="progress-bar">
                                        <div
                                            className="progress-fill"
                                            style={{ width: `${progress}%`, background: goal.color }}
                                        />
                                    </div>
                                    <div className="progress-text">
                                        <span>{formatRupiah(goal.current_amount)}</span>
                                        <span className="text-muted">dari {formatRupiah(goal.target_amount)}</span>
                                    </div>
                                </div>

                                <div className="goal-footer">
                                    <span className="progress-percent">{progress}%</span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* Create Goal Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>🎯 Buat Goal Baru</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group centered">
                                <label>Nama Goal</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="form-input text-center"
                                />
                            </div>

                            <div className="form-group centered">
                                <label>Icon</label>
                                <div className="icon-picker">
                                    {GOAL_ICONS.map((icon) => (
                                        <button
                                            key={icon}
                                            type="button"
                                            className={`icon-btn ${formData.icon === icon ? 'selected' : ''}`}
                                            onClick={() => setFormData({ ...formData, icon })}
                                        >
                                            {icon}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group centered">
                                <label>Warna</label>
                                <div className="color-picker">
                                    {['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'].map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            className={`color-btn ${formData.color === color ? 'selected' : ''}`}
                                            style={{ background: color }}
                                            onClick={() => setFormData({ ...formData, color })}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="form-group centered">
                                <label>Target (Rp)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.targetAmount}
                                    onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                                    required
                                    className="form-input text-center"
                                />
                                {formData.targetAmount && (
                                    <span className="form-hint">{formatRupiah(parseFloat(formData.targetAmount) || 0)}</span>
                                )}
                            </div>

                            <div className="form-group centered">
                                <label>Target Waktu</label>
                                <div className="deadline-picker">
                                    {[
                                        { label: '1 Bulan', months: 1 },
                                        { label: '3 Bulan', months: 3 },
                                        { label: '6 Bulan', months: 6 },
                                        { label: '1 Tahun', months: 12 },
                                        { label: '2 Tahun', months: 24 },
                                    ].map((opt) => {
                                        const targetDate = new Date();
                                        targetDate.setMonth(targetDate.getMonth() + opt.months);
                                        const dateStr = targetDate.toISOString().split('T')[0];
                                        return (
                                            <button
                                                key={opt.months}
                                                type="button"
                                                className={`deadline-btn ${formData.deadline === dateStr ? 'selected' : ''}`}
                                                onClick={() => setFormData({ ...formData, deadline: dateStr })}
                                            >
                                                {opt.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                {formData.deadline && (
                                    <span className="form-hint">
                                        Target: {new Date(formData.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </span>
                                )}
                            </div>

                            <div className="form-group centered">
                                <label>Deskripsi (opsional)</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={2}
                                    className="form-input"
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Batal
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                    Buat Goal
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`
                .goals-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 16px;
                }

                .goal-card {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    padding: 20px;
                    display: block;
                    text-decoration: none;
                    color: inherit;
                    transition: var(--transition-fast);
                }

                .goal-card:hover {
                    border-color: var(--border-hover);
                    transform: translateY(-2px);
                }

                .goal-card-header {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    margin-bottom: 16px;
                }

                .goal-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                }

                .goal-info {
                    flex: 1;
                }

                .goal-info h3 {
                    font-size: 16px;
                    font-weight: 600;
                    margin-bottom: 4px;
                }

                .goal-deadline {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 12px;
                    color: var(--text-muted);
                }

                .goal-status {
                    font-size: 11px;
                    padding: 4px 8px;
                    border-radius: var(--radius-full);
                    text-transform: capitalize;
                }

                .goal-status.active {
                    background: rgba(34, 197, 94, 0.1);
                    color: var(--accent-green);
                }

                .goal-status.completed {
                    background: rgba(59, 130, 246, 0.1);
                    color: var(--accent-blue);
                }

                .goal-progress {
                    margin-bottom: 12px;
                }

                .progress-bar {
                    height: 8px;
                    background: var(--bg-tertiary);
                    border-radius: 4px;
                    overflow: hidden;
                    margin-bottom: 8px;
                }

                .progress-fill {
                    height: 100%;
                    border-radius: 4px;
                    transition: width 0.3s ease;
                }

                .progress-text {
                    display: flex;
                    justify-content: space-between;
                    font-size: 14px;
                }

                .goal-footer {
                    display: flex;
                    justify-content: flex-end;
                }

                .progress-percent {
                    font-size: 24px;
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .empty-state {
                    text-align: center;
                    padding: 60px 20px;
                    color: var(--text-muted);
                }

                .empty-state h3 {
                    margin: 16px 0 8px;
                    color: var(--text-primary);
                }

                .empty-state .btn {
                    margin-top: 20px;
                }

                .icon-picker {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    justify-content: center;
                }

                .icon-btn {
                    width: 40px;
                    height: 40px;
                    border: 2px solid var(--border);
                    border-radius: var(--radius-md);
                    background: var(--bg-secondary);
                    font-size: 20px;
                    cursor: pointer;
                    transition: var(--transition-fast);
                }

                .icon-btn:hover {
                    border-color: var(--border-hover);
                }

                .icon-btn.selected {
                    border-color: var(--accent-primary);
                    background: rgba(99, 102, 241, 0.1);
                }

                .color-picker {
                    display: flex;
                    gap: 8px;
                    justify-content: center;
                }

                .color-btn {
                    width: 32px;
                    height: 32px;
                    border: 3px solid transparent;
                    border-radius: 50%;
                    cursor: pointer;
                    transition: var(--transition-fast);
                }

                .color-btn:hover {
                    transform: scale(1.1);
                }

                .color-btn.selected {
                    border-color: var(--text-primary);
                }

                .deadline-picker {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    justify-content: center;
                }

                .deadline-btn {
                    padding: 8px 16px;
                    border: 2px solid var(--border);
                    border-radius: var(--radius-full);
                    background: var(--bg-secondary);
                    color: var(--text-secondary);
                    font-size: 13px;
                    cursor: pointer;
                    transition: var(--transition-fast);
                }

                .deadline-btn:hover {
                    border-color: var(--border-hover);
                }

                .deadline-btn.selected {
                    border-color: var(--accent-primary);
                    background: rgba(99, 102, 241, 0.1);
                    color: var(--accent-primary);
                }

                .form-group.centered {
                    text-align: center;
                }

                .form-group.centered label {
                    display: block;
                    margin-bottom: 8px;
                }

                .text-center {
                    text-align: center;
                }

                .form-hint {
                    display: block;
                    margin-top: 8px;
                    font-size: 12px;
                    color: var(--text-muted);
                    text-align: center;
                }

                .modal-actions {
                    display: flex;
                    gap: 12px;
                    margin-top: 20px;
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
            `}</style>
        </div>
    );
}
