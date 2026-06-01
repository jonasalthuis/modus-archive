import React from "react";

export function NotesCard({ notes }: { notes: string }) {
    return (
        <div className="bg-white border border-stone-200 p-6 select-none" style={{ width: 320 }}>
            <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-300 mb-3">Notes</p>
            <p className="text-sm font-light text-stone-600 leading-relaxed">{notes}</p>
        </div>
    );
}
