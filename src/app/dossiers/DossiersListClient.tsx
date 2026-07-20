"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shuffle, X, HelpCircle, ChevronDown, ArrowUp } from "lucide-react";
import { SearchPinBar } from "@/components/archive/SearchPinBar";

// ── Types ─────────────────────────────────────────────────────────────────────

type TimestampLike = { seconds: number } | string | null | undefined;

export interface Dossier {
    id: string;
    slug?: string;
    title?: string;
    intro?: string;
    coverImage?: string;
    tags?: string[];
    items?: unknown[];
    createdAt?: TimestampLike;
    updatedAt?: TimestampLike;
}

type DossierItem = { type?: string; imageUrl?: string; [key: string]: unknown };
type SortKey = "default" | "title" | "newest" | "updated";

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseTimestamp(v: TimestampLike): Date | null {
    if (!v) return null;
    if (typeof v === "string") return new Date(v);
    if (typeof v === "object" && "seconds" in v) return new Date(v.seconds * 1000);
    return null;
}

function formatDate(v: TimestampLike): string | null {
    const d = parseTimestamp(v);
    if (!d || isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function getDossierImages(d: Dossier): string[] {
    const urls: string[] = [];
    if (d.coverImage) urls.push(d.coverImage);
    if (Array.isArray(d.items)) {
        for (const item of d.items as DossierItem[]) {
            if (item.imageUrl && !urls.includes(item.imageUrl)) urls.push(item.imageUrl);
        }
    }
    return urls;
}

// ── DossierCard ───────────────────────────────────────────────────────────────

function DossierCard({ d }: { d: Dossier }) {
    const [hovered, setHovered] = useState(false);
    const [imgIdx, setImgIdx] = useState(0);
    const images = useMemo(() => getDossierImages(d), [d]);
    const href = `/dossiers/${d.slug || d.id}`;
    const createdLabel = formatDate(d.createdAt);
    const updatedLabel = formatDate(d.updatedAt);

    useEffect(() => {
        if (!hovered || images.length <= 1) { setImgIdx(0); return; }
        let intervalId: ReturnType<typeof setInterval>;
        const timeoutId = setTimeout(() => {
            setImgIdx((i) => (i + 1) % images.length);
            intervalId = setInterval(() => setImgIdx((i) => (i + 1) % images.length), 700);
        }, 150);
        return () => {
            clearTimeout(timeoutId);
            clearInterval(intervalId);
        };
    }, [hovered, images.length]);

    return (
        <Link
            href={href}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => { setHovered(false); setImgIdx(0); }}
            className="group grid grid-cols-[1fr_280px] items-center gap-8 p-7 bg-white border border-gray-200 rounded-xl hover:border-gray-400 hover:shadow-sm transition-all duration-300"
        >
            {/* Text */}
            <div className="min-w-0 space-y-3">
                {d.tags && d.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {d.tags.slice(0, 5).map((t) => (
                            <span key={t} className="text-[10px] uppercase tracking-[0.15em] font-semibold border border-gray-300 rounded-md px-2.5 py-0.5 text-gray-600">
                                {t}
                            </span>
                        ))}
                    </div>
                )}
                <h2 className="text-2xl font-bold text-gray-900 leading-tight group-hover:text-gray-500 transition-colors duration-300">
                    {d.title || "—"}
                </h2>
                {d.intro && (
                    <p className="text-sm font-light text-gray-600 leading-relaxed line-clamp-2 max-w-xl">
                        {d.intro}
                    </p>
                )}
                {(createdLabel || updatedLabel) && (
                    <p className="text-[9px] uppercase tracking-[0.3em] font-bold text-gray-400">
                        {createdLabel && <>Created {createdLabel}</>}
                        {createdLabel && updatedLabel && <span className="mx-2 text-gray-300">·</span>}
                        {updatedLabel && <>Updated {updatedLabel}</>}
                    </p>
                )}
            </div>

            {/* Image with crossfade cycling */}
            <div className="relative h-28 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
                {images.length > 0 ? images.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        key={url}
                        src={url}
                        alt=""
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${i === imgIdx ? "opacity-100" : "opacity-0"}`}
                    />
                )) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[8px] uppercase tracking-[0.35em] font-bold text-gray-400">No image</span>
                    </div>
                )}
                {images.length > 1 && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 pointer-events-none">
                        {images.slice(0, 6).map((_, i) => (
                            <div key={i} className={`w-1 h-1 rounded-full transition-colors duration-300 ${i === imgIdx ? "bg-white" : "bg-white/35"}`} />
                        ))}
                    </div>
                )}
            </div>
        </Link>
    );
}

// ── Help modal ────────────────────────────────────────────────────────────────

function HelpModal({ onClose }: { onClose: () => void }) {
    return (
        <div className="fixed bottom-[55px] left-5 z-50 pointer-events-none">
            <div
                className="pointer-events-auto w-80 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
                style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.12)" }}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-gray-500">What are Dossiers?</p>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors"><X size={14} /></button>
                </div>
                <div className="px-5 py-5 space-y-3">
                    <p className="text-sm font-light text-gray-700 leading-relaxed">
                        Dossiers are curated thematic collections assembled from the NMA archive. Each dossier brings together models, photographs, and documents around a single architectural idea, period, or collaboration.
                    </p>
                    <p className="text-sm font-light text-gray-700 leading-relaxed">
                        They are authored by Alessandro Rognoni as part of the ongoing archival research, connecting individual models to broader narratives about how architecture was represented and communicated in late 20th-century Britain.
                    </p>
                    <p className="text-sm font-light text-gray-700 leading-relaxed">
                        Use the tag filters to explore by theme, architect, or period. Click any dossier to read it in full.
                    </p>
                </div>
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: "default", label: "Sort by" },
    { key: "title",   label: "Title A–Z" },
    { key: "newest",  label: "Last added" },
    { key: "updated", label: "Last modified" },
];

export function DossiersListClient({ dossiers }: { dossiers: Dossier[] }) {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [pins, setPins] = useState<string[]>([]);
    const [activeTag, setActiveTag] = useState<string | null>(null);
    const [sort, setSort] = useState<SortKey>("default");
    const [sortOpen, setSortOpen] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);

    const allTags = useMemo(() => {
        const set = new Set<string>();
        for (const d of dossiers) for (const t of d.tags || []) set.add(t);
        return Array.from(set).sort();
    }, [dossiers]);

    // Suggestions = all tags not already pinned
    const suggestions = useMemo(() => allTags.filter((t) => !pins.includes(t)), [allTags, pins]);

    const handleRandom = useCallback(() => {
        if (!dossiers.length) return;
        const pick = dossiers[Math.floor(Math.random() * dossiers.length)];
        router.push(`/dossiers/${pick.slug || pick.id}`);
    }, [dossiers, router]);

    const filtered = useMemo(() => {
        let list = dossiers;
        // Pin search: AND across all pins + free-text search
        const terms = [...pins, ...(search.trim() ? [search.trim()] : [])];
        if (terms.length) {
            list = list.filter((d) =>
                terms.every((q) => {
                    const lq = q.toLowerCase();
                    return (
                        (d.title || "").toLowerCase().includes(lq) ||
                        (d.intro || "").toLowerCase().includes(lq) ||
                        (d.tags || []).some((t) => t.toLowerCase().includes(lq))
                    );
                }),
            );
        }
        if (activeTag) list = list.filter((d) => (d.tags || []).includes(activeTag));
        if (sort === "title")   list = [...list].sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
        if (sort === "newest")  list = [...list].sort((a, b) => (parseTimestamp(b.createdAt)?.getTime() ?? 0) - (parseTimestamp(a.createdAt)?.getTime() ?? 0));
        if (sort === "updated") list = [...list].sort((a, b) => (parseTimestamp(b.updatedAt)?.getTime() ?? 0) - (parseTimestamp(a.updatedAt)?.getTime() ?? 0));
        return list;
    }, [dossiers, search, pins, activeTag, sort]);

    const hasFilter = search.trim() || pins.length || activeTag;

    return (
        <main className="min-h-screen bg-white text-gray-900">
            <div className="w-[60vw] mx-auto pt-24 pb-24">

                {/* Page header */}
                <div className="mb-10 space-y-1.5">
                    <h1 className="text-3xl font-light tracking-tight text-gray-900">Dossiers</h1>
                    <p className="text-sm font-light text-gray-500">Thematic analyses of the models on the Network Models Archive.</p>
                </div>

                {/* Controls bar */}
                <div className="mb-6 flex items-center gap-3">
                    <div className="flex-1">
                        <SearchPinBar
                            search={search}
                            onSearch={setSearch}
                            pins={pins}
                            onPin={(v) => setPins((ps) => [...ps, v])}
                            onUnpin={(v) => setPins((ps) => ps.filter((p) => p !== v))}
                            suggestions={suggestions}
                            placeholder="Search dossiers…"
                        />
                    </div>

                    {/* Sort */}
                    <div className="relative">
                        <button
                            onClick={() => setSortOpen((v) => !v)}
                            className={`flex items-center gap-1.5 h-[38px] px-3 rounded-md border text-[9px] uppercase tracking-[0.3em] font-bold transition-colors bg-white ${sort !== "default" ? "border-gray-900 text-gray-900" : "border-gray-200 text-gray-500 hover:border-gray-900 hover:text-gray-900"}`}
                        >
                            {SORT_OPTIONS.find((o) => o.key === sort)?.label}
                            <ChevronDown size={11} />
                        </button>
                        {sortOpen && (
                            <div className="absolute top-full mt-1 right-0 w-36 bg-white border border-gray-200 rounded-md overflow-hidden shadow-md z-40">
                                {SORT_OPTIONS.map((o) => (
                                    <button
                                        key={o.key}
                                        onClick={() => { setSort(o.key); setSortOpen(false); }}
                                        className={`w-full text-left px-4 py-2.5 text-[9px] uppercase tracking-[0.3em] font-bold transition-colors ${sort === o.key ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"}`}
                                    >
                                        {o.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                </div>

                {/* Tag filter chips */}
                {allTags.length > 0 && (
                    <div className="mb-8 flex flex-wrap gap-2">
                        {allTags.map((t) => (
                            <button
                                key={t}
                                onClick={() => setActiveTag(activeTag === t ? null : t)}
                                className={`text-[10px] uppercase tracking-[0.15em] font-semibold px-3 py-1 rounded-md border transition-colors duration-200 ${
                                    activeTag === t
                                        ? "bg-gray-900 text-white border-gray-900"
                                        : "border-gray-200 text-gray-600 hover:border-gray-900 hover:text-gray-900"
                                }`}
                            >
                                {t}
                            </button>
                        ))}
                        {hasFilter && (
                            <button
                                onClick={() => { setSearch(""); setPins([]); setActiveTag(null); }}
                                className="flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] font-semibold px-3 py-1 rounded-md border border-dashed border-gray-300 text-gray-400 hover:border-gray-900 hover:text-gray-900 transition-colors"
                            >
                                <X size={9} /> Clear
                            </button>
                        )}
                    </div>
                )}

                {/* Result count */}
                <p className="text-[10px] font-medium text-gray-700 mb-5">
                    Number of dossiers: {filtered.length}
                    {hasFilter ? " found" : ""}
                </p>

                {/* Cards */}
                {filtered.length === 0 ? (
                    <div className="flex items-center justify-center h-48 border border-dashed border-gray-200 rounded-xl">
                        <p className="text-[10px] uppercase tracking-[0.5em] font-bold text-gray-300">No results</p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {filtered.map((d) => <DossierCard key={d.id} d={d} />)}
                    </div>
                )}
            </div>

            {/* Bottom-left: help */}
            <div className="fixed bottom-5 left-5 z-40">
                <button
                    onClick={() => setHelpOpen((v) => !v)}
                    title="What are dossiers?"
                    className={`flex items-center justify-center w-[34px] h-[34px] rounded-md border transition-colors duration-300 ${helpOpen ? "bg-stone-900 border-stone-900 text-white" : "bg-white/70 backdrop-blur-xl border-stone-200 text-stone-500 hover:bg-stone-900 hover:border-stone-900 hover:text-white"}`}
                >
                    <HelpCircle size={13} />
                </button>
            </div>

            {/* Bottom-right: random + back to top */}
            <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2">
                <button
                    onClick={handleRandom}
                    title="Random dossier"
                    className="flex items-center justify-center w-[34px] h-[34px] rounded-md border border-stone-200 bg-white/70 backdrop-blur-xl text-stone-500 hover:bg-stone-900 hover:border-stone-900 hover:text-white transition-colors duration-300"
                >
                    <Shuffle size={13} />
                </button>
                <div className="relative group/top">
                    <div className="absolute bottom-full mb-2 right-0 pointer-events-none opacity-0 group-hover/top:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                        <span className="bg-stone-900 text-white text-[8px] uppercase tracking-[0.3em] font-bold px-2.5 py-1.5 rounded-md">Back to top</span>
                    </div>
                    <button
                        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                        className="flex items-center justify-center w-[34px] h-[34px] rounded-md border border-stone-200 bg-white/70 backdrop-blur-xl text-stone-500 hover:bg-stone-900 hover:border-stone-900 hover:text-white transition-colors duration-300"
                    >
                        <ArrowUp size={13} />
                    </button>
                </div>
            </div>

            {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
        </main>
    );
}
