import React from "react";
import { clean } from "@/lib/modelUtils";
import type { ModelData } from "@/types/model";

export function TitleCard({ model }: { model: ModelData }) {
    const title = clean(model.title) ?? "Untitled";
    const architect = clean(model.architect);
    const year = model.year;

    return (
        <div className="bg-white border border-stone-200 p-6 select-none" style={{ width: 300 }}>
            <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-300 mb-2 font-mono">
                {model.modelNumber ?? "—"}
            </p>
            <h1 className="text-2xl font-light tracking-tight leading-tight text-stone-900 mb-3">{title}</h1>
            {(architect || year) && (
                <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.3em] font-bold text-stone-400">
                    {architect && <span>{architect}</span>}
                    {architect && year && <span className="w-px h-3 bg-stone-200 inline-block" />}
                    {year && <span>{year}</span>}
                </div>
            )}
            <div className="w-8 h-px bg-stone-900 mt-4" />
        </div>
    );
}
