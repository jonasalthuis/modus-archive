import React from "react";
import Image from "next/image";
import type { ModelImage } from "@/types/model";
import { BLUR_DATA_URL } from "@/lib/blur";

// Prominent lead imagery. Main renders larger than secondary.
export function FeaturedCard({ image, role }: { image: ModelImage; role: "main" | "secondary" }) {
    const main = role === "main";
    const width = main ? 380 : 280;
    const height = main ? 300 : 220;

    return (
        <div className="bg-white border border-stone-200 rounded-lg overflow-hidden shadow-[0_16px_46px_-12px_rgba(28,25,23,0.34)] select-none" style={{ width }}>
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
                <span className="absolute top-2 left-2 bg-stone-900 text-white text-[8px] uppercase tracking-[0.3em] px-1.5 py-0.5 font-bold">
                    {main ? "Main" : "Secondary"}
                </span>
            </div>
            {image.caption && (
                <p className="px-3 py-2 text-[10px] font-normal text-stone-600 border-t border-stone-100 truncate">
                    {image.caption}
                </p>
            )}
        </div>
    );
}
