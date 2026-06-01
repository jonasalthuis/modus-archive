"use client";

import React, { Suspense } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AuthProvider, useAuth, VerifyEmailScreen } from "@/lib/auth";
import { AccessView } from "./AccessView";

// Paths that bypass the site auth gate (they handle auth themselves)
const BYPASS_PREFIXES = ["/admin"];

// Shown to a signed-in account that has no assigned role (invite-only model)
const UnauthorisedScreen = () => (
    <div className="min-h-screen flex items-center justify-center bg-white font-sans">
        <div className="text-center space-y-4 max-w-sm px-6">
            <p className="text-2xl font-light uppercase tracking-[0.25em] text-stone-900">NMA</p>
            <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-400">Not authorised</p>
            <p className="text-sm text-stone-600 leading-relaxed">
                This account isn&apos;t authorised for the archive yet. Ask an administrator to add your email, or use a
                guest access code.
            </p>
            <button
                onClick={() => signOut(auth)}
                className="mt-4 text-[10px] uppercase tracking-[0.3em] font-bold text-stone-500 hover:text-stone-900 transition-colors"
            >
                Sign out →
            </button>
        </div>
    </div>
);

const Gate = ({ children }: { children: React.ReactNode }) => {
    const pathname = usePathname();
    const { status, user } = useAuth();

    // Dev-only bypass: skip the access gate when running `pnpm dev` so the public
    // site (canvas, archive, etc.) can be worked on without an invite/login.
    // `NODE_ENV` is statically "production" in any real build, so this is never
    // active in deployed environments.
    if (process.env.NODE_ENV === "development") return <>{children}</>;

    // Admin route gates itself (CMSEngine enforces roles)
    if (BYPASS_PREFIXES.some((p) => pathname?.startsWith(p))) return <>{children}</>;

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="space-y-3 text-center">
                    <div className="w-12 h-[1.5px] bg-stone-300 mx-auto animate-pulse" />
                    <p className="text-[9px] uppercase tracking-[0.5em] text-stone-400">Loading…</p>
                </div>
            </div>
        );
    }

    // Not signed in — show the access page (useSearchParams inside AccessView needs Suspense)
    if (status === "signed-out") {
        return (
            <Suspense fallback={null}>
                <AccessView />
            </Suspense>
        );
    }

    // Password account that hasn't verified its email
    if (status === "unverified" && user) return <VerifyEmailScreen user={user} />;

    // Signed in but with no role assigned — turn away (invite-only)
    if (status === "unauthorised") return <UnauthorisedScreen />;

    // guest (invite) or authorised (admin/editor/viewer) — render the site
    return <>{children}</>;
};

export const SiteAuthGate = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>
        <Gate>{children}</Gate>
    </AuthProvider>
);
