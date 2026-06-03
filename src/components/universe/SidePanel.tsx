"use client";

import React, { useState } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";

// Right-side control panel: vertically centred, collapsible. The handle stays
// pinned to the right edge; the panel slides off to the right when collapsed.

export function SidePanel({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(true);

    return (
        <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center">
            <div
                className={`transition-all duration-300 ease-out ${
                    open
                        ? "opacity-100 translate-x-0"
                        : "opacity-0 translate-x-full pointer-events-none"
                }`}
            >
                {children}
            </div>

            <button
                onClick={() => setOpen((o) => !o)}
                aria-label={open ? "Collapse panel" : "Expand panel"}
                className="flex items-center justify-center w-6 h-14 bg-white/90 backdrop-blur border border-stone-200 border-r-0 rounded-l-md text-stone-400 hover:text-stone-900 transition-colors shrink-0"
            >
                {open ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
        </div>
    );
}
