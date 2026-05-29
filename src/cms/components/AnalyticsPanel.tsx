"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Users, Eye, MousePointerClick, Clock, ExternalLink } from 'lucide-react';

interface DailyPoint {
    date: string;
    pageViews: number;
    sessions: number;
}

interface TopPage {
    path: string;
    views: number;
    users: number;
}

interface AnalyticsData {
    activeUsers: number;
    summary: {
        sessions: number;
        pageViews: number;
        users: number;
        avgSessionDuration: number;
        bounceRate: number;
    };
    topPages: TopPage[];
    daily: DailyPoint[];
    fetchedAt: string;
}

// ── Sparkline ─────────────────────────────────────────────────────────────────

const Sparkline = ({ data, color = '#1c1917' }: { data: number[]; color?: string }) => {
    if (data.length < 2) return null;
    const max = Math.max(...data, 1);
    const w = 80;
    const h = 28;
    const pts = data.map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - (v / max) * h;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width={w} height={h} className="overflow-visible">
            <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
    );
};

// ── Format helpers ─────────────────────────────────────────────────────────────

function fmtDuration(secs: number): string {
    if (!secs || isNaN(secs)) return '—';
    const m = Math.floor(secs / 60);
    const s = Math.round(secs % 60);
    return `${m}m ${s.toString().padStart(2, '0')}s`;
}

function fmtNum(n: number): string {
    if (!n) return '0';
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
}

// ── Component ─────────────────────────────────────────────────────────────────

export const AnalyticsPanel = () => {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async (quiet = false) => {
        if (!quiet) setLoading(true);
        else setRefreshing(true);
        setError(null);
        try {
            const res = await fetch('/api/analytics');
            if (!res.ok) {
                const body = await res.json().catch(() => ({ error: res.statusText }));
                throw new Error(body.error || res.statusText);
            }
            setData(await res.json());
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to load analytics');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Auto-refresh every 60 seconds
    useEffect(() => {
        const t = setInterval(() => load(true), 60_000);
        return () => clearInterval(t);
    }, [load]);

    // ── Not configured ──
    if (!loading && error?.includes('GA4_PROPERTY_ID not configured')) {
        return (
            <div className="border border-dashed border-stone-200 p-6 space-y-3">
                <p className="text-[9px] uppercase tracking-[0.4em] font-bold text-stone-500">Web Analytics</p>
                <p className="text-[11px] text-stone-500 leading-relaxed">
                    Add <code className="bg-stone-100 px-1 font-mono text-[10px]">GA4_PROPERTY_ID</code> and{' '}
                    <code className="bg-stone-100 px-1 font-mono text-[10px]">NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID</code> to your env to enable live analytics.
                </p>
                <a
                    href="https://console.firebase.google.com/project/modus-archive-nexus/analytics"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400 hover:text-stone-900 transition-colors"
                >
                    Open Firebase Console <ExternalLink size={10} />
                </a>
            </div>
        );
    }

    // ── Error state ──
    if (!loading && error) {
        return (
            <div className="border border-stone-200 p-6 space-y-3">
                <div className="flex items-center justify-between">
                    <p className="text-[9px] uppercase tracking-[0.4em] font-bold text-stone-500">Web Analytics</p>
                    <button onClick={() => load()} className="text-[9px] uppercase tracking-[0.2em] font-bold text-stone-400 hover:text-stone-900 transition-colors flex items-center gap-1.5">
                        <RefreshCw size={10} /> Retry
                    </button>
                </div>
                <p className="text-[10px] font-mono text-red-400">{error}</p>
                <p className="text-[10px] text-stone-400 leading-relaxed">
                    Ensure the Google Analytics Data API is enabled in GCP Console and your service account has the Analytics Viewer role.
                </p>
            </div>
        );
    }

    // ── Loading ──
    if (loading) {
        return (
            <div className="border border-stone-200 p-6 space-y-4 animate-pulse">
                <p className="text-[9px] uppercase tracking-[0.4em] font-bold text-stone-300">Web Analytics</p>
                <div className="grid grid-cols-2 gap-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-14 bg-stone-50 border border-stone-100" />
                    ))}
                </div>
            </div>
        );
    }

    if (!data) return null;

    const maxViews = Math.max(...data.daily.map(d => d.pageViews), 1);

    return (
        <div className="border border-stone-200 p-6 space-y-6 col-span-full">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[9px] uppercase tracking-[0.4em] font-bold text-stone-500">Web Analytics</p>
                    <p className="text-[10px] text-stone-400 font-mono mt-0.5">7-day rolling window</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Live indicator */}
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full bg-stone-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 bg-stone-700" />
                        </span>
                        <span className="text-[9px] uppercase tracking-[0.25em] font-bold text-stone-600">
                            {data.activeUsers} active now
                        </span>
                    </div>
                    <button
                        onClick={() => load(true)}
                        disabled={refreshing}
                        className="p-1.5 border border-stone-200 text-stone-400 hover:text-stone-900 hover:border-stone-900 transition-colors disabled:opacity-40"
                        title="Refresh"
                    >
                        <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Page views', value: fmtNum(data.summary.pageViews), icon: <Eye size={13} />, spark: data.daily.map(d => d.pageViews) },
                    { label: 'Sessions', value: fmtNum(data.summary.sessions), icon: <MousePointerClick size={13} />, spark: data.daily.map(d => d.sessions) },
                    { label: 'Users', value: fmtNum(data.summary.users), icon: <Users size={13} />, spark: null },
                    { label: 'Avg duration', value: fmtDuration(data.summary.avgSessionDuration), icon: <Clock size={13} />, spark: null },
                ].map(stat => (
                    <div key={stat.label} className="border border-stone-100 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[8px] uppercase tracking-[0.3em] font-bold text-stone-400">{stat.label}</span>
                            <span className="text-stone-300">{stat.icon}</span>
                        </div>
                        <p className="text-2xl font-light tabular-nums">{stat.value}</p>
                        {stat.spark && <Sparkline data={stat.spark} />}
                    </div>
                ))}
            </div>

            {/* Daily bar chart */}
            {data.daily.length > 0 && (
                <div>
                    <p className="text-[8px] uppercase tracking-[0.4em] font-bold text-stone-400 mb-3">Page views — last 7 days</p>
                    <div className="flex items-end gap-1 h-16">
                        {data.daily.map(day => (
                            <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group">
                                <div
                                    className="w-full bg-stone-200 group-hover:bg-stone-700 transition-colors"
                                    style={{ height: `${Math.max((day.pageViews / maxViews) * 48, 2)}px` }}
                                    title={`${day.date}: ${day.pageViews} views`}
                                />
                                <span className="text-[7px] font-mono text-stone-300 group-hover:text-stone-500 transition-colors whitespace-nowrap">{day.date}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Top pages */}
            {data.topPages.length > 0 && (
                <div>
                    <p className="text-[8px] uppercase tracking-[0.4em] font-bold text-stone-400 mb-2">Top pages</p>
                    <div className="space-y-1">
                        {data.topPages.map(page => {
                            const pct = (page.views / (data.topPages[0]?.views || 1)) * 100;
                            return (
                                <div key={page.path} className="flex items-center gap-3 group">
                                    <div className="flex-1 relative">
                                        <div
                                            className="absolute inset-y-0 left-0 bg-stone-100 group-hover:bg-stone-200 transition-colors"
                                            style={{ width: `${pct}%` }}
                                        />
                                        <span className="relative text-[10px] font-mono text-stone-600 px-2 py-0.5 truncate block">{page.path}</span>
                                    </div>
                                    <span className="text-[10px] font-mono text-stone-500 w-10 text-right flex-shrink-0">{fmtNum(page.views)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Footer timestamp */}
            <p className="text-[9px] font-mono text-stone-300">
                Updated {new Date(data.fetchedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                {' · '}
                <a
                    href="https://console.firebase.google.com/project/modus-archive-nexus/analytics"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-stone-600 transition-colors inline-flex items-center gap-1"
                >
                    Firebase Console <ExternalLink size={8} />
                </a>
            </p>
        </div>
    );
};
