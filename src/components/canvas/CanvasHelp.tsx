"use client";

import React, { useEffect, useRef, useState } from "react";
import { HelpCircle } from "lucide-react";

type Row = [string, string];

const TRACKPAD_ROWS: Row[] = [
    ["Drag (canvas)", "Pan"],
    ["Drag (card)", "Move card"],
    ["Pinch", "Zoom"],
    ["Two-finger scroll", "Pan"],
    ["Click card", "Bring to front"],
];

const MOUSE_ROWS: Row[] = [
    ["Drag (canvas)", "Pan"],
    ["Drag (card)", "Move card"],
    ["Scroll", "Zoom"],
    ["Click card", "Bring to front"],
];

function Section({ title, data }: { title: string; data: Row[] }) {
    return (
        <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-[0.4em] font-bold text-stone-500 mb-2.5">
                {title}
            </p>
            <dl className="space-y-2">
                {data.map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[1fr_auto] gap-x-4 items-start">
                        <dt className="text-[11px] text-stone-500 leading-snug">{k}</dt>
                        <dd className="text-[9px] uppercase tracking-[0.2em] font-bold text-stone-900 whitespace-nowrap text-right">
                            {v}
                        </dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}

export function CanvasHelp() {
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
        <div ref={ref} className="fixed bottom-4 left-4 z-40">
            <div
                className={`absolute bottom-full mb-2 left-0 origin-bottom-left transition-all duration-200 ${
                    open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                }`}
            >
                <div className="bg-white/50 backdrop-blur-xl border border-stone-200 rounded-lg p-4 grid grid-cols-2 gap-6 shadow-sm w-[320px]">
                    <Section title="Trackpad" data={TRACKPAD_ROWS} />
                    <Section title="Mouse" data={MOUSE_ROWS} />
                </div>
            </div>

            <button
                onClick={() => setOpen((v) => !v)}
                aria-label="Controls help"
                className={`flex items-center justify-center w-[34px] h-[34px] rounded-md border transition-colors ${
                    open
                        ? "bg-stone-900 text-white border-stone-900"
                        : "bg-white/70 backdrop-blur-xl text-stone-400 border-stone-200 hover:text-stone-900 hover:border-stone-900"
                }`}
            >
                <HelpCircle size={15} />
            </button>
        </div>
    );
}
