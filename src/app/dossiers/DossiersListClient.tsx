"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, X, ChevronDown, ChevronUp, LayoutList, LayoutGrid, Shuffle, ArrowUpDown } from "lucide-react";

export interface Dossier {
    id: string;
    slug?: string;
    title?: string;
    intro?: string;
    coverImage?: string;
    tags?: string[];
    items?: unknown[];
}

type ViewMode = "list" | "grid";

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

type SortKey = "default" | "title" | "items";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: "default", label: "Default" },
    { key: "title",   label: "Title A–Z" },
    { key: "items",   label: "Most items" },
];

export function DossiersListClient({ dossiers }: { dossiers: Dossier[] }) {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [searchOpen, setSearchOpen] = useState(true);
    const [view, setView] = useState<ViewMode>("list");
    const [sort, setSort] = useState<SortKey>("default");
    const [sortOpen, setSortOpen] = useState(false);

    const handleRandom = useCallback(() => {
        if (dossiers.length === 0) return;
        const pick = dossiers[Math.floor(Math.random() * dossiers.length)];
        router.push(`/dossiers/${pick.slug || pick.id}`);
    }, [dossiers, router]);

    const filtered = useMemo(() => {
        let list = dossiers;
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(
                (d) =>
                    (d.title || "").toLowerCase().includes(q) ||
                    (d.intro || "").toLowerCase().includes(q) ||
                    (d.tags || []).some((t) => t.toLowerCase().includes(q)),
            );
        }
        if (sort === "title") list = [...list].sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
        if (sort === "items") list = [...list].sort((a, b) => (Array.isArray(b.items) ? b.items.length : 0) - (Array.isArray(a.items) ? a.items.length : 0));
        return list;
    }, [dossiers, search, sort]);

    return (
        <main className="min-h-screen bg-white text-stone-900">
            <FloatingSearch
                value={search}
                onChange={setSearch}
                open={searchOpen}
                onToggle={() => setSearchOpen((v) => !v)}
                placeholder="Search dossiers"
            />

            <div className="pt-[58px]">
                {filtered.length === 0 ? (
                    <div className="flex items-center justify-center h-64">
                        <p className="text-[10px] uppercase tracking-[0.5em] font-bold text-stone-300">
                            {search ? "No results" : "No dossiers published yet"}
                        </p>
                    </div>
                ) : view === "list" ? (
                    <div className="max-w-7xl mx-auto px-8 py-6 space-y-3">
                        {filtered.map((d, i) => {
                            const href = `/dossiers/${d.slug || d.id}`;
                            const itemCount = Array.isArray(d.items) ? d.items.length : 0;
                            return (
                                <Link
                                    key={d.id}
                                    href={href}
                                    className="group grid grid-cols-[2.5rem_1fr_auto] md:grid-cols-[2.5rem_1fr_280px_auto] items-center gap-6 px-6 py-6 rounded-xl border border-stone-100 hover:border-stone-300 bg-white hover:bg-stone-50 transition-all duration-300"
                                >
                                    <span className="font-mono text-xs text-stone-400 tabular-nums">
                                        {String(i + 1).padStart(2, "0")}
                                    </span>
                                    <div className="min-w-0 space-y-2">
                                        {d.tags && d.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {d.tags.slice(0, 3).map((t) => (
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
                                            {d.title || "—"}
                                        </h2>
                                        {d.intro && (
                                            <p className="text-sm font-light text-stone-600 leading-relaxed max-w-lg line-clamp-1">
                                                {d.intro}
                                            </p>
                                        )}
                                    </div>
                                    <div className="hidden md:block">
                                        {d.coverImage ? (
                                            <div className="relative h-16 w-full rounded-md bg-stone-50 overflow-hidden">
                                                <Image
                                                    src={d.coverImage}
                                                    alt={d.title ?? ""}
                                                    fill
                                                    className="object-cover group-hover:scale-[1.04] transition-transform duration-500"
                                                    sizes="280px"
                                                />
                                            </div>
                                        ) : (
                                            <div className="h-16 w-full rounded-md bg-stone-50 border border-stone-100" />
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        {itemCount > 0 && (
                                            <span className="font-mono text-[8px] text-stone-300 whitespace-nowrap">
                                                {itemCount} item{itemCount !== 1 ? "s" : ""}
                                            </span>
                                        )}
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
                            {filtered.map((d) => {
                                const href = `/dossiers/${d.slug || d.id}`;
                                return (
                                    <Link
                                        key={d.id}
                                        href={href}
                                        className="group block rounded-xl overflow-hidden border border-stone-100 hover:border-stone-300 transition-all duration-300 relative aspect-[3/4] bg-stone-100"
                                    >
                                        {d.coverImage ? (
                                            <Image
                                                src={d.coverImage}
                                                alt={d.title ?? ""}
                                                fill
                                                className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
                                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-stone-50" />
                                        )}
                                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/65 to-transparent px-4 pt-10 pb-4">
                                            {d.tags && d.tags.length > 0 && (
                                                <p className="text-white/50 text-[7px] uppercase tracking-[0.35em] font-bold mb-1.5">
                                                    {d.tags[0]}
                                                </p>
                                            )}
                                            <h2 className="text-white text-[11px] font-light leading-snug">
                                                {d.title || "—"}
                                            </h2>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom-right controls */}
            <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2">
                {/* Sort picker */}
                <div className="relative">
                    <button
                        onClick={() => setSortOpen((v) => !v)}
                        className={`flex items-center gap-1.5 px-3 h-[34px] text-[9px] uppercase tracking-[0.25em] font-bold rounded-md border transition-colors duration-200 bg-white/70 backdrop-blur-xl ${sort !== "default" ? "border-stone-900 text-stone-900" : "border-stone-200 text-stone-500 hover:text-stone-900"}`}
                    >
                        <ArrowUpDown size={12} />
                        {SORT_OPTIONS.find((o) => o.key === sort)?.label}
                    </button>
                    {sortOpen && (
                        <div className="absolute bottom-full mb-1 right-0 w-40 bg-white/80 backdrop-blur-xl border border-stone-200 rounded-md overflow-hidden shadow-sm">
                            {SORT_OPTIONS.map((o) => (
                                <button
                                    key={o.key}
                                    onClick={() => { setSort(o.key); setSortOpen(false); }}
                                    className={`w-full text-left px-4 py-2.5 text-[9px] uppercase tracking-[0.25em] font-bold transition-colors ${sort === o.key ? "bg-stone-900 text-white" : "text-stone-500 hover:bg-stone-50 hover:text-stone-900"}`}
                                >
                                    {o.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Random */}
                <button
                    onClick={handleRandom}
                    aria-label="Random dossier"
                    className="flex items-center justify-center w-[34px] h-[34px] bg-white/70 backdrop-blur-xl border border-stone-200 rounded-md text-stone-500 hover:text-stone-900 hover:border-stone-900 transition-colors"
                >
                    <Shuffle size={13} />
                </button>

                {/* View toggle */}
                <div className="flex items-center bg-white/70 backdrop-blur-xl border border-stone-200 rounded-md overflow-hidden h-[34px]">
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
            </div>
        </main>
    );
}
