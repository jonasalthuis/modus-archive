import React from "react";
import Image from "next/image";
import type { ImageGroup } from "@/types/model";
import { BLUR_DATA_URL } from "@/lib/blur";

export function PhotoCard({ group }: { group: ImageGroup }) {
    const img = group.images[0];
    if (!img) return null;

    return (
        <div className="bg-white border border-stone-200 rounded-lg overflow-hidden shadow-[0_14px_40px_-12px_rgba(28,25,23,0.30)] select-none" style={{ width: 300 }}>
            <div className="relative bg-stone-100" style={{ height: 260 }}>
                <Image
                    src={img.url}
                    alt={img.caption ?? ""}
                    fill
                    className="object-cover"
                    sizes="300px"
                    placeholder="blur"
                    blurDataURL={BLUR_DATA_URL}
                    draggable={false}
                />
            </div>
            {img.caption && (
                <div className="px-3 py-2 border-t border-stone-100">
                    <p className="text-[10px] font-normal text-stone-600">{img.caption}</p>
                </div>
            )}
        </div>
    );
}
