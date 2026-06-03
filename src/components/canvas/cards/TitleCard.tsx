import React from "react";
import { clean } from "@/lib/modelUtils";
import type { ModelData } from "@/types/model";
import { CARD_SHELL } from "./cardStyles";

export function TitleCard({ model }: { model: ModelData }) {
    const title = clean(model.title) ?? "Untitled";
    const architect = clean(model.architect);
    const year = model.year;

    return (
        <div className={`${CARD_SHELL} p-6 select-none`} style={{ width: 300 }}>
            <p className="text-[9px] uppercase tracking-[0.4em] font-bold text-stone-500 mb-2 font-mono">
                {model.modelNumber ?? "—"}
            </p>
            <h1 className="text-2xl font-normal tracking-tight leading-tight text-stone-900 mb-3">{title}</h1>
            {(architect || year) && (
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] font-bold text-stone-600">
                    {architect && <span>{architect}</span>}
                    {architect && year && <span className="w-px h-3 bg-stone-300 inline-block" />}
                    {year && <span>{year}</span>}
                </div>
            )}
            <div className="w-10 h-0.5 bg-stone-900 mt-5" />
        </div>
    );
}
