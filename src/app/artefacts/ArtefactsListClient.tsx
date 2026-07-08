"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, HelpCircle, ChevronDown, Shuffle, ArrowUp } from "lucide-react";
import { SearchPinBar } from "@/components/archive/SearchPinBar";

// ── Types ─────────────────────────────────────────────────────────────────────

type TimestampLike = { seconds: number } | string | null | undefined;

export interface Artefact {
    id: string;
    slug?: string;
    type?: string;
    title?: string;
    imageUrl?: string;
    heroImage?: string;
    audioUrl?: string;
    content?: string;
    excerpt?: string;
    author?: string;
    tags?: string[];
    modelId?: string;
    modelNumber?: string;
    architect?: string;
    year?: number;
    photographer?: string;
    isStarred?: boolean;
    createdAt?: TimestampLike;
    updatedAt?: TimestampLike;
}

type SortKey = "default" | "title" | "year";

// ── Helpers ───────────────────────────────────────────────────────────────────

function inferType(a: Artefact): string {
    if (a.type) return a.type;
    if (a.audioUrl) return "audio";
    if ((a.imageUrl || a.heroImage) && !a.content) return "image";
    return "text";
}

function thumb(a: Artefact): string | null {
    return a.imageUrl || a.heroImage || null;
}

// ── ArtefactTile — square image with blur overlay on hover ───────────────────

function ArtefactTile({ a }: { a: Artefact }) {
    const img = thumb(a);
    const type = inferType(a);
    const href = `/artefacts/${a.slug || a.id}`;

    return (
        <Link
            href={href}
            className="group relative block aspect-square overflow-hidden rounded-xl bg-gray-100"
        >
            {/* Image */}
            {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={img}
                    alt={a.title ?? ""}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                    <span className="text-[8px] uppercase tracking-[0.4em] font-bold text-gray-400">{type}</span>
                </div>
            )}

            {/* Hover overlay — light blur, dark text */}
            <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
                <div className="bg-white/85 backdrop-blur-md px-3 py-3 space-y-1">
                    {a.title && (
                        <p className="text-[11px] font-semibold text-gray-900 leading-snug line-clamp-2">
                            {a.title}
                        </p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[8px] uppercase tracking-[0.35em] font-bold text-gray-500">{type}</span>
                        {a.architect && (
                            <span className="text-[8px] uppercase tracking-[0.2em] font-medium text-gray-400">{a.architect}</span>
                        )}
                        {a.year && (
                            <span className="text-[8px] font-mono text-gray-400">{a.year}</span>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}

// ── Help modal ────────────────────────────────────────────────────────────────

function HelpModal({ onClose }: { onClose: () => void }) {
    return (
        <div className="fixed bottom-[55px] left-5 z-50 pointer-events-none">
            <div
                className="pointer-events-auto w-80 bg-white border border-gray-200 rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
                style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.12)" }}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-gray-500">What are Artefacts?</p>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors"><X size={14} /></button>
                </div>
                <div className="px-5 py-5 space-y-3">
                    <p className="text-sm font-light text-gray-700 leading-relaxed">
                        Artefacts are individual items from the archive: photographs, audio recordings, drawings, and documents, each associated with one or more models in the collection.
                    </p>
                    <p className="text-sm font-light text-gray-700 leading-relaxed">
                        They capture details that lie beyond the model itself: the making process, client relationships, conversations with modelmakers, and the physical context in which the work was produced.
                    </p>
                    <p className="text-sm font-light text-gray-700 leading-relaxed">
                        Filter by type or tag to browse the collection. Click any artefact to view it in full.
                    </p>
                </div>
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

const PAGE_SIZE = 24; // load 24 tiles at a time (8 rows of 3)

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: "default", label: "Sort by" },
    { key: "title",   label: "Title A–Z" },
    { key: "year",    label: "Newest first" },
];

export function ArtefactsListClient({ artefacts }: { artefacts: Artefact[] }) {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [pins, setPins] = useState<string[]>([]);
    const [activeTypes, setActiveTypes] = useState<string[]>([]);
    const [activeTags, setActiveTags] = useState<string[]>([]);
    const [sort, setSort] = useState<SortKey>("default");
    const [sortOpen, setSortOpen] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const sentinelRef = useRef<HTMLDivElement>(null);

    const allTypes = useMemo(() => {
        const set = new Set<string>();
        for (const a of artefacts) set.add(inferType(a));
        return Array.from(set).sort();
    }, [artefacts]);

    const allTags = useMemo(() => {
        const set = new Set<string>();
        for (const a of artefacts) for (const t of a.tags || []) set.add(t);
        return Array.from(set).sort();
    }, [artefacts]);

    const suggestions = useMemo(
        () => [...allTypes, ...allTags].filter((s) => !pins.includes(s)),
        [allTypes, allTags, pins],
    );

    const filtered = useMemo(() => {
        let list = artefacts;
        const terms = [...pins, ...(search.trim() ? [search.trim()] : [])];
        if (terms.length) {
            list = list.filter((a) =>
                terms.every((q) => {
                    const lq = q.toLowerCase();
                    return (
                        (a.title || "").toLowerCase().includes(lq) ||
                        (a.excerpt || "").toLowerCase().includes(lq) ||
                        (a.author || "").toLowerCase().includes(lq) ||
                        (a.architect || "").toLowerCase().includes(lq) ||
                        inferType(a).toLowerCase().includes(lq) ||
                        (a.tags || []).some((t) => t.toLowerCase().includes(lq))
                    );
                }),
            );
        }
        if (activeTypes.length) list = list.filter((a) => activeTypes.includes(inferType(a)));
        if (activeTags.length) list = list.filter((a) => activeTags.every((t) => (a.tags || []).includes(t)));
        if (sort === "title") list = [...list].sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
        if (sort === "year") list = [...list].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
        return list;
    }, [artefacts, search, pins, activeTypes, activeTags, sort]);

    // Reset visible count when filters change
    useEffect(() => { setVisibleCount(PAGE_SIZE); }, [search, pins, activeTypes, activeTags, sort]);

    // Infinite scroll via IntersectionObserver on the bottom sentinel
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setVisibleCount((n) => Math.min(n + PAGE_SIZE, filtered.length));
                }
            },
            { rootMargin: "200px" },
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [filtered.length]);

    const visible = filtered.slice(0, visibleCount);
    const hasFilter = !!(search.trim() || pins.length || activeTypes.length || activeTags.length);

    const handleRandom = useCallback(() => {
        if (!filtered.length) return;
        const pick = filtered[Math.floor(Math.random() * filtered.length)];
        router.push(`/artefacts/${pick.slug || pick.id}`);
    }, [filtered, router]);

    return (
        <main className="min-h-screen bg-white text-gray-900">
            <div className="w-[60vw] mx-auto pt-24 pb-24">

                {/* Page header */}
                <div className="mb-10 space-y-1.5">
                    <h1 className="text-3xl font-light tracking-tight text-gray-900">Artefacts</h1>
                    <p className="text-sm font-light text-gray-500">All images, audio files, quotes, sketches, documents and more on Network Modelmakers Archive.</p>
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
                            placeholder="Search artefacts…"
                        />
                    </div>

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

                    {/* Random button */}
                    <div className="relative group/random">
                        <button
                            onClick={handleRandom}
                            className="flex items-center justify-center h-[38px] w-[38px] rounded-md border border-gray-200 text-gray-500 hover:border-gray-900 hover:text-gray-900 transition-colors bg-white"
                        >
                            <Shuffle size={13} />
                        </button>
                        <div className="absolute bottom-full mb-2 right-0 pointer-events-none opacity-0 group-hover/random:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                            <div className="bg-gray-900 text-white text-[8px] uppercase tracking-[0.3em] font-bold px-2.5 py-1.5 rounded-md">
                                Take me to a random artefact
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filter chips — types and tags stack independently */}
                {(allTypes.length > 1 || allTags.length > 0) && (
                    <div className="mb-8 space-y-2">
                        {allTypes.length > 1 && (
                            <div className="flex flex-wrap gap-2">
                                {allTypes.map((t) => {
                                    const on = activeTypes.includes(t);
                                    return (
                                        <button
                                            key={`type:${t}`}
                                            onClick={() => setActiveTypes((prev) => on ? prev.filter((x) => x !== t) : [...prev, t])}
                                            className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] font-semibold px-3 py-1 rounded-md border transition-colors duration-200 ${
                                                on ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600 hover:border-gray-900 hover:text-gray-900"
                                            }`}
                                        >
                                            {t}
                                            {on && <X size={9} strokeWidth={2.5} />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        {allTags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {allTags.slice(0, 20).map((t) => {
                                    const on = activeTags.includes(t);
                                    return (
                                        <button
                                            key={`tag:${t}`}
                                            onClick={() => setActiveTags((prev) => on ? prev.filter((x) => x !== t) : [...prev, t])}
                                            className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] font-semibold px-3 py-1 rounded-md border transition-colors duration-200 ${
                                                on ? "bg-gray-700 text-white border-gray-700" : "border-gray-200 text-gray-500 hover:border-gray-600 hover:text-gray-700"
                                            }`}
                                        >
                                            {t}
                                            {on && <X size={9} strokeWidth={2.5} />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        {hasFilter && (
                            <button
                                onClick={() => { setSearch(""); setPins([]); setActiveTypes([]); setActiveTags([]); }}
                                className="flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] font-semibold px-3 py-1 rounded-md border border-dashed border-gray-300 text-gray-400 hover:border-gray-900 hover:text-gray-900 transition-colors"
                            >
                                <X size={9} /> Clear all
                            </button>
                        )}
                    </div>
                )}

                {/* Result count */}
                <p className="text-[10px] font-medium text-gray-700 mb-5">
                    Number of artefacts: {filtered.length}
                    {hasFilter ? " found" : ""}
                </p>

                {/* 3-column image grid */}
                {filtered.length === 0 ? (
                    <div className="flex items-center justify-center h-48 border border-dashed border-gray-200 rounded-xl">
                        <p className="text-[10px] uppercase tracking-[0.5em] font-bold text-gray-300">No results</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-3 gap-5">
                            {visible.map((a) => <ArtefactTile key={a.id} a={a} />)}
                        </div>
                        {/* Infinite scroll sentinel */}
                        <div ref={sentinelRef} className="h-10" />
                        {visibleCount < filtered.length && (
                            <p className="text-[9px] uppercase tracking-[0.4em] font-bold text-gray-300 text-center mt-2">
                                Loading…
                            </p>
                        )}
                    </>
                )}
            </div>

            {/* Bottom-left: help */}
            <div className="fixed bottom-5 left-5 z-40">
                <button
                    onClick={() => setHelpOpen((v) => !v)}
                    title="What are artefacts?"
                    className={`flex items-center justify-center w-[34px] h-[34px] rounded-md border transition-colors duration-300 ${helpOpen ? "bg-stone-900 border-stone-900 text-white" : "bg-white/70 backdrop-blur-xl border-stone-200 text-stone-500 hover:bg-stone-900 hover:border-stone-900 hover:text-white"}`}
                >
                    <HelpCircle size={13} />
                </button>
            </div>

            {/* Bottom-right: back to top */}
            <div className="fixed bottom-5 right-5 z-40 group/top">
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

            {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
        </main>
    );
}
