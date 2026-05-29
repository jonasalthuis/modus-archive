"use client";

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import { AccessView } from './AccessView';

// Paths that bypass the site auth gate (they handle auth themselves)
const BYPASS_PREFIXES = ['/admin'];

export const SiteAuthGate = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const pathname = usePathname();

    useEffect(() => {
        return onAuthStateChanged(auth, u => {
            setUser(u);
            setLoading(false);
        });
    }, []);

    // Admin and other self-auth routes bypass this gate
    const isBypassed = BYPASS_PREFIXES.some(prefix => pathname?.startsWith(prefix));
    if (isBypassed) return <>{children}</>;

    // Brief loading state — prevents flash of access page for returning users
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="space-y-3 text-center">
                    <div className="w-12 h-px bg-stone-200 mx-auto animate-pulse" />
                    <p className="text-[9px] uppercase tracking-[0.5em] text-stone-300">Loading…</p>
                </div>
            </div>
        );
    }

    // Not signed in — show access page (useSearchParams inside AccessView needs Suspense)
    if (!user) {
        return (
            <Suspense fallback={null}>
                <AccessView />
            </Suspense>
        );
    }

    // Signed in (anonymous invite guest or staff) — render the site
    return <>{children}</>;
};
