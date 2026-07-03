import React from "react";
import { CARD_SHELL } from "./cardStyles";

export function NotesCard({ notes }: { notes: string }) {
    return (
        <div className={`${CARD_SHELL} p-6 select-none`} style={{ width: 320 }}>
            <p className="text-[9px] uppercase tracking-[0.4em] font-bold text-gray-400 mb-3">Notes</p>
            <p className="text-sm font-normal text-gray-800 leading-relaxed">{notes}</p>
        </div>
    );
}
