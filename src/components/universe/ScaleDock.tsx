"use client";

import React from "react";

// Bottom-docked scale filter: a wide, labelled track with a draggable dot,
// attached to the bottom-centre of the screen. Position 0 = "All".

export function ScaleDock({
    scales,
    selected,
    onChange,
}: {
    scales: string[];
    selected: string[];
    onChange: (next: string[]) => void;
}) {
    if (scales.length === 0) return null;

    const stops = ["All", ...scales];
    const max = stops.length - 1;
    const current = selected.length ? Math.max(0, stops.indexOf(selected[0])) : 0;
    const setIndex = (i: number) => onChange(i === 0 ? [] : [stops[i]]);

    const pct = max === 0 ? 0 : (current / max) * 100;
    const label = current === 0 ? "All scales" : stops[current];

    return (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-40 w-[min(94vw,680px)]">
            <div className="bg-white/95 backdrop-blur border border-stone-200 border-b-0 rounded-t-xl px-8 pt-4 pb-6 shadow-[0_-6px_24px_rgba(0,0,0,0.05)]">
                <div className="flex items-baseline justify-between mb-4">
                    <span className="text-[9px] uppercase tracking-[0.45em] font-bold text-stone-500">
                        Filter by scale
                    </span>
                    <div className="flex items-baseline gap-3">
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

                    {/* draggable input (transparent) — drives the dot, click-to-jump */}
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
