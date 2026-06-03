"use client";

import React from "react";
import { SidePanel } from "./SidePanel";
import { GROUP_ATTRS } from "./layouts";
import type { GroupAttr } from "./types";

// Clustered-mode "group by" picker — a compact vertical panel on the right.
// "None" = the open floating universe.

export function ClusterControls({
    groupBy,
    onChange,
}: {
    groupBy: GroupAttr;
    onChange: (g: GroupAttr) => void;
}) {
    return (
        <SidePanel>
            <div className="w-48 bg-white/90 backdrop-blur border border-stone-200 border-r-0 rounded-l-lg p-3">
                <p className="text-[9px] uppercase tracking-[0.3em] font-bold text-stone-300 mb-2 px-1">
                    Group by
                </p>
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
                {groupBy === "dossier" && (
                    <p className="text-[9px] text-stone-400 mt-2 px-1 leading-snug tracking-wide normal-case font-normal">
                        Best-effort while the dossier system is being finalised — unassigned models are grouped together.
                    </p>
                )}
            </div>
        </SidePanel>
    );
}
