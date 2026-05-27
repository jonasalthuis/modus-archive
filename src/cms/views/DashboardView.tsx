"use client";

import React, { useEffect, useState } from 'react';
import { collection, query, where, getCountFromServer, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Archive, FileText, BookOpen, Star, Eye, Image as ImageIcon, ExternalLink } from 'lucide-react';

type ActiveView = 'dashboard' | 'prototype' | 'models' | 'articles' | 'dossiers' | 'users' | 'account';

interface Metrics {
    totalModels: number;
    prototypeModels: number;
    visibleModels: number;
    modelsWithImages: number;
    totalArticles: number;
    publishedArticles: number;
    totalDossiers: number;
}

interface RecentModel {
    id: string;
    title?: string;
    architect?: string;
    modelNumber?: string;
    updatedAt?: { seconds: number };
}

interface StatCardProps {
    label: string;
    value: number | string;
    sub?: string;
    icon: React.ReactNode;
    onClick?: () => void;
}

const StatCard = ({ label, value, sub, icon, onClick }: StatCardProps) => (
    <div
        onClick={onClick}
        className={`border border-stone-100 p-6 space-y-4 ${onClick ? 'cursor-pointer hover:border-stone-900 hover:bg-stone-50 transition-all duration-200 group' : ''}`}
    >
        <div className="flex justify-between items-start">
            <span className="text-[9px] uppercase tracking-[0.4em] font-bold text-stone-400">{label}</span>
            <span className="text-stone-200 group-hover:text-stone-400 transition-colors">{icon}</span>
        </div>
        <div>
            <p className="text-4xl font-light tabular-nums">{value}</p>
            {sub && <p className="text-[10px] text-stone-400 mt-1 font-mono">{sub}</p>}
        </div>
    </div>
);

export const DashboardView = ({ onNavigate }: { onNavigate: (view: ActiveView) => void }) => {
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [recent, setRecent] = useState<RecentModel[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetch() {
            try {
                const [
                    totalModels,
                    prototypeModels,
                    visibleModels,
                    totalArticles,
                    publishedArticles,
                    totalDossiers,
                ] = await Promise.all([
                    getCountFromServer(collection(db, 'ma_models')),
                    getCountFromServer(query(collection(db, 'ma_models'), where('inPrototype', '==', true))),
                    getCountFromServer(query(collection(db, 'ma_models'), where('isVisible', '==', true))),
                    getCountFromServer(collection(db, 'ma_articles')),
                    getCountFromServer(query(collection(db, 'ma_articles'), where('isVisible', '==', true))),
                    getCountFromServer(collection(db, 'ma_dossiers')),
                ]);

                // Count models with at least one image — fetch prototype subset only (small)
                const protoSnap = await getDocs(
                    query(collection(db, 'ma_models'), where('inPrototype', '==', true))
                );
                const withImages = protoSnap.docs.filter(d => {
                    const imgs = d.data().images;
                    return Array.isArray(imgs) && imgs.length > 0;
                }).length;

                setMetrics({
                    totalModels: totalModels.data().count,
                    prototypeModels: prototypeModels.data().count,
                    visibleModels: visibleModels.data().count,
                    modelsWithImages: withImages,
                    totalArticles: totalArticles.data().count,
                    publishedArticles: publishedArticles.data().count,
                    totalDossiers: totalDossiers.data().count,
                });

                // Recent models (by updatedAt)
                try {
                    const recentSnap = await getDocs(
                        query(collection(db, 'ma_models'), where('inPrototype', '==', true), orderBy('updatedAt', 'desc'), limit(6))
                    );
                    setRecent(recentSnap.docs.map(d => ({ id: d.id, ...d.data() } as RecentModel)));
                } catch {
                    // updatedAt index may not exist — skip recent list
                }
            } catch (e) {
                console.error('Dashboard fetch error:', e);
            }
            setLoading(false);
        }
        fetch();
    }, []);

    if (loading) return (
        <div className="py-32 flex flex-col items-center gap-4">
            <div className="w-12 h-px bg-stone-200 animate-pulse" />
            <p className="text-[10px] uppercase tracking-[0.5em] text-stone-300 animate-pulse">Loading metrics…</p>
        </div>
    );

    return (
        <div className="space-y-12 animate-in fade-in duration-500">
            {/* Header */}
            <div className="border-b border-stone-100 pb-8">
                <h2 className="text-3xl font-light uppercase tracking-[0.15em]">Dashboard</h2>
                <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-stone-300 mt-2">
                    Network Modelmakers Archive — Status overview
                </p>
            </div>

            {/* Primary stats */}
            <div>
                <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-300 mb-4">Models</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        label="Total models"
                        value={metrics?.totalModels ?? '—'}
                        sub="in database"
                        icon={<Archive size={16} />}
                        onClick={() => onNavigate('models')}
                    />
                    <StatCard
                        label="Prototype"
                        value={metrics?.prototypeModels ?? '—'}
                        sub="selected for site"
                        icon={<Star size={16} />}
                        onClick={() => onNavigate('prototype')}
                    />
                    <StatCard
                        label="Published"
                        value={metrics?.visibleModels ?? '—'}
                        sub="visible on site"
                        icon={<Eye size={16} />}
                        onClick={() => onNavigate('prototype')}
                    />
                    <StatCard
                        label="With images"
                        value={metrics?.modelsWithImages ?? '—'}
                        sub={`of ${metrics?.prototypeModels ?? '?'} prototype`}
                        icon={<ImageIcon size={16} />}
                        onClick={() => onNavigate('prototype')}
                    />
                </div>
            </div>

            {/* Content stats */}
            <div>
                <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-300 mb-4">Content</p>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <StatCard
                        label="Articles"
                        value={metrics?.totalArticles ?? '—'}
                        sub={`${metrics?.publishedArticles ?? 0} published`}
                        icon={<FileText size={16} />}
                        onClick={() => onNavigate('articles')}
                    />
                    <StatCard
                        label="Dossiers"
                        value={metrics?.totalDossiers ?? '—'}
                        sub="thematic collections"
                        icon={<BookOpen size={16} />}
                        onClick={() => onNavigate('dossiers')}
                    />
                    <div className="border border-dashed border-stone-100 p-6 flex flex-col justify-between">
                        <div>
                            <p className="text-[9px] uppercase tracking-[0.4em] font-bold text-stone-300">Web Analytics</p>
                            <p className="text-[11px] text-stone-400 mt-3 leading-relaxed">
                                Page views, sessions, and traffic data are available in the Firebase Console via Google Analytics.
                            </p>
                        </div>
                        <a
                            href="https://console.firebase.google.com/project/modus-archive-nexus/analytics"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400 hover:text-stone-900 transition-colors"
                        >
                            Open Firebase Console <ExternalLink size={10} />
                        </a>
                    </div>
                </div>
            </div>

            {/* Recent prototype models */}
            {recent.length > 0 && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-300">
                            Recently updated — Prototype
                        </p>
                        <button
                            onClick={() => onNavigate('prototype')}
                            className="text-[9px] uppercase tracking-[0.2em] font-bold text-stone-400 hover:text-stone-900 transition-colors"
                        >
                            View all →
                        </button>
                    </div>
                    <div className="border border-stone-100">
                        {recent.map((m, i) => (
                            <div
                                key={m.id}
                                className={`flex items-center gap-6 px-5 py-3 hover:bg-stone-50 cursor-pointer transition-colors ${i < recent.length - 1 ? 'border-b border-stone-50' : ''}`}
                                onClick={() => onNavigate('prototype')}
                            >
                                <span className="text-[10px] font-mono text-stone-300 w-12 flex-shrink-0">{m.modelNumber || m.id}</span>
                                <span className="text-sm font-light flex-1 truncate">{m.title || '—'}</span>
                                <span className="text-[10px] text-stone-400 truncate hidden md:block">{m.architect || '—'}</span>
                                {m.updatedAt && (
                                    <span className="text-[9px] font-mono text-stone-300 flex-shrink-0">
                                        {new Date(m.updatedAt.seconds * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Completion checklist */}
            <div>
                <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-300 mb-4">Prototype readiness</p>
                <div className="border border-stone-100 divide-y divide-stone-50">
                    {[
                        {
                            label: 'Models selected',
                            done: (metrics?.prototypeModels ?? 0) >= 35,
                            detail: `${metrics?.prototypeModels ?? 0} / 35 target`,
                        },
                        {
                            label: 'Models published',
                            done: (metrics?.visibleModels ?? 0) >= 35,
                            detail: `${metrics?.visibleModels ?? 0} visible`,
                        },
                        {
                            label: 'Images uploaded',
                            done: (metrics?.modelsWithImages ?? 0) >= 35,
                            detail: `${metrics?.modelsWithImages ?? 0} of ${metrics?.prototypeModels ?? '?'} with photos`,
                        },
                        {
                            label: 'Articles published',
                            done: (metrics?.publishedArticles ?? 0) > 0,
                            detail: `${metrics?.publishedArticles ?? 0} live`,
                        },
                    ].map(item => (
                        <div key={item.label} className="flex items-center gap-4 px-5 py-3">
                            <span className={`w-2 h-2 flex-shrink-0 ${item.done ? 'bg-stone-900' : 'bg-stone-100 border border-stone-200'}`} />
                            <span className="text-sm flex-1 font-light">{item.label}</span>
                            <span className="text-[10px] font-mono text-stone-400">{item.detail}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
