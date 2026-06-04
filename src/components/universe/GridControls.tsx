"use client";

import React, { useMemo } from "react";
import { Search } from "lucide-react";
import { SidePanel } from "./SidePanel";
import { distinctValues } from "./layouts";
import type { UniverseModel, Filters } from "./types";

// Grid-mode controls — a compact vertical panel on the right: search, dropdown
// filters, and the scale slider, stacked.

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
        <label className="flex flex-col gap-1">
            <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-stone-300">
                {label}
            </span>
            <select
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value || null)}
                className="w-full text-[10px] uppercase tracking-[0.15em] font-bold text-stone-700 bg-transparent border border-stone-200 rounded-md px-2 py-1.5 hover:border-stone-900 focus:border-stone-900 outline-none cursor-pointer"
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

    const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

    return (
        <SidePanel>
            <div className="w-60 bg-white/90 backdrop-blur border border-stone-200 rounded-lg p-4 flex flex-col gap-4 shadow-sm">
                {/* search */}
                <div className="flex items-center gap-2 border border-stone-200 rounded-md px-2.5 py-2 focus-within:border-stone-900 transition-colors">
                    <Search size={13} className="text-stone-400 shrink-0" />
                    <input
                        value={filters.text}
                        onChange={(e) => set({ text: e.target.value })}
                        placeholder="SEARCH"
                        className="text-[10px] uppercase tracking-[0.2em] font-bold text-stone-800 placeholder:text-stone-300 bg-transparent outline-none w-full"
                    />
                </div>

                <Dropdown label="Type" value={filters.modelType} options={modelTypes} onChange={(v) => set({ modelType: v })} />
                <Dropdown label="Building" value={filters.buildingType} options={buildingTypes} onChange={(v) => set({ buildingType: v })} />
                <Dropdown label="Status" value={filters.buildingStatus} options={statuses} onChange={(v) => set({ buildingStatus: v })} />
            </div>
        </SidePanel>
    );
}
