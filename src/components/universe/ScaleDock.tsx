"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

// Bottom-docked scale filter. Collapses to a small tab at the bottom edge.

export function ScaleDock({
    scales,
    selected,
    onChange,
    collapseToken = 0,
    expandToken = 0,
}: {
    scales: string[];
    selected: string[];
    onChange: (next: string[]) => void;
    collapseToken?: number;
    expandToken?: number;
}) {
    const [open, setOpen] = useState(true);

    const mountedCollapse = useRef(collapseToken);
    const mountedExpand = useRef(expandToken);

    useEffect(() => {
        if (collapseToken > mountedCollapse.current) setOpen(false);
    }, [collapseToken]);

    useEffect(() => {
        if (expandToken > mountedExpand.current) setOpen(true);
    }, [expandToken]);

    if (scales.length === 0) return null;

    const stops = ["All", ...scales];
    const max = stops.length - 1;
    const current = selected.length ? Math.max(0, stops.indexOf(selected[0])) : 0;
    const setIndex = (i: number) => onChange(i === 0 ? [] : [stops[i]]);
    const pct = max === 0 ? 0 : (current / max) * 100;
    const label = current === 0 ? "All scales" : stops[current];

    if (!open) {
        return (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
                <button
                    onClick={() => setOpen(true)}
                    aria-label="Open scale filter"
                    className="flex items-center gap-2 px-4 py-2 bg-white/50 backdrop-blur-xl border border-stone-200 rounded-xl text-stone-400 hover:text-stone-900 transition-colors shadow-sm text-[9px] uppercase tracking-[0.3em] font-bold"
                >
                    Scale
                    <ChevronUp size={12} />
                </button>
            </div>
        );
    }

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(94vw,680px)]">
            <div className="bg-white/50 backdrop-blur-xl border border-stone-200 rounded-xl px-8 pt-4 pb-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[9px] uppercase tracking-[0.45em] font-bold text-stone-500">
                        Filter by scale
                    </span>
                    <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-stone-900 tabular-nums">{label}</span>
                        {current !== 0 && (
                            <button
                                onClick={() => onChange([])}
                                aria-label="Reset scale filter"
                                className="text-[9px] uppercase tracking-[0.3em] font-bold text-stone-400 hover:text-stone-900 transition-colors"
                            >
                                All
                            </button>
                        )}
                        <button
                            onClick={() => setOpen(false)}
                            aria-label="Collapse scale filter"
                            className="text-stone-400 hover:text-stone-800 transition-colors"
                        >
                            <ChevronDown size={13} />
                        </button>
                    </div>
                </div>

                <div className="relative h-10">
                    {/* track */}
                    <div className="absolute left-0 right-0 top-1.5 h-px bg-stone-200" />
                    <div
                        className="absolute left-0 top-1.5 h-px bg-stone-900"
                        style={{ width: `${pct}%` }}
                    />

                    {/* ticks + labels */}
                    {stops.map((s, i) => {
                        const active = i === current;
                        const passed = i <= current;
                        return (
                            <div
                                key={s}
                                className="absolute top-0 flex flex-col items-center -translate-x-1/2 pointer-events-none"
                                style={{ left: `calc(${(i / max) * 100}% + ${(7 - (i / max) * 14).toFixed(1)}px)` }}
                            >
                                <span
                                    className={`w-px ${active ? "h-3 bg-stone-900" : "h-2 bg-stone-300"} ${passed && !active ? "bg-stone-400" : ""}`}
                                />
                                <span
                                    className={`mt-2 font-mono text-[8px] tracking-tight whitespace-nowrap ${
                                        active ? "text-stone-900 font-bold" : "text-stone-400"
                                    }`}
                                >
                                    {s === "All" ? "ALL" : s}
                                </span>
                            </div>
                        );
                    })}

                    {/* draggable input (transparent) */}
                    <input
                        type="range"
                        min={0}
                        max={max}
                        step={1}
                        value={current}
                        onChange={(e) => setIndex(Number(e.target.value))}
                        aria-label="Filter by scale"
                        className="scale-dock absolute left-0 top-0 w-full appearance-none bg-transparent cursor-pointer"
                    />
                </div>
            </div>

            <style jsx>{`
                .scale-dock {
                    height: 16px;
                }
                .scale-dock::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 14px;
                    height: 14px;
                    border-radius: 9999px;
                    background: #1c1917;
                    border: 2px solid #ffffff;
                    box-shadow: 0 0 0 1px #1c1917;
                    cursor: grab;
                }
                .scale-dock:active::-webkit-slider-thumb {
                    cursor: grabbing;
                }
                .scale-dock::-moz-range-thumb {
                    width: 14px;
                    height: 14px;
                    border-radius: 9999px;
                    background: #1c1917;
                    border: 2px solid #ffffff;
                    box-shadow: 0 0 0 1px #1c1917;
                    cursor: grab;
                }
                .scale-dock::-webkit-slider-runnable-track,
                .scale-dock::-moz-range-track {
                    background: transparent;
                }
            `}</style>
        </div>
    );
}
