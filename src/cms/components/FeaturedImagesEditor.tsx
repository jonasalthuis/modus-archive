"use client";

import React, { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import type { ModelImage, FeaturedImages } from "@/types/model";
import { PoolPickerModal } from "./PoolPickerModal";

type Slot = "main" | "secondary";
const SLOTS: { key: Slot; label: string; hint: string }[] = [
    { key: "main", label: "Main image", hint: "Lead image — shown largest and first." },
    { key: "secondary", label: "Secondary image", hint: "Supporting feature image (optional)." },
];

interface Props {
    featured: FeaturedImages;
    poolImages: ModelImage[];
    onChange: (featured: FeaturedImages) => void;
}

export function FeaturedImagesEditor({ featured, poolImages, onChange }: Props) {
    const [pickerOpen, setPickerOpen] = useState<Slot | null>(null);

    function select(slot: Slot, url: string) {
        const img = poolImages.find((p) => p.url === url);
        if (!img) return;
        onChange({ ...featured, [slot]: { ...img, isStarred: slot === "main" } });
    }

    function clear(slot: Slot) {
        const next = { ...featured };
        delete next[slot];
        onChange(next);
    }

    return (
        <>
            {pickerOpen && (
                <PoolPickerModal
                    pool={poolImages}
                    selected={featured[pickerOpen]?.url ? [featured[pickerOpen]!.url] : []}
                    multiSelect={false}
                    title={pickerOpen === "main" ? "Select main image" : "Select secondary image"}
                    onToggle={(url) => select(pickerOpen, url)}
                    onClose={() => setPickerOpen(null)}
                />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {SLOTS.map(({ key, label, hint }) => {
                    const img = featured[key];
                    return (
                        <div key={key} className="border border-stone-200 rounded-lg overflow-hidden">
                            <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
                                <p className="text-[9px] uppercase tracking-[0.4em] font-bold text-stone-600">{label}</p>
                                <p className="text-[10px] text-stone-400 mt-0.5">{hint}</p>
                            </div>
                            <div className="p-3">
                                {img?.url ? (
                                    <div className="space-y-2">
                                        <div className="relative aspect-[4/3] rounded-md overflow-hidden bg-stone-100">
                                            <Image src={img.url} alt={img.caption || label} fill className="object-cover" sizes="240px" unoptimized />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <button
                                                type="button"
                                                onClick={() => setPickerOpen(key)}
                                                className="text-[9px] uppercase tracking-[0.3em] font-bold text-stone-500 hover:text-stone-900 transition-colors"
                                            >
                                                Change
                                            </button>
                                            <button type="button" onClick={() => clear(key)} className="text-stone-400 hover:text-red-500 transition-colors" title="Remove">
                                                <X size={13} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setPickerOpen(key)}
                                        className="w-full flex items-center justify-center aspect-[4/3] border border-dashed border-stone-300 rounded-md hover:border-stone-900 text-stone-400 hover:text-stone-900 transition-colors text-[9px] uppercase tracking-[0.3em] font-bold"
                                    >
                                        Select from pool
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            {poolImages.length === 0 && (
                <p className="text-[10px] text-stone-400 text-center py-2">
                    Upload images in the Images section first, then select them here.
                </p>
            )}
        </>
    );
}
