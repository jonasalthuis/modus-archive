import React from "react";
import { CARD_SHELL } from "./cardStyles";

export function TagsCard({ tags }: { tags: string[] }) {
    return (
        <div className={`${CARD_SHELL} select-none`} style={{ width: 270 }}>
            <div className="px-5 pt-4 pb-3 border-b border-gray-100">
                <p className="text-[9px] uppercase tracking-[0.4em] font-bold text-gray-500">Tags</p>
            </div>
            <div className="px-5 py-4 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                    <span
                        key={tag}
                        className="text-[9px] font-mono bg-gray-100 text-gray-600 px-2 py-1 uppercase tracking-wide rounded-md"
                    >
                        {tag}
                    </span>
                ))}
            </div>
        </div>
    );
}
