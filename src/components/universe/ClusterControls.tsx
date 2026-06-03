"use client";

import React from "react";
import { GROUP_ATTRS } from "./layouts";
import type { GroupAttr } from "./types";

// Clustered-mode header: a "group by" picker over all model attributes.
// Floating panel anchored top-centre, clear of the top-left Nav.

export function ClusterControls({
    groupBy,
    onChange,
}: {
    groupBy: GroupAttr;
    onChange: (g: GroupAttr) => void;
}) {
    return (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-40 max-w-[min(96vw,920px)]">
            <div className="bg-white/90 backdrop-blur border border-stone-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-3 flex-wrap justify-center">
                    <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-stone-300 shrink-0">
                        Group by
                    </span>
                    {GROUP_ATTRS.map((attr) => {
                        const active = groupBy === attr.key;
                        return (
                            <button
                                key={attr.key}
                                onClick={() => onChange(attr.key)}
                                className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-[0.2em] border transition-colors duration-200 ${
                                    active
                                        ? "bg-stone-900 text-white border-stone-900"
                                        : "border-stone-200 text-stone-500 hover:border-stone-900 hover:text-stone-900"
                                }`}
                            >
                                {attr.label}
                            </button>
                        );
                    })}
                </div>
                {groupBy === "dossier" && (
                    <p className="text-[9px] text-stone-400 text-center mt-2 tracking-wide normal-case font-normal">
                        Dossier grouping is best-effort while the dossier system is being finalised — unassigned models are grouped together.
                    </p>
                )}
            </div>
        </div>
    );
}
