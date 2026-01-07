'use client';

import { useEffect } from 'react';

export function PWARegister() {
    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js')
                .then((registration) => {
                    console.log('PWA: Service Worker registered successfully', registration.scope);
                })
                .catch((error) => {
                    console.log('PWA: Service Worker registration failed', error);
                });
        }
    }, []);

    return null;
}
