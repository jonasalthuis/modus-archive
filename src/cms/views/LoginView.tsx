import React, { useState } from 'react';
import {
    signInWithPopup,
    GoogleAuthProvider,
    signInWithEmailAndPassword
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/repo-ui';

export const LoginView = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (err: unknown) {
            console.error(err);
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
        } catch (err: unknown) {
            console.error(err);
            setError('Invalid email or password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 font-sans">
            <div className="bg-white p-12 border border-black shadow-none max-w-md w-full">
                <div className="text-center mb-10">
                    <h1 className="text-2xl font-light uppercase tracking-widest text-black mb-2">
                        NMA
                    </h1>
                    <p className="text-gray-400 italic text-sm tracking-widest text-[10px] uppercase">Restricted Access</p>
                </div>

                <div className="space-y-6">
                    <Button
                        onClick={handleGoogleLogin}
                        variant="secondary"
                        className="w-full flex justify-center items-center py-3 border-stone-300"
                        disabled={loading}
                    >
                        <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
                        </svg>
                        Sign in with Google
                    </Button>

                    <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-stone-200 dark:border-stone-800"></div>
                        <span className="flex-shrink mx-4 text-stone-400 text-xs uppercase tracking-widest">Or</span>
                        <div className="flex-grow border-t border-stone-200 dark:border-stone-800"></div>
                    </div>

                    <form onSubmit={handleEmailLogin} className="space-y-4">
                        <div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email Address"
                                className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-3 focus:outline-none focus:border-amber-700 transition-colors"
                                required
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-3 focus:outline-none focus:border-amber-700 transition-colors"
                                required
                            />
                        </div>

                        {error && (
                            <p className="text-red-600 text-xs italic text-center">{error}</p>
                        )}

                        <Button
                            type="submit"
                            className="w-full bg-stone-900 hover:bg-amber-900 text-white py-3 uppercase tracking-widest text-xs font-bold"
                            disabled={loading}
                        >
                            {loading ? 'Authenticating...' : 'Enter Archive'}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
};
