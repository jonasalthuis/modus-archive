"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, sendEmailVerification, signOut, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

// ─── Roles & access ──────────────────────────────────────────────────────────

export type Role = "admin" | "editor" | "viewer";

export type AuthStatus =
    | "loading" // resolving auth + role
    | "signed-out" // no Firebase user
    | "guest" // anonymous (invite-code) session — frontend only
    | "unverified" // password account that hasn't verified its email
    | "authorised" // has a users record (role set)
    | "unauthorised"; // signed in, but no users record → turned away

// Owner emails that are always treated as admin, even before a users record
// exists. A safety net so the project owner can never be locked out. Mirrored in
// firestore.rules (isBootstrapAdmin) so database writes are also guaranteed.
export const BOOTSTRAP_ADMINS = ["jonasalthuis@gmail.com"];

export interface AuthState {
    user: User | null;
    status: AuthStatus;
    role: Role | null;
    /** Display name from the users record, if any */
    profileName: string | null;
}

const AuthContext = createContext<AuthState>({
    user: null,
    status: "loading",
    role: null,
    profileName: null,
});

export const useAuth = () => useContext(AuthContext);

// Convenience helpers
export const canAccessAdmin = (s: AuthState) => s.status === "authorised" && (s.role === "admin" || s.role === "editor");
export const isAdmin = (s: AuthState) => s.status === "authorised" && s.role === "admin";

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<AuthState>({
        user: null,
        status: "loading",
        role: null,
        profileName: null,
    });

    useEffect(() => {
        return onAuthStateChanged(auth, async (user) => {
            if (!user) {
                setState({ user: null, status: "signed-out", role: null, profileName: null });
                return;
            }
            // Invite-code guests sign in anonymously — frontend only, no role
            if (user.isAnonymous) {
                setState({ user, status: "guest", role: null, profileName: null });
                return;
            }

            // Email/password accounts must verify their email first.
            // OAuth accounts (Google/Microsoft) are verified by the provider, so they skip this.
            const isPasswordUser = user.providerData.some((p) => p.providerId === "password");
            if (isPasswordUser && !user.emailVerified) {
                setState({ user, status: "unverified", role: null, profileName: null });
                return;
            }

            const email = (user.email || "").toLowerCase();

            // Owner safety net — always admin
            if (BOOTSTRAP_ADMINS.includes(email)) {
                setState({ user, status: "authorised", role: "admin", profileName: user.displayName });
                return;
            }

            // Look up the pre-authorised role (invite-only model)
            try {
                const snap = await getDoc(doc(db, "users", email));
                const data = snap.exists() ? snap.data() : null;
                if (data?.role) {
                    setState({
                        user,
                        status: "authorised",
                        role: data.role as Role,
                        profileName: (data.displayName as string) || user.displayName,
                    });
                } else {
                    setState({ user, status: "unauthorised", role: null, profileName: null });
                }
            } catch (e) {
                console.error("Role lookup failed", e);
                setState({ user, status: "unauthorised", role: null, profileName: null });
            }
        });
    }, []);

    return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

// Shown to a password account that hasn't verified its email yet.
export function VerifyEmailScreen({ user }: { user: User }) {
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const resend = async () => {
        setError(null);
        try {
            await sendEmailVerification(user);
            setSent(true);
        } catch {
            setError("Couldn't send right now — try again in a minute.");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-white font-sans">
            <div className="text-center space-y-4 max-w-sm px-6">
                <p className="text-2xl font-light uppercase tracking-[0.25em] text-stone-900">NMA</p>
                <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-400">Verify your email</p>
                <p className="text-sm text-stone-600 leading-relaxed">
                    We need to confirm <span className="font-medium">{user.email}</span>. Check your inbox for the
                    verification link, then reload this page.
                </p>
                {sent && <p className="text-[12px] text-stone-500">Verification email sent.</p>}
                {error && <p className="text-[12px] text-red-500">{error}</p>}
                <div className="flex items-center justify-center gap-5 pt-2">
                    <button
                        onClick={resend}
                        className="text-[10px] uppercase tracking-[0.3em] font-bold text-stone-900 hover:text-stone-500 transition-colors"
                    >
                        Resend email
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="text-[10px] uppercase tracking-[0.3em] font-bold text-stone-500 hover:text-stone-900 transition-colors"
                    >
                        I&apos;ve verified
                    </button>
                    <button
                        onClick={() => signOut(auth)}
                        className="text-[10px] uppercase tracking-[0.3em] font-bold text-stone-500 hover:text-stone-900 transition-colors"
                    >
                        Sign out
                    </button>
                </div>
            </div>
        </div>
    );
}
