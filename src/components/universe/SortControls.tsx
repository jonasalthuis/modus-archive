"use client";

import React from "react";
import { SidePanel } from "./SidePanel";
import { SORT_ATTRS } from "./layouts";
import type { SortAttr } from "./layouts";

// Grid-mode "sort by" picker — left-side collapsible panel.

export function SortControls({
    sort,
    onChange,
}: {
    sort: SortAttr;
    onChange: (s: SortAttr) => void;
}) {
    return (
        <SidePanel side="left">
            <div className="w-44 bg-white/90 backdrop-blur border border-stone-200 rounded-lg p-3 shadow-sm">
                <p className="text-[9px] uppercase tracking-[0.3em] font-bold text-stone-500 mb-2 px-1">
                    Sort by
                </p>
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
