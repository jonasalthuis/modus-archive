import React from "react";
import { clean } from "@/lib/modelUtils";
import type { ModelData } from "@/types/model";
import { CARD_SHELL } from "./cardStyles";

export function TitleCard({ model }: { model: ModelData }) {
    const title = clean(model.title) ?? "Untitled";
    const architect = clean(model.architect);
    const year = model.year;

    return (
        <div className={`${CARD_SHELL} p-6 select-none`} style={{ width: 280 }}>
            <p className="text-[8px] uppercase tracking-[0.5em] font-bold text-gray-400 mb-4 font-mono">
                {model.modelNumber ?? "—"}
            </p>
            <h1 className="text-[22px] font-light tracking-tight leading-snug text-gray-900 mb-5">{title}</h1>
            {(architect || year) && (
                <div className="space-y-1">
                    {architect && (
                        <p className="text-[8px] uppercase tracking-[0.4em] font-bold text-gray-500 leading-relaxed">
                            {architect}
                        </p>
                    )}
                    {year && (
                        <p className="text-[10px] font-mono text-gray-400">{year}</p>
                    )}
                </div>
            )}
        </div>
    );
}
