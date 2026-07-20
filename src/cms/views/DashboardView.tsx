"use client";

import React, { useEffect, useState } from "react";
import { collection, query, where, getCountFromServer, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Archive, FileText, BookOpen, Star, Eye, Image as ImageIcon } from "lucide-react";
import { AnalyticsPanel } from "../components/AnalyticsPanel";

type ActiveView =
    | "dashboard"
    | "models"
    | "add-model"
    | "artefacts"
    | "dossiers"
    | "dossier-editor"
    | "users"
    | "invites"
    | "account";

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
        className={`bg-white rounded-xl border border-gray-300 shadow-sm p-6 space-y-4 ${onClick ? "cursor-pointer hover:shadow-md hover:border-gray-400 transition-all duration-200 group" : ""}`}
    >
        <div className="flex justify-between items-start">
            <span className="text-[9px] uppercase tracking-[0.4em] font-bold text-gray-500">{label}</span>
            <span className="text-gray-300 group-hover:text-gray-500 transition-colors">{icon}</span>
        </div>
        <div>
            <p className="text-4xl font-light tabular-nums">{value}</p>
            {sub && <p className="text-[10px] text-gray-500 mt-1 font-mono">{sub}</p>}
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
                const [totalModels, prototypeModels, visibleModels, totalArticles, publishedArticles, totalDossiers] =
                    await Promise.all([
                        getCountFromServer(collection(db, "ma_models")),
                        getCountFromServer(query(collection(db, "ma_models"), where("inPrototype", "==", true))),
                        getCountFromServer(query(collection(db, "ma_models"), where("isVisible", "==", true))),
                        getCountFromServer(collection(db, "ma_articles")),
                        getCountFromServer(query(collection(db, "ma_articles"), where("isVisible", "==", true))),
                        getCountFromServer(collection(db, "ma_dossiers")),
                    ]);

                // Count models with at least one image — fetch prototype subset only (small)
                const protoSnap = await getDocs(query(collection(db, "ma_models"), where("inPrototype", "==", true)));
                const withImages = protoSnap.docs.filter((d) => {
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
                        query(
                            collection(db, "ma_models"),
                            where("inPrototype", "==", true),
                            orderBy("updatedAt", "desc"),
                            limit(6),
                        ),
                    );
                    setRecent(recentSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as RecentModel));
                } catch {
                    // updatedAt index may not exist — skip recent list
                }
            } catch (e) {
                console.error("Dashboard fetch error:", e);
            }
            setLoading(false);
        }
        fetch();
    }, []);

    if (loading)
        return (
            <div className="py-32 flex flex-col items-center gap-4">
                <div className="w-12 h-px bg-gray-300 animate-pulse" />
                <p className="text-[10px] uppercase tracking-[0.5em] text-gray-400 animate-pulse">Loading metrics…</p>
            </div>
        );

    return (
        <div className="space-y-12 animate-in fade-in duration-500">
            {/* Header */}
            <div className="border-b border-gray-400 pb-8">
                <h2 className="text-3xl font-light uppercase tracking-[0.15em]">Dashboard</h2>
                <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-gray-500 mt-2">
                    Network Models Archive — Status overview
                </p>
            </div>

            {/* Primary stats */}
            <div>
                <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-gray-600 mb-4">Models</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        label="Total models"
                        value={metrics?.totalModels ?? "—"}
                        sub="in database"
                        icon={<Archive size={16} />}
                        onClick={() => onNavigate("models")}
                    />
                    <StatCard
                        label="Prototype"
                        value={metrics?.prototypeModels ?? "—"}
                        sub="selected for site"
                        icon={<Star size={16} />}
                        onClick={() => onNavigate("models")}
                    />
                    <StatCard
                        label="Published"
                        value={metrics?.visibleModels ?? "—"}
                        sub="visible on site"
                        icon={<Eye size={16} />}
                        onClick={() => onNavigate("models")}
                    />
                    <StatCard
                        label="With images"
                        value={metrics?.modelsWithImages ?? "—"}
                        sub={`of ${metrics?.prototypeModels ?? "?"} prototype`}
                        icon={<ImageIcon size={16} />}
                        onClick={() => onNavigate("models")}
                    />
                </div>
            </div>

            {/* Content stats */}
            <div>
                <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-gray-500 mb-4">Content</p>
                <div className="grid grid-cols-2 gap-4">
                    <StatCard
                        label="Articles"
                        value={metrics?.totalArticles ?? "—"}
                        sub={`${metrics?.publishedArticles ?? 0} published`}
                        icon={<FileText size={16} />}
                        onClick={() => onNavigate("artefacts")}
                    />
                    <StatCard
                        label="Dossiers"
                        value={metrics?.totalDossiers ?? "—"}
                        sub="thematic collections"
                        icon={<BookOpen size={16} />}
                        onClick={() => onNavigate("dossiers")}
                    />
                </div>
            </div>

            {/* Analytics panel */}
            <div>
                <div className="grid grid-cols-1">
                    <AnalyticsPanel />
                </div>
            </div>

            {/* Recent prototype models */}
            {recent.length > 0 && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-gray-400">
                            Recently updated — Prototype
                        </p>
                        <button
                            onClick={() => onNavigate("models")}
                            className="text-[9px] uppercase tracking-[0.2em] font-bold text-gray-500 hover:text-gray-900 transition-colors"
                        >
                            View all →
                        </button>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-300 shadow-sm overflow-hidden">
                        {recent.map((m, i) => (
                            <div
                                key={m.id}
                                className={`flex items-center gap-6 px-5 py-3 hover:bg-gray-100 cursor-pointer transition-colors ${i < recent.length - 1 ? "border-b border-gray-300" : ""}`}
                                onClick={() => onNavigate("models")}
                            >
                                <span className="text-[10px] font-mono text-gray-400 w-12 flex-shrink-0">
                                    {m.modelNumber || m.id}
                                </span>
                                <span className="text-sm font-light flex-1 truncate">{m.title || "—"}</span>
                                <span className="text-[10px] text-gray-500 truncate hidden md:block">
                                    {m.architect || "—"}
                                </span>
                                {m.updatedAt && (
                                    <span className="text-[9px] font-mono text-gray-400 flex-shrink-0">
                                        {new Date(m.updatedAt.seconds * 1000).toLocaleDateString("en-GB", {
                                            day: "2-digit",
                                            month: "short",
                                        })}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
