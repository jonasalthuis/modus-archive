"use client";

import React, { useRef, useState, useMemo } from "react";
import { Search, X, Pin } from "lucide-react";

interface Props {
    search: string;
    onSearch: (v: string) => void;
    pins: string[];
    onPin: (v: string) => void;
    onUnpin: (v: string) => void;
    suggestions?: string[];
    placeholder?: string;
}

export function SearchPinBar({ search, onSearch, pins, onPin, onUnpin, suggestions = [], placeholder = "Search…" }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [showSug, setShowSug] = useState(false);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (q.length < 1) return [];
        return suggestions
            .filter((s) => s.toLowerCase().includes(q) && !pins.some((p) => p.toLowerCase() === s.toLowerCase()))
            .slice(0, 8);
    }, [search, suggestions, pins]);

    const doPin = () => {
        const t = search.trim();
        if (!t || pins.some((p) => p.toLowerCase() === t.toLowerCase())) return;
        onPin(t);
        onSearch("");
        setShowSug(false);
        inputRef.current?.focus();
    };

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") { e.preventDefault(); doPin(); }
        else if (e.key === "Escape") { onSearch(""); inputRef.current?.blur(); }
    };

    // Close suggestions on outside click
    React.useEffect(() => {
        const h = (e: MouseEvent) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setShowSug(false); };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    return (
        <div ref={wrapperRef} className="relative">
            {/* Input row */}
            <div
                className="flex items-center gap-2 h-[38px] bg-white border border-gray-200 rounded-md px-3 cursor-text hover:border-gray-400 focus-within:border-gray-900 transition-colors"
                onClick={() => inputRef.current?.focus()}
            >
                {pins.map((p) => (
                    <span key={p} className="inline-flex items-center gap-1 px-2 h-5 bg-gray-900 text-white text-[8px] font-bold uppercase tracking-[0.2em] rounded flex-shrink-0">
                        {p}
                        <button onMouseDown={(e) => { e.preventDefault(); onUnpin(p); }} className="hover:text-gray-300 transition-colors"><X size={8} /></button>
                    </span>
                ))}
                {pins.length > 0 && <div className="w-px h-4 bg-gray-200 flex-shrink-0" />}
                <Search size={12} className="text-gray-400 flex-shrink-0" />
                <input
                    ref={inputRef}
                    value={search}
                    onChange={(e) => { onSearch(e.target.value); setShowSug(true); }}
                    onFocus={() => search.length >= 1 && setShowSug(true)}
                    onKeyDown={handleKey}
                    placeholder={pins.length > 0 ? "Add filter…" : placeholder}
                    autoComplete="off"
                    spellCheck={false}
                    className="flex-1 min-w-[80px] text-[10px] tracking-[0.15em] font-bold text-gray-800 placeholder:text-gray-400 placeholder:font-normal placeholder:tracking-[0.1em] bg-transparent outline-none"
                />
                {search.trim() && (
                    <button onMouseDown={(e) => { e.preventDefault(); doPin(); }} title="Pin (Enter)" className="text-gray-400 hover:text-gray-900 transition-colors flex-shrink-0">
                        <Pin size={12} />
                    </button>
                )}
                {search && (
                    <button onClick={() => { onSearch(""); setShowSug(false); }} className="text-gray-400 hover:text-gray-900 transition-colors flex-shrink-0">
                        <X size={12} />
                    </button>
                )}
            </div>

            {/* Suggestions dropdown */}
            {showSug && filtered.length > 0 && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-md overflow-hidden shadow-md z-50">
                    {filtered.map((s) => (
                        <button
                            key={s}
                            onMouseDown={(e) => { e.preventDefault(); onPin(s); onSearch(""); setShowSug(false); inputRef.current?.focus(); }}
                            className="w-full text-left px-4 py-2.5 text-[10px] tracking-[0.1em] font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors flex items-center gap-3 border-b border-gray-100 last:border-b-0"
                        >
                            <Pin size={9} className="text-gray-300 flex-shrink-0" />
                            <span className="truncate">{s}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
