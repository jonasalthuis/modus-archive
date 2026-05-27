"use client";

import React, { useState } from 'react';
import {
    User,
    updateProfile,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Save, Key, Mail, LogOut } from 'lucide-react';

const signOut = () => auth.signOut();

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-stone-100 pb-6 last:border-0">
        <label className="text-[10px] uppercase tracking-[0.3em] font-bold text-stone-400 pt-3">{label}</label>
        <div className="md:col-span-2">{children}</div>
    </div>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        {...props}
        className="w-full bg-white border border-stone-200 focus:border-black outline-none px-4 py-3 text-sm font-light transition-colors disabled:bg-stone-50 disabled:text-stone-300"
    />
);

const Btn = ({
    children,
    onClick,
    variant = 'primary',
    disabled,
    type = 'button',
}: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: 'primary' | 'ghost' | 'danger';
    disabled?: boolean;
    type?: 'button' | 'submit';
}) => {
    const styles = {
        primary: 'bg-stone-900 text-white hover:bg-stone-700',
        ghost: 'border border-stone-200 text-stone-600 hover:border-stone-900 hover:text-stone-900',
        danger: 'border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-400',
    };
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`px-6 py-3 text-[10px] uppercase tracking-[0.2em] font-bold transition-all disabled:opacity-40 flex items-center gap-2 ${styles[variant]}`}
        >
            {children}
        </button>
    );
};

export const AccountView = ({ user }: { user: User }) => {
    const [displayName, setDisplayName] = useState(user.displayName || '');
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileMsg, setProfileMsg] = useState<string | null>(null);

    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [changingPw, setChangingPw] = useState(false);
    const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null);

    const isGoogleUser = user.providerData.some(p => p.providerId === 'google.com');
    const isEmailUser = user.providerData.some(p => p.providerId === 'password');

    const handleSaveProfile = async () => {
        setSavingProfile(true);
        setProfileMsg(null);
        try {
            await updateProfile(user, { displayName });
            setProfileMsg('Profile updated.');
        } catch (e) {
            console.error(e);
            setProfileMsg('Failed to update profile.');
        }
        setSavingProfile(false);
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPw !== confirmPw) {
            setPwMsg({ text: 'Passwords do not match.', ok: false });
            return;
        }
        if (newPw.length < 8) {
            setPwMsg({ text: 'Password must be at least 8 characters.', ok: false });
            return;
        }
        setChangingPw(true);
        setPwMsg(null);
        try {
            const credential = EmailAuthProvider.credential(user.email!, currentPw);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPw);
            setPwMsg({ text: 'Password updated successfully.', ok: true });
            setCurrentPw('');
            setNewPw('');
            setConfirmPw('');
        } catch (err: unknown) {
            const code = (err as { code?: string }).code;
            if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
                setPwMsg({ text: 'Current password is incorrect.', ok: false });
            } else {
                setPwMsg({ text: 'Failed to update password. Try signing out and back in.', ok: false });
            }
        }
        setChangingPw(false);
    };

    const handlePasswordReset = async () => {
        try {
            await sendPasswordResetEmail(auth, user.email!);
            setPwMsg({ text: `Reset link sent to ${user.email}`, ok: true });
        } catch (e) {
            console.error(e);
            setPwMsg({ text: 'Could not send reset email.', ok: false });
        }
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-500 max-w-2xl">
            {/* Header */}
            <div className="border-b border-stone-100 pb-8">
                <h2 className="text-3xl font-light uppercase tracking-[0.15em]">Account</h2>
                <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-stone-300 mt-2">
                    {user.email}
                    {isGoogleUser && (
                        <span className="ml-3 bg-stone-100 text-stone-400 px-2 py-0.5">Google</span>
                    )}
                </p>
            </div>

            {/* Profile */}
            <section className="space-y-6">
                <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-300">Profile</p>
                <div className="space-y-6">
                    <Field label="Display name">
                        <Input
                            value={displayName}
                            onChange={e => setDisplayName(e.target.value)}
                            placeholder="Your name"
                        />
                    </Field>
                    <Field label="Email">
                        <Input value={user.email || ''} disabled />
                        <p className="text-[9px] text-stone-300 mt-2">
                            Email is managed through Firebase Auth and cannot be changed here.
                        </p>
                    </Field>
                </div>
                <div className="flex items-center gap-4">
                    <Btn onClick={handleSaveProfile} disabled={savingProfile}>
                        <Save size={12} /> {savingProfile ? 'Saving…' : 'Save profile'}
                    </Btn>
                    {profileMsg && (
                        <span className="text-[10px] text-stone-400">{profileMsg}</span>
                    )}
                </div>
            </section>

            {/* Password */}
            <section className="space-y-6">
                <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-300">Password</p>

                {isGoogleUser && !isEmailUser ? (
                    <div className="border border-stone-100 p-6">
                        <div className="flex items-start gap-3">
                            <Mail size={16} className="text-stone-300 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-light text-stone-600">
                                    Your account uses Google Sign-In — there is no separate password to manage.
                                </p>
                                <p className="text-[10px] text-stone-400 mt-2">
                                    To change your Google account password, visit myaccount.google.com.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleChangePassword} className="space-y-6">
                        <Field label="Current password">
                            <Input
                                type="password"
                                value={currentPw}
                                onChange={e => setCurrentPw(e.target.value)}
                                placeholder="Enter current password"
                                required
                            />
                        </Field>
                        <Field label="New password">
                            <Input
                                type="password"
                                value={newPw}
                                onChange={e => setNewPw(e.target.value)}
                                placeholder="Min. 8 characters"
                                required
                            />
                        </Field>
                        <Field label="Confirm new">
                            <Input
                                type="password"
                                value={confirmPw}
                                onChange={e => setConfirmPw(e.target.value)}
                                placeholder="Repeat new password"
                                required
                            />
                        </Field>
                        <div className="flex items-center gap-4 flex-wrap">
                            <Btn type="submit" disabled={changingPw}>
                                <Key size={12} /> {changingPw ? 'Updating…' : 'Update password'}
                            </Btn>
                            <button
                                type="button"
                                onClick={handlePasswordReset}
                                className="text-[10px] uppercase tracking-[0.2em] font-bold text-stone-300 hover:text-stone-600 transition-colors"
                            >
                                Send reset email instead
                            </button>
                        </div>
                        {pwMsg && (
                            <p className={`text-[10px] ${pwMsg.ok ? 'text-stone-500' : 'text-red-500'}`}>
                                {pwMsg.text}
                            </p>
                        )}
                    </form>
                )}
            </section>

            {/* Sign out */}
            <section className="border-t border-stone-100 pt-8">
                <Btn variant="danger" onClick={() => { if (confirm('Sign out?')) signOut(); }}>
                    <LogOut size={12} /> Sign out
                </Btn>
            </section>
        </div>
    );
};
