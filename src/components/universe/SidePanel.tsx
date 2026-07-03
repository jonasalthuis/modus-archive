"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";

// Vertically-centred collapsible side panel.
// When open: external tab invisible; small arrow inside the panel collapses it.
// When closed: external tab appears at the viewport edge to reopen.

export function SidePanel({
    children,
    side = "right",
    defaultOpen = true,
    collapseToken = 0,
    expandToken = 0,
    icon,
}: {
    children: React.ReactNode;
    side?: "left" | "right";
    defaultOpen?: boolean;
    collapseToken?: number;
    expandToken?: number;
    icon?: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);
    const isLeft = side === "left";

    const mountedCollapse = useRef(collapseToken);
    const mountedExpand = useRef(expandToken);

    useEffect(() => {
        if (collapseToken > mountedCollapse.current) setOpen(false);
    }, [collapseToken]);

    useEffect(() => {
        if (expandToken > mountedExpand.current) setOpen(true);
    }, [expandToken]);

    return (
        <div
            className={`fixed ${isLeft ? "left-4" : "right-4"} top-1/2 -translate-y-1/2 z-40 flex items-center gap-1.5`}
        >
            {/* Left-side tab — visible only when left panel is CLOSED */}
            {isLeft && (
                <button
                    onClick={() => setOpen(true)}
                    aria-label="Expand panel"
                    className={`flex-shrink-0 flex flex-col items-center justify-center gap-2 bg-white/50 backdrop-blur-xl border border-stone-200 rounded-md text-stone-400 hover:text-stone-900 transition-all duration-300 overflow-hidden ${
                        open ? "w-0 h-14 opacity-0 pointer-events-none" : icon ? "w-6 h-auto py-3 opacity-100" : "w-6 h-14 opacity-100"
                    }`}
                >
                    {icon && <span className="text-stone-400">{icon}</span>}
                    <ChevronRight size={10} />
                </button>
            )}

            {/* Panel content wrapper — slides in/out */}
            <div
                className={`relative transition-all duration-300 ease-out ${
                    open
                        ? "opacity-100 translate-x-0"
                        : isLeft
                          ? "opacity-0 -translate-x-[calc(100%+1.5rem)] pointer-events-none"
                          : "opacity-0 translate-x-[calc(100%+1.5rem)] pointer-events-none"
                }`}
            >
                {children}
                {/* Internal collapse arrow — no border/fill, darker so it's visible */}
                <button
                    onClick={() => setOpen(false)}
                    aria-label="Collapse panel"
                    className={`absolute top-2.5 ${isLeft ? "left-2.5" : "right-2.5"} z-10 p-1 text-stone-400 hover:text-stone-800 transition-colors leading-none`}
                >
                    {isLeft ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
                </button>
            </div>

            {/* Right-side tab — visible only when right panel is CLOSED */}
            {!isLeft && (
                <button
                    onClick={() => setOpen(true)}
                    aria-label="Expand panel"
                    className={`flex-shrink-0 flex flex-col items-center justify-center gap-2 bg-white/50 backdrop-blur-xl border border-stone-200 rounded-md text-stone-400 hover:text-stone-900 transition-all duration-300 overflow-hidden ${
                        open ? "w-0 h-14 opacity-0 pointer-events-none" : icon ? "w-6 h-auto py-3 opacity-100" : "w-6 h-14 opacity-100"
                    }`}
                >
                    {icon && <span className="text-stone-400">{icon}</span>}
                    <ChevronLeft size={10} />
                </button>
            )}
        </div>
    );
}
