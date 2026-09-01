"use client";

import React, { useState, useEffect } from "react";
import {
    signInWithPopup,
    GoogleAuthProvider,
    OAuthProvider,
    signInWithEmailAndPassword,
    signInAnonymously,
} from "firebase/auth";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useSearchParams } from "next/navigation";

type Tab = "code" | "staff";

export const AccessView = () => {
    const searchParams = useSearchParams();
    const urlCode = searchParams?.get("code") ?? "";

    const [tab, setTab] = useState<Tab>("code");
    const [code, setCode] = useState(urlCode);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Auto-submit if a code was passed via URL param
    useEffect(() => {
        if (urlCode) handleCodeSubmit(urlCode);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleCodeSubmit = async (raw?: string) => {
        const entered = (raw ?? code).trim().toUpperCase();
        if (!entered) {
            setError("Please enter an access code.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            // Invite docs are keyed by their code (see firestore.rules — only a
            // direct `get` by ID is public; collection queries require admin).
            const docRef = doc(db, "ma_invites", entered);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) throw new Error("Invalid access code.");

            const invite = docSnap.data();

            if (invite.isRevoked) throw new Error("This access code has been revoked.");

            const now = new Date();
            if (invite.expiresAt?.toDate() < now) throw new Error("This access code has expired.");

            if (invite.maxUses !== null && invite.useCount >= invite.maxUses) {
                throw new Error("This access code has already been used the maximum number of times.");
            }

            // Valid — sign in anonymously, then record usage
            await signInAnonymously(auth);
            await updateDoc(docSnap.ref, { useCount: increment(1) });
            // Auth state change in SiteAuthGate will unmount this component automatically
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    const handleProviderLogin = async (provider: GoogleAuthProvider | OAuthProvider, label: string) => {
        setLoading(true);
        setError(null);
        try {
            await signInWithPopup(auth, provider);
        } catch (err: unknown) {
            const code = (err as { code?: string }).code;
            if (code === "auth/popup-blocked") {
                setError("Popup was blocked. Please allow popups for this site and try again.");
            } else if (code === "auth/unauthorized-domain") {
                setError(
                    "This domain is not authorised. Add it in Firebase Console → Authentication → Authorized domains.",
                );
            } else if (code === "auth/operation-not-allowed") {
                setError(`${label} sign-in isn't enabled in Firebase Console → Authentication → Sign-in method.`);
            } else if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
                setError(`${label} sign-in failed. Please try again.`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = () => handleProviderLogin(new GoogleAuthProvider(), "Google");
    const handleMicrosoftLogin = () => {
        const provider = new OAuthProvider("microsoft.com");
        provider.setCustomParameters({ prompt: "select_account" });
        return handleProviderLogin(provider, "Microsoft");
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch {
            setError("Invalid email or password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
            <div className="w-full max-w-sm space-y-10">
                {/* Branding */}
                <div className="text-center space-y-2">
                    <p className="text-3xl font-light uppercase tracking-[0.3em]">NMA</p>
                    <p className="text-[9px] uppercase tracking-[0.6em] font-bold text-stone-300">
                        Network Models Archive
                    </p>
                    <p className="text-[11px] text-stone-400 pt-1">Private preview — authorised access only</p>
                </div>

                {/* Tab switcher */}
                <div className="flex border border-stone-200">
                    {(["code", "staff"] as Tab[]).map((t) => (
                        <button
                            key={t}
                            onClick={() => {
                                setTab(t);
                                setError(null);
                            }}
                            className={`flex-1 py-2.5 text-[9px] uppercase tracking-[0.3em] font-bold transition-colors ${
                                tab === t ? "bg-stone-900 text-white" : "text-stone-400 hover:text-stone-900"
                            }`}
                        >
                            {t === "code" ? "Access code" : "Staff login"}
                        </button>
                    ))}
                </div>

                {/* ── Access code tab ── */}
                {tab === "code" && (
                    <div className="space-y-4">
                        <p className="text-[11px] text-stone-400 leading-relaxed">
                            Enter the access code you received to view the archive.
                        </p>
                        <div className="space-y-3">
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                onKeyDown={(e) => e.key === "Enter" && handleCodeSubmit()}
                                placeholder="NMA-XXXX-XXXX"
                                autoFocus
                                className="w-full border border-stone-200 focus:border-black outline-none px-4 py-3 text-sm font-mono tracking-widest bg-stone-50 focus:bg-white transition-colors placeholder:text-stone-300 uppercase"
                            />
                            {error && <p className="text-red-500 text-[10px]">{error}</p>}
                            <button
                                onClick={() => handleCodeSubmit()}
                                disabled={loading}
                                className="w-full bg-stone-900 text-white py-3 text-[10px] uppercase tracking-[0.3em] font-bold hover:bg-stone-700 transition-colors disabled:opacity-40"
                            >
                                {loading ? "Verifying…" : "Enter archive"}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Staff login tab ── */}
                {tab === "staff" && (
                    <div className="space-y-5">
                        {/* Google */}
                        <button
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-3 border border-stone-200 py-3 text-[10px] uppercase tracking-[0.2em] font-bold text-stone-600 hover:border-stone-900 hover:text-stone-900 transition-all disabled:opacity-40"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path
                                    fill="currentColor"
                                    d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866.549 3.921 1.453l2.814-2.814C17.503 2.988 15.139 2 12.545 2 7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748L12.545 10.239z"
                                />
                            </svg>
                            Continue with Google
                        </button>

                        {/* Microsoft */}
                        <button
                            onClick={handleMicrosoftLogin}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-3 border border-stone-200 py-3 text-[10px] uppercase tracking-[0.2em] font-bold text-stone-600 hover:border-stone-900 hover:text-stone-900 transition-all disabled:opacity-40"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 23 23">
                                <path fill="#f25022" d="M1 1h10v10H1z" />
                                <path fill="#7fba00" d="M12 1h10v10H12z" />
                                <path fill="#00a4ef" d="M1 12h10v10H1z" />
                                <path fill="#ffb900" d="M12 12h10v10H12z" />
                            </svg>
                            Continue with Microsoft
                        </button>

                        <div className="flex items-center gap-4">
                            <div className="flex-1 h-[1.5px] bg-stone-300" />
                            <span className="text-[9px] uppercase tracking-widest font-bold text-stone-400">or</span>
                            <div className="flex-1 h-[1.5px] bg-stone-300" />
                        </div>

                        <form onSubmit={handleEmailLogin} className="space-y-3">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email address"
                                required
                                className="w-full border border-stone-200 focus:border-black outline-none px-4 py-3 text-sm bg-stone-50 focus:bg-white transition-colors"
                            />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                required
                                className="w-full border border-stone-200 focus:border-black outline-none px-4 py-3 text-sm bg-stone-50 focus:bg-white transition-colors"
                            />
                            {error && <p className="text-red-500 text-[10px]">{error}</p>}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-stone-900 text-white py-3 text-[10px] uppercase tracking-[0.3em] font-bold hover:bg-stone-700 transition-colors disabled:opacity-40"
                            >
                                {loading ? "Signing in…" : "Sign in"}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};
