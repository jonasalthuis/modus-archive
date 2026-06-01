import React from "react";
import Image from "next/image";
import type { ImageGroup } from "@/types/model";

// Side-by-side group: 2 or 3 images, laid out in a row (horizontal) or a column (vertical).
export function StripCard({ group }: { group: ImageGroup }) {
    const images = group.images.slice(0, 3);
    if (images.length === 0) return null;

    const vertical = group.orientation === "vertical";
    const width = vertical ? 240 : Math.min(140 * images.length + 16, 440);

    return (
        <div className="bg-white border border-stone-200 p-2 select-none" style={{ width }}>
            <div className={vertical ? "flex flex-col gap-2" : "flex gap-2"}>
                {images.map((img, i) => (
                    <div key={img.url + i} className={vertical ? "space-y-1" : "flex-1 space-y-1"}>
                        <div className={`relative bg-stone-100 ${vertical ? "aspect-[4/3]" : "aspect-square"}`}>
                            <Image
                                src={img.url}
                                alt={img.caption ?? `Photo ${i + 1}`}
                                fill
                                className="object-cover"
                                sizes={vertical ? "240px" : "150px"}
                                draggable={false}
                            />
                        </div>
                        {img.caption && <p className="text-[8px] font-light text-stone-400 truncate">{img.caption}</p>}
                    </div>
                ))}
            </div>
        </div>
    );
}
