import React from "react";
import Image from "next/image";
import type { ModelImage } from "@/types/model";

// Prominent lead imagery. Main renders larger than secondary.
export function FeaturedCard({ image, role }: { image: ModelImage; role: "main" | "secondary" }) {
    const main = role === "main";
    const width = main ? 380 : 280;
    const height = main ? 300 : 220;

    return (
        <div className="bg-white border border-stone-300 shadow-sm select-none" style={{ width }}>
            <div className="relative bg-stone-100" style={{ height }}>
                <Image
                    src={image.url}
                    alt={image.caption ?? (main ? "Main image" : "Secondary image")}
                    fill
                    className="object-cover"
                    sizes={`${width}px`}
                    draggable={false}
                    priority={main}
                />
                <span className="absolute top-2 left-2 bg-stone-900 text-white text-[8px] uppercase tracking-[0.3em] px-1.5 py-0.5 font-bold">
                    {main ? "Main" : "Secondary"}
                </span>
            </div>
            {image.caption && (
                <p className="px-3 py-2 text-[9px] font-light text-stone-500 border-t border-stone-100 truncate">
                    {image.caption}
                </p>
            )}
        </div>
    );
}
