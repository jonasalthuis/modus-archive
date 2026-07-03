"use client";

import React, { useMemo } from "react";
import { SlidersHorizontal } from "lucide-react";
import { SidePanel } from "./SidePanel";
import { distinctDecades, distinctMaterials, distinctValues } from "./layouts";
import type { UniverseModel, Filters } from "./types";

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
        <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-stone-500">
                    {label}
                </span>
                {value && (
                    <button
                        onClick={() => onChange(null)}
                        className="text-[9px] uppercase tracking-[0.2em] font-bold text-stone-400 hover:text-stone-900 transition-colors"
                    >
                        Clear
                    </button>
                )}
            </div>
            <select
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value || null)}
                className={`w-full text-[10px] uppercase tracking-[0.15em] font-bold bg-transparent rounded-md px-2 py-1.5 hover:border-stone-900 focus:border-stone-900 outline-none cursor-pointer transition-colors ${
                    value
                        ? "border border-stone-900 text-stone-900"
                        : "border border-stone-200 text-stone-700"
                }`}
            >
                <option value="">All</option>
                {options.map((o) => (
                    <option key={o} value={o}>
                        {o}
                    </option>
                ))}
            </select>
        </div>
    );
}

export function GridControls({
    models,
    filters,
    onChange,
    collapseToken = 0,
    expandToken = 0,
}: {
    models: UniverseModel[];
    filters: Filters;
    onChange: (f: Filters) => void;
    collapseToken?: number;
    expandToken?: number;
}) {
    const modelTypes   = useMemo(() => distinctValues(models, (m) => m.modelType), [models]);
    const buildingTypes = useMemo(() => distinctValues(models, (m) => m.buildingType), [models]);
    const statuses     = useMemo(() => distinctValues(models, (m) => m.buildingStatus), [models]);
    const leadMakers   = useMemo(() => distinctValues(models, (m) => m.leadMaker), [models]);
    const materials    = useMemo(() => distinctMaterials(models), [models]);
    const decades      = useMemo(() => distinctDecades(models), [models]);

    const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

    const anyActive = !!(filters.modelType || filters.buildingType || filters.buildingStatus || filters.leadMaker || filters.material || filters.decade);
    const clearAll = () => onChange({ ...filters, modelType: null, buildingType: null, buildingStatus: null, leadMaker: null, material: null, decade: null });

    return (
        <SidePanel side="right" collapseToken={collapseToken} expandToken={expandToken} icon={<SlidersHorizontal size={12} />}>
            <div className="w-60 bg-white/50 backdrop-blur-xl border border-stone-200 rounded-lg p-4 flex flex-col gap-4 shadow-sm">
                <div className="flex items-center justify-between pr-6">
                    <div className="flex items-center gap-2">
                        <SlidersHorizontal size={11} className="text-stone-400" />
                        <p className="text-[9px] uppercase tracking-[0.45em] font-bold text-stone-400">Filters</p>
                    </div>
                    {anyActive && (
                        <button
                            onClick={clearAll}
                            className="text-[9px] uppercase tracking-[0.2em] font-bold text-stone-400 hover:text-stone-900 transition-colors"
                        >
                            Clear all
                        </button>
                    )}
                </div>
                <Dropdown label="Type"     value={filters.modelType}     options={modelTypes}    onChange={(v) => set({ modelType: v })} />
                <Dropdown label="Building" value={filters.buildingType}  options={buildingTypes} onChange={(v) => set({ buildingType: v })} />
                <Dropdown label="Status"   value={filters.buildingStatus} options={statuses}     onChange={(v) => set({ buildingStatus: v })} />
                <Dropdown label="Decade"   value={filters.decade}        options={decades}       onChange={(v) => set({ decade: v })} />
                <Dropdown label="Maker"    value={filters.leadMaker}     options={leadMakers}    onChange={(v) => set({ leadMaker: v })} />
                <Dropdown label="Material" value={filters.material}      options={materials}     onChange={(v) => set({ material: v })} />
            </div>
        </SidePanel>
    );
}
