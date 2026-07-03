"use client";

import React from "react";
import { ArrowUpDown } from "lucide-react";
import { SidePanel } from "./SidePanel";
import { SORT_ATTRS } from "./layouts";
import type { SortAttr } from "./layouts";

export function SortControls({
    sort,
    onChange,
    collapseToken = 0,
    expandToken = 0,
}: {
    sort: SortAttr;
    onChange: (s: SortAttr) => void;
    collapseToken?: number;
    expandToken?: number;
}) {
    return (
        <SidePanel side="left" collapseToken={collapseToken} expandToken={expandToken} icon={<ArrowUpDown size={12} />}>
            <div className="w-44 bg-white/50 backdrop-blur-xl border border-stone-200 rounded-lg p-3 shadow-sm">
                {/* pl-6 clears the internal collapse arrow that sits at left-2.5 */}
                <div className="flex items-center gap-2 mb-2 pl-6">
                    <ArrowUpDown size={11} className="text-stone-500" />
                    <p className="text-[9px] uppercase tracking-[0.3em] font-bold text-stone-500">Sort by</p>
                </div>
                <div className="flex flex-col gap-1">
                    {SORT_ATTRS.map((attr) => {
                        const active = sort === attr.key;
                        return (
                            <button
                                key={attr.key}
                                onClick={() => onChange(attr.key)}
                                className={`w-full text-left px-3 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-[0.2em] border transition-colors duration-200 ${
                                    active
                                        ? "bg-stone-900 text-white border-stone-900"
                                        : "border-transparent text-stone-500 hover:border-stone-200 hover:text-stone-900"
                                }`}
                            >
                                {attr.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </SidePanel>
    );
}
