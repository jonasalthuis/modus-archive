"use client";

import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export const LoginView = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            await signInWithPopup(auth, new GoogleAuthProvider());
        } catch {
            setError('Failed to sign in with Google. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch {
            setError('Invalid email or password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50">
            <div className="bg-white p-12 border border-stone-200 max-w-sm w-full space-y-8">
                <div className="text-center">
                    <h1 className="text-2xl font-light uppercase tracking-[0.3em] text-black">NMA</h1>
                    <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-300 mt-2">Restricted Access</p>
                </div>

                {/* Google */}
                <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 border border-stone-200 py-3 text-[10px] uppercase tracking-[0.2em] font-bold text-stone-600 hover:border-stone-900 hover:text-stone-900 transition-all disabled:opacity-40"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866.549 3.921 1.453l2.814-2.814C17.503 2.988 15.139 2 12.545 2 7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748L12.545 10.239z" />
                    </svg>
                    Continue with Google
                </button>

                <div className="flex items-center gap-4">
                    <div className="flex-1 h-px bg-stone-100" />
                    <span className="text-[9px] uppercase tracking-widest text-stone-300">or</span>
                    <div className="flex-1 h-px bg-stone-100" />
                </div>

                {/* Email/password */}
                <form onSubmit={handleEmailLogin} className="space-y-4">
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Email address"
                        required
                        className="w-full border border-stone-200 focus:border-black outline-none px-4 py-3 text-sm bg-stone-50 focus:bg-white transition-colors"
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Password"
                        required
                        className="w-full border border-stone-200 focus:border-black outline-none px-4 py-3 text-sm bg-stone-50 focus:bg-white transition-colors"
                    />
                    {error && (
                        <p className="text-red-500 text-[10px] text-center">{error}</p>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-stone-900 text-white py-3 text-[10px] uppercase tracking-[0.3em] font-bold hover:bg-stone-700 transition-colors disabled:opacity-40"
                    >
                        {loading ? 'Signing in…' : 'Enter archive'}
                    </button>
                </form>
            </div>
        </div>
    );
};
