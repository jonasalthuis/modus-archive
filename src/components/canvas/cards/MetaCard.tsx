import React from "react";
import { clean } from "@/lib/modelUtils";
import type { ModelData } from "@/types/model";

export function MetaCard({ model }: { model: ModelData }) {
    const rows = [
        { label: "Scale", value: clean(model.scale) },
        { label: "Physical size", value: clean(model.modelSize) },
        { label: "Model type", value: clean(model.modelType) },
        { label: "Building type", value: clean(model.buildingType) },
        { label: "Status", value: clean(model.buildingStatus) },
        { label: "Location", value: clean(model.location) },
        { label: "Lead maker", value: clean(model.leadMaker) },
        { label: "Provenance", value: clean(model.provenance) },
        { label: "Photographer", value: clean(model.photographer) },
    ].filter((r) => r.value !== null);

    const materials = (model.materials ?? []).filter((m) => clean(m) !== null);

    if (rows.length === 0 && materials.length === 0) return null;

    return (
        <div className="bg-white border border-stone-200 p-5 select-none" style={{ width: 250 }}>
            <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-300 mb-4">Catalogue</p>
            {rows.length > 0 && (
                <dl className="space-y-3">
                    {rows.map((row) => (
                        <div key={row.label}>
                            <dt className="text-[8px] uppercase tracking-[0.4em] font-bold text-stone-300">
                                {row.label}
                            </dt>
                            <dd className="text-[11px] font-light text-stone-700 mt-0.5">{row.value}</dd>
                        </div>
                    ))}
                </dl>
            )}
            {materials.length > 0 && (
                <div className={rows.length > 0 ? "mt-3 pt-3 border-t border-stone-100" : ""}>
                    <dt className="text-[8px] uppercase tracking-[0.4em] font-bold text-stone-300 mb-1.5">
                        Materials
                    </dt>
                    <dd className="flex flex-wrap gap-1">
                        {materials.map((m) => (
                            <span key={m} className="text-[8px] font-mono bg-stone-100 px-1.5 py-0.5 uppercase">
                                {m}
                            </span>
                        ))}
                    </dd>
                </div>
            )}
        </div>
    );
}
