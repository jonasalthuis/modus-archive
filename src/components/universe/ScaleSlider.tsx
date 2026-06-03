"use client";

import React from "react";

// A draggable dot on a bar that scrubs through scale stops. Position 0 = "All";
// each subsequent stop is a discrete scale (sorted small→large). Selecting a
// stop filters the collection to that single scale.

export function ScaleSlider({
    scales,
    selected,
    onChange,
}: {
    scales: string[];
    selected: string[];
    onChange: (next: string[]) => void;
}) {
    if (scales.length === 0) return null;

    const stops = ["All", ...scales]; // index 0 = All
    const max = stops.length - 1;
    const current = selected.length ? Math.max(0, stops.indexOf(selected[0])) : 0;

    const setIndex = (i: number) => {
        onChange(i === 0 ? [] : [stops[i]]);
    };

    const label = current === 0 ? "All scales" : stops[current];
    const pct = max === 0 ? 0 : (current / max) * 100;

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-stone-300">
                    Scale
                </span>
                <span className="font-mono text-[10px] text-stone-700 tabular-nums">{label}</span>
            </div>

            <div className="relative">
                {/* track */}
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-stone-200" />
                {/* filled portion up to the dot */}
                <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-px bg-stone-900"
                    style={{ width: `${pct}%` }}
                />
                {/* tick marks */}
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none">
                    {stops.map((s, i) => (
                        <span
                            key={s}
                            className={`w-px h-1.5 ${i <= current ? "bg-stone-400" : "bg-stone-200"}`}
                        />
                    ))}
                </div>
                {/* the actual range input (transparent, drives the dot) */}
                <input
                    type="range"
                    min={0}
                    max={max}
                    step={1}
                    value={current}
                    onChange={(e) => setIndex(Number(e.target.value))}
                    aria-label="Scale"
                    className="scale-slider relative w-full appearance-none bg-transparent cursor-pointer"
                />
            </div>

            <style jsx>{`
                .scale-slider {
                    height: 18px;
                }
                .scale-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 11px;
                    height: 11px;
                    border-radius: 9999px;
                    background: #1c1917;
                    border: 2px solid #ffffff;
                    box-shadow: 0 0 0 1px #1c1917;
                    cursor: grab;
                }
                .scale-slider:active::-webkit-slider-thumb {
                    cursor: grabbing;
                }
                .scale-slider::-moz-range-thumb {
                    width: 11px;
                    height: 11px;
                    border-radius: 9999px;
                    background: #1c1917;
                    border: 2px solid #ffffff;
                    box-shadow: 0 0 0 1px #1c1917;
                    cursor: grab;
                }
                .scale-slider::-webkit-slider-runnable-track {
                    background: transparent;
                }
                .scale-slider::-moz-range-track {
                    background: transparent;
                }
            `}</style>
        </div>
    );
}
