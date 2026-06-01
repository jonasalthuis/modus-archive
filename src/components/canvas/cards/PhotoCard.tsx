import React from "react";
import Image from "next/image";
import type { ImageGroup } from "@/types/model";

export function PhotoCard({ group }: { group: ImageGroup }) {
    const img = group.images[0];
    if (!img) return null;

    return (
        <div className="bg-white border border-stone-200 select-none" style={{ width: 300 }}>
            <div className="relative bg-stone-100" style={{ height: 260 }}>
                <Image
                    src={img.url}
                    alt={img.caption ?? ""}
                    fill
                    className="object-cover"
                    sizes="300px"
                    draggable={false}
                />
            </div>
            {img.caption && (
                <div className="px-3 py-2 border-t border-stone-100">
                    <p className="text-[9px] font-light text-stone-400">{img.caption}</p>
                </div>
            )}
        </div>
    );
}
