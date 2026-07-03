"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Pin, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// Floating search bar — aligned above the scale dock at bottom-6.
// URL-driven: reads q + pin[] params, writes back directly.

export function SearchBar({
    allSuggestions = [],
    collapseToken = 0,
    expandToken = 0,
}: {
    allSuggestions?: string[];
    collapseToken?: number;
    expandToken?: number;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const searchParamsRef = useRef(searchParams);
    searchParamsRef.current = searchParams;

    const text = searchParams.get("q") ?? "";
    const pinnedTerms = searchParams.getAll("pin");

    const [open, setOpen] = useState(true);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const mountedCollapse = useRef(collapseToken);
    const mountedExpand = useRef(expandToken);
    useEffect(() => { if (collapseToken > mountedCollapse.current) setOpen(false); }, [collapseToken]);
    useEffect(() => { if (expandToken > mountedExpand.current) setOpen(true); }, [expandToken]);

    const suggestions = useMemo(() => {
        const q = text.trim().toLowerCase();
        if (q.length < 2) return [];
        return allSuggestions
            .filter(s => s.toLowerCase().includes(q) && !pinnedTerms.some(p => p.toLowerCase() === s.toLowerCase()))
            .slice(0, 6);
    }, [text, allSuggestions, pinnedTerms]);

    const updateSearch = useCallback((q: string, pins: string[]) => {
        const params = new URLSearchParams(searchParamsRef.current.toString());
        if (q) params.set("q", q); else params.delete("q");
        params.delete("pin");
        for (const p of pins) params.append("pin", p);
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, [router, pathname]);

    const pin = useCallback(() => {
        const t = text.trim();
        if (!t) return;
        const next = pinnedTerms.some(p => p.toLowerCase() === t.toLowerCase())
            ? pinnedTerms
            : [...pinnedTerms, t];
        updateSearch("", next);
        setShowSuggestions(false);
        inputRef.current?.focus();
    }, [text, pinnedTerms, updateSearch]);

    const unpin = (term: string) => updateSearch(text, pinnedTerms.filter(p => p !== term));

    const selectSuggestion = (s: string) => {
        updateSearch(s, pinnedTerms);
        setShowSuggestions(false);
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && text.trim()) { e.preventDefault(); pin(); }
        else if (e.key === "Escape") { updateSearch("", pinnedTerms); inputRef.current?.blur(); }
    };

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setShowSuggestions(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    if (!open) {
        return (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40">
                <button
                    onClick={() => setOpen(true)}
                    aria-label="Open search"
                    className="flex items-center gap-2 px-4 py-2 bg-white/50 backdrop-blur-xl border border-stone-200 rounded-xl text-stone-400 hover:text-stone-900 transition-colors text-[9px] uppercase tracking-[0.3em] font-bold"
                >
                    <Search size={12} />
                    {pinnedTerms.length > 0 && <span className="text-stone-500">{pinnedTerms.length} pinned</span>}
                    <ChevronDown size={12} />
                </button>
            </div>
        );
    }

    return (
        <div ref={wrapperRef} className="fixed top-4 left-1/2 -translate-x-1/2 z-40 w-[min(calc(100vw-400px),560px)]">
            {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
            <div className="bg-white/50 backdrop-blur-xl border border-stone-200 rounded-xl px-6 py-3 shadow-sm cursor-text" onClick={() => inputRef.current?.focus()}>
                <div className="flex items-center gap-2 flex-wrap">
                    {pinnedTerms.map(term => (
                        <span key={term} className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-900 text-white text-[9px] font-bold uppercase tracking-[0.2em] rounded-md flex-shrink-0">
                            {term}
                            <button onClick={() => unpin(term)} className="hover:text-stone-300 transition-colors"><X size={9} /></button>
                        </span>
                    ))}
                    {pinnedTerms.length > 0 && <div className="w-px h-4 bg-stone-200 self-center flex-shrink-0" />}

                    <Search size={12} className="text-stone-500 flex-shrink-0" />

                    <input
                        ref={inputRef}
                        value={text}
                        onChange={e => { updateSearch(e.target.value, pinnedTerms); setShowSuggestions(true); }}
                        onFocus={() => text.length >= 2 && setShowSuggestions(true)}
                        onKeyDown={handleKeyDown}
                        placeholder={pinnedTerms.length > 0 ? "Add filter…" : "Search collection"}
                        autoComplete="off"
                        spellCheck={false}
                        className="flex-1 min-w-[60px] text-[10px] tracking-[0.15em] font-bold text-stone-800 placeholder:text-stone-500 placeholder:font-normal placeholder:tracking-[0.1em] bg-transparent outline-none"
                    />

                    {text.trim() && (
                        <button onClick={pin} title="Pin (Enter)" className="text-stone-400 hover:text-stone-900 transition-colors flex-shrink-0"><Pin size={12} /></button>
                    )}
                    {text && (
                        <button onClick={() => updateSearch("", pinnedTerms)} className="text-stone-400 hover:text-stone-900 transition-colors flex-shrink-0"><X size={12} /></button>
                    )}
                    <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-800 transition-colors flex-shrink-0 ml-1"><ChevronUp size={13} /></button>
                </div>
            </div>

            {showSuggestions && suggestions.length > 0 && (
                <div className="mt-1.5 bg-white/55 backdrop-blur-xl border border-stone-200 rounded-xl overflow-hidden shadow-sm">
                    {suggestions.map(s => (
                        <button key={s} onMouseDown={e => { e.preventDefault(); selectSuggestion(s); }}
                            className="w-full text-left px-5 py-2.5 text-[10px] text-stone-600 hover:bg-stone-50 transition-colors flex items-center gap-3 border-b border-stone-100 last:border-b-0">
                            <Search size={10} className="text-stone-300 flex-shrink-0" />
                            <span className="truncate">{s}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
