import React from "react";
import Image from "next/image";
import type { ModelImage } from "@/types/model";
import { BLUR_DATA_URL } from "@/lib/blur";

// Prominent lead imagery. Main renders larger than secondary.
export function FeaturedCard({ image, role }: { image: ModelImage; role: "main" | "secondary" }) {
    const main = role === "main";
    const width = main ? 480 : 320;
    const height = main ? 360 : 240;

    return (
        <div className="bg-white border border-stone-200 overflow-hidden select-none" style={{ width }}>
            <div className="relative bg-stone-100" style={{ height }}>
                <Image
                    src={image.url}
                    alt={image.caption ?? (main ? "Main image" : "Secondary image")}
                    fill
                    className="object-cover"
                    sizes={`${width}px`}
                    placeholder="blur"
                    blurDataURL={BLUR_DATA_URL}
                    draggable={false}
                    priority={main}
                />
            </div>
            {image.caption && (
                <p className="px-3 py-2 text-[10px] font-normal text-stone-600 border-t border-stone-100 truncate">
                    {image.caption}
                </p>
            )}
        </div>
    );
}
