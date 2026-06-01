"use client";

import React, { useState } from "react";
import { signInWithPopup, GoogleAuthProvider, OAuthProvider, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

export const LoginView = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleProviderLogin = async (provider: GoogleAuthProvider | OAuthProvider, label: string) => {
        setLoading(true);
        setError(null);
        try {
            await signInWithPopup(auth, provider);
        } catch (err: unknown) {
            const code = (err as { code?: string }).code;
            if (code === "auth/unauthorized-domain") {
                setError(
                    "This domain is not authorised. Add it in Firebase Console → Authentication → Settings → Authorised domains.",
                );
            } else if (code === "auth/popup-blocked") {
                setError("Popup was blocked. Please allow popups and try again.");
            } else if (code === "auth/operation-not-allowed") {
                setError(`${label} sign-in isn't enabled yet in Firebase Console → Authentication → Sign-in method.`);
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
        // Let the user choose which Microsoft account (personal or work)
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
        <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="w-full max-w-sm px-8">
                {/* Brand */}
                <div className="mb-10">
                    <p className="text-4xl font-light uppercase tracking-[0.2em] text-stone-900">NMA</p>
                    <p className="text-[10px] uppercase tracking-[0.5em] font-bold text-stone-400 mt-2">Admin Access</p>
                </div>

                {/* Google */}
                <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 border-2 border-stone-900 py-3.5 text-[10px] uppercase tracking-[0.25em] font-bold text-stone-900 hover:bg-stone-900 hover:text-white transition-all duration-200 disabled:opacity-40 mb-6"
                >
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
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
                    className="w-full flex items-center justify-center gap-3 border-2 border-stone-900 py-3.5 text-[10px] uppercase tracking-[0.25em] font-bold text-stone-900 hover:bg-stone-900 hover:text-white transition-all duration-200 disabled:opacity-40 mb-6"
                >
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 23 23">
                        <path fill="#f25022" d="M1 1h10v10H1z" />
                        <path fill="#7fba00" d="M12 1h10v10H12z" />
                        <path fill="#00a4ef" d="M1 12h10v10H1z" />
                        <path fill="#ffb900" d="M12 12h10v10H12z" />
                    </svg>
                    Continue with Microsoft
                </button>

                {/* Divider */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="flex-1 h-[1.5px] bg-stone-300" />
                    <span className="text-[9px] uppercase tracking-widest font-bold text-stone-400">or</span>
                    <div className="flex-1 h-[1.5px] bg-stone-300" />
                </div>

                {/* Email/password */}
                <form onSubmit={handleEmailLogin} className="space-y-3">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email address"
                        required
                        className="w-full border-2 border-stone-300 focus:border-stone-900 outline-none px-4 py-3 text-sm bg-white transition-colors placeholder:text-stone-400"
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        required
                        className="w-full border-2 border-stone-300 focus:border-stone-900 outline-none px-4 py-3 text-sm bg-white transition-colors placeholder:text-stone-400"
                    />
                    {error && <p className="text-red-500 text-[11px] font-medium py-1">{error}</p>}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-stone-900 text-white py-3.5 text-[10px] uppercase tracking-[0.3em] font-bold hover:bg-stone-700 transition-colors disabled:opacity-40 mt-2"
                    >
                        {loading ? "Signing in…" : "Enter archive"}
                    </button>
                </form>
            </div>
        </div>
    );
};
