"use client";

import React, { useMemo } from "react";
import { Search } from "lucide-react";
import { ScaleBar } from "./ScaleBar";
import { distinctValues, distinctScales } from "./layouts";
import type { UniverseModel, Filters } from "./types";

// Grid-mode header: text search + dropdown filters + scale bar.
// A floating panel anchored top-centre, clear of the top-left Nav.

function Dropdown({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: string | null;
    options: string[];
    onChange: (v: string | null) => void;
}) {
    if (options.length === 0) return null;
    return (
        <label className="flex items-center gap-1.5">
            <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-stone-300 shrink-0">
                {label}
            </span>
            <select
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value || null)}
                className="text-[10px] uppercase tracking-[0.15em] font-bold text-stone-700 bg-transparent border border-stone-200 rounded-md px-2 py-1 hover:border-stone-900 focus:border-stone-900 outline-none cursor-pointer"
            >
                <option value="">All</option>
                {options.map((o) => (
                    <option key={o} value={o}>
                        {o}
                    </option>
                ))}
            </select>
        </label>
    );
}

export function GridControls({
    models,
    filters,
    onChange,
}: {
    models: UniverseModel[];
    filters: Filters;
    onChange: (f: Filters) => void;
}) {
    const modelTypes = useMemo(() => distinctValues(models, (m) => m.modelType), [models]);
    const buildingTypes = useMemo(() => distinctValues(models, (m) => m.buildingType), [models]);
    const statuses = useMemo(() => distinctValues(models, (m) => m.buildingStatus), [models]);
    const scales = useMemo(() => distinctScales(models), [models]);

    const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

    return (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-40 max-w-[min(96vw,1100px)]">
            <div className="bg-white/90 backdrop-blur border border-stone-200 rounded-lg px-4 py-3 flex flex-col gap-3">
                {/* Row 1: search + dropdowns */}
                <div className="flex items-center gap-4 flex-wrap justify-center">
                    <div className="flex items-center gap-2 border border-stone-200 rounded-md px-2.5 py-1.5 focus-within:border-stone-900 transition-colors">
                        <Search size={13} className="text-stone-400" />
                        <input
                            value={filters.text}
                            onChange={(e) => set({ text: e.target.value })}
                            placeholder="SEARCH"
                            className="text-[10px] uppercase tracking-[0.2em] font-bold text-stone-800 placeholder:text-stone-300 bg-transparent outline-none w-40"
                        />
                    </div>
                    <Dropdown label="Type" value={filters.modelType} options={modelTypes} onChange={(v) => set({ modelType: v })} />
                    <Dropdown label="Building" value={filters.buildingType} options={buildingTypes} onChange={(v) => set({ buildingType: v })} />
                    <Dropdown label="Status" value={filters.buildingStatus} options={statuses} onChange={(v) => set({ buildingStatus: v })} />
                </div>

                {/* Row 2: scale selection bar */}
                {scales.length > 0 && (
                    <div className="flex justify-center border-t border-stone-100 pt-3">
                        <ScaleBar
                            scales={scales}
                            selected={filters.scales}
                            onChange={(next) => set({ scales: next })}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
