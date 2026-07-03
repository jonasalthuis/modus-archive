import React from "react";
import { clean } from "@/lib/modelUtils";
import type { ModelData } from "@/types/model";
import { CARD_SHELL } from "./cardStyles";

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
        <div className={`${CARD_SHELL} select-none`} style={{ width: 270 }}>
            {/* Header */}
            <div className="px-5 pt-4 pb-3 border-b border-gray-100">
                <p className="text-[9px] uppercase tracking-[0.4em] font-bold text-gray-500">Catalogue</p>
            </div>

            {/* Spec rows */}
            {rows.length > 0 && (
                <dl className="px-5">
                    {rows.map((row) => (
                        <div
                            key={row.label}
                            className="flex items-baseline justify-between gap-4 py-2.5 border-b border-gray-100 last:border-0"
                        >
                            <dt className="text-[8px] uppercase tracking-[0.3em] font-bold text-gray-400 flex-shrink-0 pt-0.5">
                                {row.label}
                            </dt>
                            <dd className="text-[12px] font-normal text-gray-900 text-right leading-snug">
                                {row.value}
                            </dd>
                        </div>
                    ))}
                </dl>
            )}

            {/* Materials */}
            {materials.length > 0 && (
                <div className="px-5 py-4 border-t border-gray-100">
                    <dt className="text-[8px] uppercase tracking-[0.3em] font-bold text-gray-400 mb-2">Materials</dt>
                    <dd className="flex flex-wrap gap-1.5">
                        {materials.map((m) => (
                            <span
                                key={m}
                                className="text-[9px] font-mono bg-gray-100 text-gray-600 px-2 py-1 uppercase tracking-wide rounded-md"
                            >
                                {m}
                            </span>
                        ))}
                    </dd>
                </div>
            )}
        </div>
    );
}
