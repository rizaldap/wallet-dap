'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Receipt,
    Wallet,
    CreditCard,
    BarChart3,
    Settings,
    LogOut
} from 'lucide-react';
import { signOut } from 'next-auth/react';

const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/transactions', label: 'Transaksi', icon: Receipt },
    { href: '/wallets', label: 'Wallet', icon: Wallet },
    { href: '/credit-cards', label: 'Kartu Kredit', icon: CreditCard },
    { href: '/analytics', label: 'Analisis', icon: BarChart3 },
    { href: '/settings', label: 'Pengaturan', icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <span>💰</span>
                <span>Wallet-Dap</span>
            </div>

            <nav className="sidebar-nav">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`sidebar-item ${isActive ? 'active' : ''}`}
                        >
                            <Icon size={20} />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}

                <button
                    onClick={() => signOut()}
                    className="sidebar-item"
                    style={{ marginTop: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', width: '100%', textAlign: 'left' }}
                >
                    <LogOut size={20} />
                    <span>Keluar</span>
                </button>
            </nav>
        </aside>
    );
}

export function BottomNav() {
    const pathname = usePathname();

    const bottomItems = navItems.slice(0, 5); // Only show first 5 items in bottom nav

    return (
        <nav className="nav-bottom">
            {bottomItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`nav-item ${isActive ? 'active' : ''}`}
                    >
                        <Icon size={24} />
                        <span>{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
