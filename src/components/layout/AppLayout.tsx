'use client';

import { usePathname } from 'next/navigation';
import { Sidebar, BottomNav } from '@/components/layout/Navigation';
import { useAuth } from '@/components/providers/SessionProvider';

interface AppLayoutProps {
    children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    const { user, loading } = useAuth();
    const pathname = usePathname();

    // Skip auth check for login page
    if (pathname === '/login') {
        return <>{children}</>;
    }

    // Show loading while checking session
    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <p>Loading Wallet-Dap...</p>
            </div>
        );
    }

    // If not logged in, middleware will handle redirect
    if (!user) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <p>Redirecting...</p>
            </div>
        );
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
