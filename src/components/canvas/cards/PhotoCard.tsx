import React from "react";
import Image from "next/image";
import type { ImageGroup } from "@/types/model";
import { BLUR_DATA_URL } from "@/lib/blur";

export function PhotoCard({ group }: { group: ImageGroup }) {
    const img = group.images[0];
    if (!img) return null;

    return (
        <div className="relative bg-gray-100 overflow-hidden select-none shadow-[0_2px_12px_rgba(0,0,0,0.06)]" style={{ width: 320, height: 240 }}>
            <Image
                src={img.url}
                alt={img.caption ?? ""}
                fill
                className="object-cover"
                sizes="320px"
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
                draggable={false}
            />
            {img.caption && (
                <div className="absolute bottom-0 inset-x-0 bg-white/75 backdrop-blur-sm border-t border-gray-100 px-3 py-2">
                    <p className="text-[9px] text-gray-500 font-light">{img.caption}</p>
                </div>
            )}
        </div>
    );
}
