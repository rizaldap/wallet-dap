'use client';

import { useState, useEffect } from 'react';
import { LogOut, User, Bell, Download, Trash2, Calendar, Loader2, Check } from 'lucide-react';
import { useAuth } from '@/components/providers/SessionProvider';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [salaryDay, setSalaryDay] = useState(30);
  const [notifications, setNotifications] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);

  // Load settings on mount
  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          setSalaryDay(data.data.salaryDay || 30);
          setNotifications(data.data.notifications ?? true);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Save settings when changed
  const saveSettings = async (newSalaryDay: number, newNotifications: boolean) => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salaryDay: newSalaryDay, notifications: newNotifications }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSalaryDayChange = (value: number) => {
    setSalaryDay(value);
    saveSettings(value, notifications);
  };

  const handleNotificationsChange = (value: boolean) => {
    setNotifications(value);
    saveSettings(salaryDay, value);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await fetch('/api/export');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wallet-dap-report-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteResult(null);
    try {
      const response = await fetch('/api/delete-transactions', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setDeleteResult(`✅ ${data.message}`);
      } else {
        setDeleteResult(`❌ ${data.error || 'Failed to delete'}`);
      }
    } catch {
      setDeleteResult('❌ Failed to delete transactions');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="settings-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">App preferences</p>
        </div>
        {(saving || saved) && (
          <div className="save-indicator">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {saving ? 'Saving...' : 'Saved'}
          </div>
        )}
      </header>

      {/* Bento Grid */}
      <div className="bento-grid">

        {/* Profile Card */}
        <div className="bento-card bento-2x1">
          <div className="bento-card-header">
            <span className="bento-card-title">Profile</span>
            <User size={16} className="text-muted" />
          </div>
          <div className="profile-info">
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url as string} alt="Profile" className="profile-avatar" />
            ) : (
              <div className="profile-avatar-placeholder">
                <User size={24} />
              </div>
            )}
            <div className="profile-details">
              <p className="profile-name">{user?.user_metadata?.full_name as string || user?.user_metadata?.name as string || 'User'}</p>
              <p className="profile-email">{user?.email || 'Not logged in'}</p>
            </div>
          </div>
        </div>

        {/* Logout */}
        <div className="bento-card bento-2x1" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <button
            className="btn btn-secondary"
            onClick={handleSignOut}
            style={{ width: '100%' }}
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>

        {/* Salary Day */}
        <div className="bento-card bento-2x1">
          <div className="bento-card-header">
            <span className="bento-card-title">Salary Date</span>
            <Calendar size={16} className="text-muted" />
          </div>
          <div className="setting-row">
            <div className="setting-info">
              <p className="setting-label">Day of month</p>
              <p className="setting-desc">Reminder when salary arrives</p>
            </div>
            <select
              className="form-select setting-select"
              value={salaryDay}
              onChange={(e) => handleSalaryDayChange(parseInt(e.target.value))}
              disabled={loading}
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Notifications */}
        <div className="bento-card bento-2x1">
          <div className="bento-card-header">
            <span className="bento-card-title">Notifications</span>
            <Bell size={16} className="text-muted" />
          </div>
          <div className="setting-row">
            <div className="setting-info">
              <p className="setting-label">Reminders</p>
              <p className="setting-desc">Bills and due dates</p>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={notifications}
                onChange={(e) => handleNotificationsChange(e.target.checked)}
                disabled={loading}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        {/* Export Data */}
        <div className="bento-card bento-2x1">
          <div className="bento-card-header">
            <span className="bento-card-title">Export</span>
            <Download size={16} className="text-muted" />
          </div>
          <div className="setting-row">
            <div className="setting-info">
              <p className="setting-label">Download report</p>
              <p className="setting-desc">HTML with charts & data</p>
            </div>
            <button className="btn btn-secondary" onClick={handleExport} disabled={exporting}>
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {exporting ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>

        {/* Delete Data */}
        <div className="bento-card bento-2x1">
          <div className="bento-card-header">
            <span className="bento-card-title">Danger Zone</span>
            <Trash2 size={16} className="text-red" />
          </div>
          <div className="setting-row">
            <div className="setting-info">
              <p className="setting-label text-red">Delete transactions</p>
              <p className="setting-desc">Old data will be backed up</p>
            </div>
            <button className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)} disabled={deleting}>
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Delete
            </button>
          </div>
          {deleteResult && (
            <p className="text-small" style={{ marginTop: '8px' }}>{deleteResult}</p>
          )}
        </div>

        {/* App Info */}
        <div className="bento-card bento-4x1" style={{ textAlign: 'center', justifyContent: 'center' }}>
          <p className="text-medium">💰 Wallet-Dap</p>
          <p className="text-tiny" style={{ marginTop: '4px' }}>Version 2.0.0 · Made with ❤️ by Rizal · Powered by Supabase</p>
        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 style={{ marginBottom: '12px' }}>⚠️ Delete All Transactions?</h3>
            <p className="text-small" style={{ marginBottom: '20px', color: 'var(--text-muted)' }}>
              This will delete all transactions from the database. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteConfirm(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={deleting}
                style={{ flex: 1 }}
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .save-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: var(--accent-green);
          color: #000;
          border-radius: var(--radius-full);
          font-size: 12px;
          font-weight: 500;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        
        .profile-info {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: 8px;
        }
        
        .profile-avatar {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          object-fit: cover;
        }
        
        .profile-avatar-placeholder {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--bg-tertiary);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
        }
        
        .profile-name {
          font-size: 16px;
          font-weight: 600;
        }
        
        .profile-email {
          font-size: 13px;
          color: var(--text-muted);
          margin-top: 2px;
        }
        
        .setting-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-top: 8px;
        }
        
        .setting-info {
          flex: 1;
        }
        
        .setting-label {
          font-size: 14px;
          font-weight: 500;
        }
        
        .setting-desc {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 2px;
        }
        
        .setting-select {
          width: 80px;
          padding: 10px 12px;
          font-size: 14px;
        }
        
        .toggle {
          position: relative;
          display: inline-block;
          width: 48px;
          height: 28px;
          flex-shrink: 0;
        }
        
        .toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        
        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: var(--bg-tertiary);
          transition: var(--transition-fast);
          border-radius: 28px;
        }
        
        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 22px;
          width: 22px;
          left: 3px;
          bottom: 3px;
          background-color: var(--text-muted);
          transition: var(--transition-fast);
          border-radius: 50%;
        }
        
        .toggle input:checked + .toggle-slider {
          background-color: var(--accent-green);
        }
        
        .toggle input:checked + .toggle-slider:before {
          transform: translateX(20px);
          background-color: white;
        }
      `}</style>
    </div>
  );
}
