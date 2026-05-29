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
    Plus,
} from 'lucide-react';

import { LoginView } from "./views/LoginView";
import { DashboardView } from "./views/DashboardView";
import { AccountView } from "./views/AccountView";
import { GenericCollection } from "./components/GenericCollection";
import { PrototypeCollection } from "./components/PrototypeCollection";
import { AddModelPanel } from "./components/AddModelPanel";

const inter = Inter({ subsets: ["latin"] });

export type ActiveView =
    | 'dashboard'
    | 'prototype'
    | 'models'
    | 'add-model'
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

            {/* ── Add model CTA ── */}
            <div className="px-4 py-4 border-b border-stone-100">
                <button
                    onClick={() => onNavigate('add-model')}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 text-[9px] uppercase tracking-[0.3em] font-bold transition-all ${
                        activeView === 'add-model'
                            ? 'bg-stone-700 text-white'
                            : 'bg-stone-900 text-white hover:bg-stone-700'
                    }`}
                >
                    <Plus size={13} />
                    New model
                </button>
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
            case 'dashboard':  return <DashboardView onNavigate={setActiveView} />;
            case 'prototype':  return <PrototypeCollection schema={schemas.models} />;
            case 'models':     return <GenericCollection schema={schemas.models} />;
            case 'add-model':  return (
                <AddModelPanel
                    onSave={() => setActiveView('models')}
                    onCancel={() => setActiveView('models')}
                />
            );
            case 'articles':   return <GenericCollection schema={schemas.articles} />;
            case 'dossiers':   return <GenericCollection schema={schemas.dossiers} />;
            case 'users':      return <GenericCollection schema={schemas.users} />;
            case 'account':    return <AccountView user={user} />;
            default:           return null;
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
            // ── Table-primary columns (visible by default) ──
            modelNumber:    { name: "Ref #",           dataType: "string",       validation: { required: true }, tableVisible: true,  tableWidth: 85 },
            title:          { name: "Title",           dataType: "string",       validation: { required: true }, tableVisible: true,  tableWidth: 230 },
            architect:      { name: "Architect",       dataType: "string",       tableVisible: true,  tableWidth: 180 },
            year:           { name: "Year",            dataType: "number",       tableVisible: true,  tableWidth: 72 },
            isVisible:      { name: "Published",       dataType: "boolean",      defaultValue: false, tableVisible: true,  tableWidth: 90 },
            inPrototype:    { name: "Prototype",       dataType: "boolean",      defaultValue: false, tableVisible: true,  tableWidth: 90 },
            images:         { name: "Images",          dataType: "imageGallery", tableVisible: true,  tableWidth: 72 },
            voiceNarrative: { name: "Audio",           dataType: "audioUpload",  tableVisible: true,  tableWidth: 65 },

            // ── Extra detail columns (hidden by default, toggleable) ──
            modelType: {
                name: "Model type", dataType: "string", tableVisible: false, tableWidth: 120,
                config: { enumValues: ["presentation","study","competition","urban","structural","detail","section","interior","fragment"] },
            },
            buildingType:   { name: "Building type",  dataType: "string",  tableVisible: false, tableWidth: 130 },
            buildingStatus: {
                name: "Building status", dataType: "string", tableVisible: false, tableWidth: 120,
                config: { enumValues: ["built","unbuilt","competition","demolished","unknown"] },
            },
            scale:       { name: "Scale",          dataType: "string",  tableVisible: false, tableWidth: 90 },
            modelSize:   { name: "Physical size",  dataType: "string",  tableVisible: false, tableWidth: 120 },
            location:    { name: "Location",       dataType: "string",  tableVisible: false, tableWidth: 160 },
            leadMaker:   { name: "Lead maker",     dataType: "string",  tableVisible: false, tableWidth: 150 },
            otherMakers: { name: "Other makers",   dataType: "string",  tableVisible: false, tableWidth: 150 },
            photographer:{ name: "Photographer",   dataType: "string",  tableVisible: false, tableWidth: 140 },
            provenance:  { name: "Provenance",     dataType: "string",  tableVisible: false, tableWidth: 160 },
            materials:   { name: "Materials",      dataType: "array",   tableVisible: false, tableWidth: 150, of: { dataType: "string" } },
            tags:        { name: "Tags",           dataType: "array",   tableVisible: false, tableWidth: 130, of: { dataType: "string" } },
            notes:       { name: "Notes",          dataType: "string",  tableVisible: false, tableWidth: 200, multiline: true },
            gridSize: {
                name: "Grid size", dataType: "string", tableVisible: false, tableWidth: 80,
                config: { enumValues: ["S","M","L","Bi"] }, defaultValue: "M",
            },
        },
    },

    dossiers: {
        name: "Dossiers",
        path: "ma_dossiers",
        properties: {
            title:      { name: "Title",       dataType: "string",  validation: { required: true }, tableVisible: true,  tableWidth: 280 },
            slug:       { name: "Slug",        dataType: "string",  validation: { required: true }, tableVisible: true,  tableWidth: 180 },
            isVisible:  { name: "Visible",     dataType: "boolean", defaultValue: false,             tableVisible: true,  tableWidth: 80 },
            intro:      { name: "Intro text",  dataType: "string",  tableVisible: false, tableWidth: 300, multiline: true },
            coverImage: { name: "Cover image", dataType: "string",  tableVisible: false, tableWidth: 200 },
        },
    },

    articles: {
        name: "Articles",
        path: "ma_articles",
        properties: {
            title:    { name: "Title",    dataType: "string",  validation: { required: true }, tableVisible: true, tableWidth: 260 },
            slug:     { name: "Slug",     dataType: "string",  validation: { required: true }, tableVisible: true, tableWidth: 180 },
            author:   { name: "Author",   dataType: "string",  tableVisible: true,  tableWidth: 140 },
            isVisible:{ name: "Published",dataType: "boolean", defaultValue: false,  tableVisible: true,  tableWidth: 90 },
            excerpt:  { name: "Excerpt",  dataType: "string",  tableVisible: false, tableWidth: 280, multiline: true },
            content:  { name: "Content",  dataType: "string",  tableVisible: false, tableWidth: 300, markdown: true },
            tags:     { name: "Tags",     dataType: "array",   tableVisible: false, tableWidth: 130, of: { dataType: "string" } },
        },
    },

    users: {
        name: "Users",
        path: "ma_users",
        properties: {
            displayName: { name: "Name",  dataType: "string", validation: { required: true }, tableVisible: true, tableWidth: 200 },
            email:       { name: "Email", dataType: "string", validation: { required: true }, tableVisible: true, tableWidth: 240 },
            role: {
                name: "Role", dataType: "string", tableVisible: true, tableWidth: 100,
                config: { enumValues: ["admin","editor","viewer"] }, defaultValue: "viewer",
            },
        },
    },
});
