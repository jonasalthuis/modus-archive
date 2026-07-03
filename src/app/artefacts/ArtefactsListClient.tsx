"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, X, ChevronDown, ChevronUp, LayoutList, LayoutGrid } from "lucide-react";

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
}

type ViewMode = "list" | "grid";

function inferType(a: Artefact): string {
    if (a.type) return a.type;
    if (a.audioUrl) return "audio";
    if ((a.imageUrl || a.heroImage) && !a.content) return "image";
    return "text";
}

function thumb(a: Artefact) {
    return a.imageUrl || a.heroImage || null;
}

function FloatingSearch({
    value,
    onChange,
    open,
    onToggle,
    placeholder,
}: {
    value: string;
    onChange: (v: string) => void;
    open: boolean;
    onToggle: () => void;
    placeholder: string;
}) {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 50);
    }, [open]);

    if (!open) {
        return (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40">
                <button
                    onClick={onToggle}
                    className="flex items-center gap-2 px-4 py-2 bg-white/50 backdrop-blur-xl border border-stone-200 rounded-xl text-stone-400 hover:text-stone-900 transition-colors text-[9px] uppercase tracking-[0.3em] font-bold"
                >
                    <Search size={12} />
                    {value && (
                        <span className="text-stone-500 font-light normal-case tracking-normal text-[10px]">
                            {value}
                        </span>
                    )}
                    <ChevronDown size={12} />
                </button>
            </div>
        );
    }

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 w-[min(calc(100vw-300px),560px)]">
            <div className="bg-white/50 backdrop-blur-xl border border-stone-200 rounded-xl px-6 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                    <Search size={12} className="text-stone-300 flex-shrink-0" />
                    <input
                        ref={inputRef}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={(e) => e.key === "Escape" && onChange("")}
                        placeholder={placeholder}
                        autoComplete="off"
                        spellCheck={false}
                        className="flex-1 min-w-[60px] text-[10px] tracking-[0.15em] font-bold text-stone-800 placeholder:text-stone-300 placeholder:font-normal placeholder:tracking-[0.1em] bg-transparent outline-none"
                    />
                    {value && (
                        <button
                            onClick={() => onChange("")}
                            className="text-stone-400 hover:text-stone-900 transition-colors flex-shrink-0"
                        >
                            <X size={12} />
                        </button>
                    )}
                    <button
                        onClick={onToggle}
                        className="text-stone-400 hover:text-stone-800 transition-colors flex-shrink-0 ml-1"
                    >
                        <ChevronUp size={13} />
                    </button>
                </div>
            </div>
        </div>
    );
}

export function ArtefactsListClient({ artefacts }: { artefacts: Artefact[] }) {
    const [search, setSearch] = useState("");
    const [searchOpen, setSearchOpen] = useState(true);
    const [view, setView] = useState<ViewMode>("list");

    const filtered = useMemo(() => {
        if (!search.trim()) return artefacts;
        const q = search.toLowerCase();
        return artefacts.filter(
            (a) =>
                (a.title || "").toLowerCase().includes(q) ||
                (a.excerpt || "").toLowerCase().includes(q) ||
                (a.author || "").toLowerCase().includes(q) ||
                (a.tags || []).some((t) => t.toLowerCase().includes(q)),
        );
    }, [artefacts, search]);

    return (
        <main className="min-h-screen bg-white text-stone-900">
            <FloatingSearch
                value={search}
                onChange={setSearch}
                open={searchOpen}
                onToggle={() => setSearchOpen((v) => !v)}
                placeholder="Search artefacts"
            />

            <div className="pt-[58px]">
                {filtered.length === 0 ? (
                    <div className="flex items-center justify-center h-64">
                        <p className="text-[10px] uppercase tracking-[0.5em] font-bold text-stone-300">
                            {search ? "No results" : "No artefacts published yet"}
                        </p>
                    </div>
                ) : view === "list" ? (
                    <div className="max-w-7xl mx-auto px-8 py-6 space-y-3">
                        {filtered.map((a, i) => {
                            const type = inferType(a);
                            const href = `/artefacts/${a.slug || a.id}`;
                            return (
                                <Link
                                    key={a.id}
                                    href={href}
                                    className="group grid grid-cols-[2.5rem_1fr_auto] md:grid-cols-[2.5rem_1fr_280px_auto] items-center gap-6 px-6 py-6 rounded-xl border border-stone-100 hover:border-stone-300 bg-white hover:bg-stone-50 transition-all duration-300"
                                >
                                    <span className="font-mono text-xs text-stone-400 tabular-nums">
                                        {String(i + 1).padStart(2, "0")}
                                    </span>
                                    <div className="min-w-0 space-y-2">
                                        {a.tags && a.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {a.tags.slice(0, 3).map((t) => (
                                                    <span
                                                        key={t}
                                                        className="text-[7px] uppercase tracking-[0.4em] font-bold border border-stone-200 rounded px-1.5 py-0.5 text-stone-400"
                                                    >
                                                        {t}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <h2 className="text-xl font-light leading-snug group-hover:text-stone-500 transition-colors duration-300">
                                            {a.title || "—"}
                                        </h2>
                                        {(a.architect || a.excerpt) && (
                                            <p className="text-sm font-light text-stone-400 leading-relaxed max-w-lg line-clamp-1">
                                                {a.architect || a.excerpt}
                                                {a.architect && a.year ? `, ${a.year}` : ""}
                                            </p>
                                        )}
                                    </div>
                                    <div className="hidden md:block">
                                        {thumb(a) ? (
                                            <div className="relative h-16 w-full rounded-md bg-stone-50 overflow-hidden">
                                                <Image
                                                    src={thumb(a)!}
                                                    alt={a.title ?? ""}
                                                    fill
                                                    className="object-cover group-hover:scale-[1.04] transition-transform duration-500"
                                                    sizes="280px"
                                                />
                                            </div>
                                        ) : (
                                            <div className="h-16 w-full rounded-md bg-stone-50 border border-stone-100 flex items-center justify-center">
                                                <span className="text-[7px] uppercase tracking-[0.4em] font-bold text-stone-300">
                                                    {type}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className="text-[7px] uppercase tracking-[0.35em] font-bold text-stone-300">
                                            {type}
                                        </span>
                                        <span className="text-stone-400 group-hover:text-stone-900 transition-colors duration-300 text-base">
                                            →
                                        </span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className="max-w-7xl mx-auto px-8 py-6">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {filtered.map((a) => {
                                const type = inferType(a);
                                const href = `/artefacts/${a.slug || a.id}`;
                                return (
                                    <Link
                                        key={a.id}
                                        href={href}
                                        className="group block rounded-xl overflow-hidden border border-stone-100 hover:border-stone-300 transition-all duration-300 relative aspect-[3/4] bg-stone-100"
                                    >
                                        {thumb(a) ? (
                                            <Image
                                                src={thumb(a)!}
                                                alt={a.title ?? ""}
                                                fill
                                                className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
                                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-stone-50 flex items-center justify-center">
                                                <span className="text-[7px] uppercase tracking-[0.4em] font-bold text-stone-300">
                                                    {type}
                                                </span>
                                            </div>
                                        )}
                                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/65 to-transparent px-4 pt-10 pb-4">
                                            {a.tags && a.tags.length > 0 && (
                                                <p className="text-white/50 text-[7px] uppercase tracking-[0.35em] font-bold mb-1.5">
                                                    {a.tags[0]}
                                                </p>
                                            )}
                                            <h2 className="text-white text-[11px] font-light leading-snug">
                                                {a.title || "—"}
                                            </h2>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* View toggle — bottom right, matches explore/grid style */}
            <div className="fixed bottom-4 right-4 z-40 flex items-center bg-white/50 backdrop-blur-xl border border-stone-200 rounded-md overflow-hidden h-[34px]">
                <button
                    onClick={() => setView("list")}
                    aria-label="List view"
                    className={`px-3 h-full flex items-center transition-colors duration-200 ${view === "list" ? "bg-stone-900/80 backdrop-blur-md text-white" : "text-stone-400 hover:text-stone-900"}`}
                >
                    <LayoutList size={13} />
                </button>
                <div className="w-px h-4 bg-stone-200" />
                <button
                    onClick={() => setView("grid")}
                    aria-label="Grid view"
                    className={`px-3 h-full flex items-center transition-colors duration-200 ${view === "grid" ? "bg-stone-900/80 backdrop-blur-md text-white" : "text-stone-400 hover:text-stone-900"}`}
                >
                    <LayoutGrid size={13} />
                </button>
            </div>
        </main>
    );
}
