'use client';

import { useSession } from 'next-auth/react';
import { usePathname, redirect } from 'next/navigation';
import { Sidebar, BottomNav } from '@/components/layout/Navigation';

interface AppLayoutProps {
    children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    const { data: session, status } = useSession();
    const pathname = usePathname();

    // Skip auth check for login page
    if (pathname === '/login') {
        return <>{children}</>;
    }

    // Show loading while checking session
    if (status === 'loading') {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <p>Loading Wallet-Dap...</p>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!session) {
        redirect('/login');
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="app-container">
                    {children}
                </div>
            </main>
            <BottomNav />
        </div>
    );
}
