import React from "react";
import Image from "next/image";
import type { ImageGroup } from "@/types/model";
import { BLUR_DATA_URL } from "@/lib/blur";

// Large opening image — fills most of the viewport on the entry zoom.
export function HeroCard({ group }: { group: ImageGroup }) {
    const img = group.images[0];
    if (!img) return null;

    return (
        <div
            className="relative bg-gray-100 overflow-hidden rounded-lg select-none"
            style={{ width: 600, height: 460 }}
        >
            <Image
                src={img.url}
                alt={img.caption ?? ""}
                fill
                className="object-cover"
                sizes="600px"
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
                draggable={false}
                priority
            />
            {img.caption && (
                <div className="absolute bottom-0 inset-x-0 bg-white/75 backdrop-blur-sm border-t border-gray-100 px-4 py-2.5">
                    <p className="text-[9px] text-gray-500 font-light leading-snug">{img.caption}</p>
                </div>
            )}
        </div>
    );
}
