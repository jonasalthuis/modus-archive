"use client";

import React from "react";

// Horizontal selectable scale axis. Scales arrive pre-sorted (1:20 … 1:1000).
// Multi-select toggles; "All" clears the selection.

export function ScaleBar({
    scales,
    selected,
    onChange,
}: {
    scales: string[];
    selected: string[];
    onChange: (next: string[]) => void;
}) {
    if (scales.length === 0) return null;

    const toggle = (s: string) => {
        onChange(selected.includes(s) ? selected.filter((x) => x !== s) : [...selected, s]);
    };

    const chip =
        "px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-[0.15em] font-mono border transition-colors duration-200";

    return (
        <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-stone-300 shrink-0">
                Scale
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
                <button
                    onClick={() => onChange([])}
                    className={`${chip} ${
                        selected.length === 0
                            ? "bg-stone-900 text-white border-stone-900"
                            : "border-stone-200 text-stone-400 hover:border-stone-900 hover:text-stone-900"
                    }`}
                >
                    All
                </button>
                {scales.map((s) => {
                    const active = selected.includes(s);
                    return (
                        <button
                            key={s}
                            onClick={() => toggle(s)}
                            className={`${chip} ${
                                active
                                    ? "bg-stone-900 text-white border-stone-900"
                                    : "border-stone-200 text-stone-500 hover:border-stone-900 hover:text-stone-900"
                            }`}
                        >
                            {s}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
