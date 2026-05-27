"use client";

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Inter } from "next/font/google";
import {
    LayoutDashboard,
    Star,
    Archive,
    FileText,
    BookOpen,
    Users,
    UserCircle,
    LogOut,
} from 'lucide-react';

import { LoginView } from "./views/LoginView";
import { DashboardView } from "./views/DashboardView";
import { AccountView } from "./views/AccountView";
import { GenericCollection } from "./components/GenericCollection";
import { PrototypeCollection } from "./components/PrototypeCollection";

const inter = Inter({ subsets: ["latin"] });

export type ActiveView =
    | 'dashboard'
    | 'prototype'
    | 'models'
    | 'articles'
    | 'dossiers'
    | 'users'
    | 'account';

const NAV: {
    id: ActiveView;
    label: string;
    icon: React.ReactNode;
    section?: string;
}[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
    { id: 'prototype', label: 'Prototype', icon: <Star size={15} />, section: 'Editorial' },
    { id: 'models', label: 'Models', icon: <Archive size={15} />, section: 'Collections' },
    { id: 'articles', label: 'Articles', icon: <FileText size={15} />, section: 'Collections' },
    { id: 'dossiers', label: 'Dossiers', icon: <BookOpen size={15} />, section: 'Collections' },
    { id: 'users', label: 'Users', icon: <Users size={15} />, section: 'Collections' },
];

// ─── Sidebar ────────────────────────────────────────────────────────────────

const Sidebar = ({
    activeView,
    user,
    onNavigate,
    onSignOut,
}: {
    activeView: ActiveView;
    user: User;
    onNavigate: (v: ActiveView) => void;
    onSignOut: () => void;
}) => {
    // Collect unique section labels in order
    const sections: (string | null)[] = [];
    NAV.forEach(item => {
        const s = item.section ?? null;
        if (!sections.includes(s)) sections.push(s);
    });

    return (
        <aside className="w-52 flex-shrink-0 border-r border-stone-100 flex flex-col min-h-screen sticky top-0">
            {/* Logo */}
            <div className="px-6 py-7 border-b border-stone-100">
                <p className="text-xl font-light uppercase tracking-[0.25em]">NMA</p>
                <p className="text-[8px] uppercase tracking-[0.5em] font-bold text-stone-300 mt-0.5">Admin</p>
            </div>

            {/* Nav */}
            <nav className="flex-1 py-4 overflow-y-auto">
                {sections.map(section => {
                    const items = NAV.filter(n => (n.section ?? null) === section);
                    return (
                        <div key={section ?? 'top'} className="mb-1">
                            {section && (
                                <p className="text-[8px] uppercase tracking-[0.6em] font-bold text-stone-200 px-6 py-3">
                                    {section}
                                </p>
                            )}
                            {items.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => onNavigate(item.id)}
                                    className={`w-full flex items-center gap-3 px-6 py-2.5 text-[10px] uppercase tracking-[0.2em] font-bold transition-colors ${
                                        activeView === item.id
                                            ? 'text-stone-900 bg-stone-50'
                                            : 'text-stone-400 hover:text-stone-700 hover:bg-stone-50'
                                    }`}
                                >
                                    <span className={activeView === item.id ? 'text-stone-900' : 'text-stone-300'}>
                                        {item.icon}
                                    </span>
                                    {item.label}
                                    {activeView === item.id && (
                                        <span className="ml-auto w-1 h-1 bg-stone-900 rounded-none" />
                                    )}
                                </button>
                            ))}
                        </div>
                    );
                })}
            </nav>

            {/* Account + sign out */}
            <div className="border-t border-stone-100 p-3 space-y-1">
                <button
                    onClick={() => onNavigate('account')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-none transition-colors ${
                        activeView === 'account'
                            ? 'bg-stone-50 text-stone-900'
                            : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900'
                    }`}
                >
                    <UserCircle size={15} className="flex-shrink-0 text-stone-300" />
                    <div className="text-left min-w-0">
                        <p className="text-[10px] font-bold truncate leading-tight">
                            {user.displayName || 'Account'}
                        </p>
                        <p className="text-[9px] text-stone-300 truncate">{user.email}</p>
                    </div>
                </button>
                <button
                    onClick={onSignOut}
                    className="w-full flex items-center gap-3 px-3 py-2 text-[10px] uppercase tracking-[0.2em] font-bold text-stone-300 hover:text-red-500 transition-colors"
                >
                    <LogOut size={13} />
                    Sign out
                </button>
            </div>
        </aside>
    );
};

// ─── Engine ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const CMSEngine = ({ name: _name, config: _config }: { name?: string; config?: unknown }) => {
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [activeView, setActiveView] = useState<ActiveView>('dashboard');

    useEffect(() => {
        return onAuthStateChanged(auth, u => {
            setUser(u);
            setAuthLoading(false);
        });
    }, []);

    if (authLoading) return (
        <div className={`min-h-screen flex items-center justify-center bg-white ${inter.className}`}>
            <p className="text-[10px] uppercase tracking-[0.5em] text-stone-300">Loading…</p>
        </div>
    );

    if (!user) return <LoginView />;

    const schemas = getNMASchemas();

    const handleSignOut = async () => {
        if (confirm('Sign out of NMA Admin?')) await firebaseSignOut(auth);
    };

    const renderView = () => {
        switch (activeView) {
            case 'dashboard': return <DashboardView onNavigate={setActiveView} />;
            case 'prototype': return <PrototypeCollection schema={schemas.models} />;
            case 'models':    return <GenericCollection schema={schemas.models} />;
            case 'articles':  return <GenericCollection schema={schemas.articles} />;
            case 'dossiers':  return <GenericCollection schema={schemas.dossiers} />;
            case 'users':     return <GenericCollection schema={schemas.users} />;
            case 'account':   return <AccountView user={user} />;
            default:          return null;
        }
    };

    return (
        <div className={`flex min-h-screen bg-white text-black ${inter.className}`}>
            <Sidebar
                activeView={activeView}
                user={user}
                onNavigate={setActiveView}
                onSignOut={handleSignOut}
            />
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-5xl px-10 py-10">
                    {renderView()}
                </div>
            </main>
        </div>
    );
};

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const getNMASchemas = () => ({
    models: {
        name: "Models",
        path: "ma_models",
        properties: {
            // — Visibility —
            inPrototype: { name: "In prototype", dataType: "boolean", defaultValue: false },
            isVisible:   { name: "Visible on site", dataType: "boolean", defaultValue: false },
            gridSize: {
                name: "Grid card size",
                dataType: "string",
                config: { enumValues: ["S", "M", "L", "Bi"] },
                defaultValue: "M",
            },

            // — Core identity —
            modelNumber: { name: "Model number (REF #)", dataType: "string", validation: { required: true } },
            title:       { name: "Project title", dataType: "string", validation: { required: true } },
            architect:   { name: "Architect / Studio", dataType: "string" },
            year:        { name: "Year", dataType: "number" },

            // — Model specifics —
            scale:     { name: "Scale", dataType: "string" },
            modelSize: { name: "Physical size", dataType: "string" },
            modelType: {
                name: "Model type",
                dataType: "string",
                config: {
                    enumValues: [
                        "presentation", "study", "competition", "urban",
                        "structural", "detail", "section", "interior", "fragment",
                    ],
                },
            },
            buildingType:   { name: "Building type", dataType: "string" },
            buildingStatus: {
                name: "Building status",
                dataType: "string",
                config: { enumValues: ["built", "unbuilt", "competition", "demolished", "unknown"] },
            },
            materials: { name: "Materials", dataType: "array", of: { dataType: "string" } },
            tags:      { name: "Tags", dataType: "array", of: { dataType: "string" } },

            // — People & provenance —
            location:    { name: "Building location", dataType: "string" },
            leadMaker:   { name: "Lead maker", dataType: "string" },
            otherMakers: { name: "Other makers", dataType: "string" },
            photographer: { name: "Photographer", dataType: "string" },
            provenance:  { name: "Current location / provenance", dataType: "string" },

            // — Editorial —
            notes: { name: "Notes", dataType: "string", multiline: true },

            // — Media —
            images:         { name: "Images", dataType: "imageGallery" },
            voiceNarrative: { name: "Audio narrative", dataType: "audioUpload" },
        },
    },

    dossiers: {
        name: "Dossiers",
        path: "ma_dossiers",
        properties: {
            isVisible:  { name: "Visible on site", dataType: "boolean", defaultValue: false },
            title:      { name: "Title", dataType: "string", validation: { required: true } },
            slug:       { name: "Slug (URL)", dataType: "string", validation: { required: true } },
            intro:      { name: "Intro text", dataType: "string", multiline: true },
            coverImage: { name: "Cover image URL", dataType: "string" },
        },
    },

    articles: {
        name: "Articles",
        path: "ma_articles",
        properties: {
            isVisible: { name: "Published", dataType: "boolean", defaultValue: false },
            title:     { name: "Title", dataType: "string", validation: { required: true } },
            slug:      { name: "Slug (URL)", dataType: "string", validation: { required: true } },
            author:    { name: "Author", dataType: "string" },
            excerpt:   { name: "Excerpt", dataType: "string", multiline: true },
            content:   { name: "Content", dataType: "string", markdown: true },
            tags:      { name: "Tags", dataType: "array", of: { dataType: "string" } },
        },
    },

    users: {
        name: "Users",
        path: "ma_users",
        properties: {
            displayName: { name: "Name", dataType: "string", validation: { required: true } },
            email:       { name: "Email", dataType: "string", validation: { required: true } },
            role: {
                name: "Role",
                dataType: "string",
                config: { enumValues: ["admin", "editor", "viewer"] },
                defaultValue: "viewer",
            },
        },
    },
});
