"use client";

import React, { useEffect, useRef, useState } from "react";
import { HelpCircle } from "lucide-react";
import type { ViewMode } from "./types";

type Row = [string, string];

function rows(mode: ViewMode, device: "trackpad" | "mouse"): Row[] {
    const drag: Row = mode === "grid" ? ["Drag", "Pan"] : ["Drag", "Orbit"];
    if (device === "trackpad") {
        return mode === "grid"
            ? [drag, ["Two-finger scroll", "Pan"], ["Pinch", "Zoom"], ["Click", "Open model"]]
            : [
                  drag,
                  ["Two-finger scroll", "Pan"],
                  ["Pinch", "Zoom"],
                  ["Shift + drag", "Pan"],
                  ["Click", "Open model"],
              ];
    }
    return mode === "grid"
        ? [drag, ["Scroll", "Zoom"], ["Click", "Open model"]]
        : [drag, ["Shift + drag", "Pan"], ["Scroll", "Zoom"], ["Click", "Open model"]];
}

function Section({ title, data }: { title: string; data: Row[] }) {
    return (
        <div>
            <p className="text-[9px] uppercase tracking-[0.4em] font-bold text-stone-500 mb-2.5">
                {title}
            </p>
            <dl className="space-y-1.5">
                {data.map(([k, v]) => (
                    <div key={k} className="flex items-baseline justify-between gap-6">
                        <dt className="text-[11px] text-stone-500">{k}</dt>
                        <dd className="text-[9px] uppercase tracking-[0.2em] font-bold text-stone-900">
                            {v}
                        </dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}

export function ControlsHelp({ mode }: { mode: ViewMode }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function onClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, []);

    return (
        <div ref={ref} className="fixed bottom-6 left-6 z-40">
            {/* popover */}
            <div
                className={`absolute bottom-full mb-2 left-0 w-64 origin-bottom-left transition-all duration-200 ${
                    open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                }`}
            >
                <div className="bg-white/95 backdrop-blur border border-stone-200 rounded-lg p-4 grid grid-cols-2 gap-5 shadow-sm">
                    <Section title="Trackpad" data={rows(mode, "trackpad")} />
                    <Section title="Mouse" data={rows(mode, "mouse")} />
                </div>
            </div>

            <button
                onClick={() => setOpen((v) => !v)}
                aria-label="Controls help"
                className={`flex items-center justify-center w-[34px] h-[34px] rounded-md border transition-colors ${
                    open
                        ? "bg-stone-900 text-white border-stone-900"
                        : "bg-white text-stone-400 border-stone-200 hover:text-stone-900 hover:border-stone-900"
                }`}
            >
                <HelpCircle size={15} />
            </button>
        </div>
    );
}
