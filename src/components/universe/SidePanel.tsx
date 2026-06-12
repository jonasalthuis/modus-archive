"use client";

import React, { useState } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";

// Vertically-centred collapsible side panel. Supports both sides.
// Right (default): content on left, handle on right edge.
// Left: handle on left edge, content to the right of it.

export function SidePanel({
    children,
    side = "right",
}: {
    children: React.ReactNode;
    side?: "left" | "right";
}) {
    const [open, setOpen] = useState(true);
    const isLeft = side === "left";

    return (
        <div
            className={`fixed ${isLeft ? "left-0" : "right-0"} top-1/2 -translate-y-1/2 z-40 flex items-center gap-1.5`}
        >
            {/* Left handle — only rendered for left panels */}
            {isLeft && (
                <button
                    onClick={() => setOpen((o) => !o)}
                    aria-label={open ? "Collapse panel" : "Expand panel"}
                    className="flex items-center justify-center w-6 h-14 bg-white/90 backdrop-blur border border-stone-200 border-l-0 rounded-r-md text-stone-400 hover:text-stone-900 transition-colors shrink-0"
                >
                    {open ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                </button>
            )}

            <div
                className={`transition-all duration-300 ease-out ${
                    open
                        ? "opacity-100 translate-x-0"
                        : isLeft
                          ? "opacity-0 -translate-x-[calc(100%+1.5rem)] pointer-events-none"
                          : "opacity-0 translate-x-[calc(100%+1.5rem)] pointer-events-none"
                }`}
            >
                {children}
            </div>

            {/* Right handle — only rendered for right panels */}
            {!isLeft && (
                <button
                    onClick={() => setOpen((o) => !o)}
                    aria-label={open ? "Collapse panel" : "Expand panel"}
                    className="flex items-center justify-center w-6 h-14 bg-white/90 backdrop-blur border border-stone-200 border-r-0 rounded-l-md text-stone-400 hover:text-stone-900 transition-colors shrink-0"
                >
                    {open ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
            )}
        </div>
    );
}
