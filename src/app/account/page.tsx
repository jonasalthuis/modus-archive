"use client";

import React from "react";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";

export default function AccountPage() {
    const { user, status, role, profileName } = useAuth();

    if (status === "loading") {
        return (
            <main className="min-h-screen bg-white flex items-center justify-center">
                <p className="text-[10px] uppercase tracking-[0.5em] text-stone-400 animate-pulse">Loading…</p>
            </main>
        );
    }

    const isGuest = status === "guest";
    const name = profileName || user?.displayName || (isGuest ? "Guest" : "—");
    const email = user?.email || (isGuest ? "Invite-code access" : "—");
    const roleLabel = isGuest ? "Guest" : (role ?? "—");

    const Row = ({ label, value }: { label: string; value: string }) => (
        <div className="flex items-baseline justify-between gap-6 py-4 border-b border-stone-200">
            <span className="text-[9px] uppercase tracking-[0.4em] font-bold text-stone-500">{label}</span>
            <span className="text-sm text-stone-900 text-right">{value}</span>
        </div>
    );

    return (
        <main className="min-h-screen bg-white font-sans text-stone-900">
            {/* Nav */}
            <nav className="px-8 py-5 border-b border-stone-200 flex items-center justify-between bg-white sticky top-0 z-40">
                <Link
                    href="/"
                    className="text-[10px] uppercase tracking-widest font-bold text-stone-500 hover:text-stone-900 transition-colors"
                >
                    ← NMA
                </Link>
                <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-stone-400">Account</span>
                <div className="w-16" />
            </nav>

            <div className="max-w-lg mx-auto px-6 md:px-8 py-12 md:py-20">
                <h1 className="text-3xl md:text-4xl font-light tracking-tight leading-[1.05] mb-2">Your account</h1>
                <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-stone-400 mb-12">
                    Network Modelmakers Archive
                </p>

                <div className="mb-10">
                    <Row label="Name" value={name} />
                    <Row label="Email" value={email} />
                    <Row label="Access level" value={roleLabel} />
                </div>

                {/* Role explainer */}
                <div className="bg-stone-50 border border-stone-200 rounded-lg p-5 mb-10">
                    <p className="text-[9px] uppercase tracking-[0.4em] font-bold text-stone-500 mb-2">
                        What this means
                    </p>
                    <p className="text-sm text-stone-600 leading-relaxed">
                        {isGuest &&
                            "You're browsing with a guest access code. You can view the published archive; the code may expire."}
                        {!isGuest &&
                            role === "viewer" &&
                            "You have viewer access — you can browse the full published archive."}
                        {!isGuest &&
                            role === "editor" &&
                            "You're an editor. You can browse the archive and manage content in the admin panel."}
                        {!isGuest &&
                            role === "admin" &&
                            "You're an administrator with full access to the archive and the admin panel."}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                    {(role === "admin" || role === "editor") && (
                        <Link
                            href="/admin"
                            className="text-[10px] uppercase tracking-[0.3em] font-bold text-stone-900 border-b-2 border-stone-900 pb-1 hover:text-stone-500 hover:border-stone-500 transition-colors"
                        >
                            Open admin →
                        </Link>
                    )}
                    <Link
                        href="/archive"
                        className="text-[10px] uppercase tracking-[0.3em] font-bold text-stone-500 hover:text-stone-900 transition-colors"
                    >
                        Browse archive →
                    </Link>
                    <button
                        onClick={() => signOut(auth)}
                        className="ml-auto text-[10px] uppercase tracking-[0.3em] font-bold text-stone-500 hover:text-red-500 transition-colors"
                    >
                        Sign out
                    </button>
                </div>
            </div>
        </main>
    );
}
