"use client";

import React from "react";
import { Layers, X } from "lucide-react";
import { SidePanel } from "./SidePanel";
import { GROUP_ATTRS } from "./layouts";
import type { GroupAttr } from "./types";

// Clustered-mode "group by" picker. Collapsed by default.

export function ClusterControls({
    groupBy,
    onChange,
    collapseToken = 0,
    expandToken = 0,
}: {
    groupBy: GroupAttr;
    onChange: (g: GroupAttr) => void;
    collapseToken?: number;
    expandToken?: number;
}) {
    return (
        <SidePanel side="right" defaultOpen={false} collapseToken={collapseToken} expandToken={expandToken} icon={<Layers size={12} />}>
            <div className="w-48 bg-white/50 backdrop-blur-xl border border-stone-200 rounded-lg p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-2 px-1 pr-6">
                    <Layers size={11} className="text-stone-500" />
                    <p className="text-[9px] uppercase tracking-[0.3em] font-bold text-stone-500">Group by</p>
                </div>
                <div className="flex flex-col gap-1">
                    {GROUP_ATTRS.map((attr) => {
                        const active = groupBy === attr.key;
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

                {/* Clear button — only visible when a grouping is active */}
                <div
                    className={`overflow-hidden transition-all duration-200 ${
                        groupBy !== "none" ? "max-h-16 opacity-100 mt-3" : "max-h-0 opacity-0"
                    }`}
                >
                    <button
                        onClick={() => onChange("none")}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] border border-stone-200 text-stone-500 hover:border-stone-900 hover:text-stone-900 rounded-md transition-colors duration-200"
                    >
                        <X size={10} />
                        Clear
                    </button>
                </div>

                {groupBy === "dossier" && (
                    <p className="text-[9px] text-stone-400 mt-2 px-1 leading-snug tracking-wide normal-case font-normal">
                        Best-effort while the dossier system is being finalised — unassigned models are grouped together.
                    </p>
                )}
            </div>
        </SidePanel>
    );
}
