"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { Upload, Trash2, Loader2 } from "lucide-react";
import { uploadModelImage, deleteImageByUrl } from "@/lib/uploadImage";
import type { ModelImage, FeaturedImages } from "@/types/model";

type Slot = "main" | "secondary";
const SLOTS: { key: Slot; label: string; hint: string }[] = [
    { key: "main", label: "Main image", hint: "The lead image — shown largest and first." },
    { key: "secondary", label: "Secondary image", hint: "A supporting feature image (optional)." },
];

interface Props {
    modelId: string;
    featured: FeaturedImages;
    onChange: (featured: FeaturedImages) => void;
}

export function FeaturedImagesEditor({ modelId, featured, onChange }: Props) {
    const [busy, setBusy] = useState<Slot | null>(null);
    const [error, setError] = useState<string | null>(null);
    const mainRef = useRef<HTMLInputElement>(null);
    const secRef = useRef<HTMLInputElement>(null);
    const refFor = (s: Slot) => (s === "main" ? mainRef : secRef);

    async function handleFile(slot: Slot, e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!modelId) {
            setError("Save the model number first before uploading images.");
            return;
        }
        setBusy(slot);
        setError(null);
        try {
            const url = await uploadModelImage(modelId, file);
            const image: ModelImage = {
                url,
                importance: 1,
                isStarred: slot === "main",
                caption: featured[slot]?.caption,
            };
            onChange({ ...featured, [slot]: image });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed.");
        }
        setBusy(null);
        if (refFor(slot).current) refFor(slot).current!.value = "";
    }

    async function remove(slot: Slot) {
        const img = featured[slot];
        if (img?.url) await deleteImageByUrl(img.url);
        const next = { ...featured };
        delete next[slot];
        onChange(next);
    }

    function setCaption(slot: Slot, caption: string) {
        const img = featured[slot];
        if (!img) return;
        onChange({ ...featured, [slot]: { ...img, caption } });
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SLOTS.map(({ key, label, hint }) => {
                const img = featured[key];
                return (
                    <div key={key} className="border border-stone-300 bg-stone-50">
                        <div className="px-3 py-2 border-b border-stone-200 bg-white">
                            <p className="text-[9px] uppercase tracking-[0.3em] font-bold text-stone-600">{label}</p>
                            <p className="text-[10px] text-stone-400">{hint}</p>
                        </div>

                        <div className="p-3 space-y-2">
                            {img?.url ? (
                                <>
                                    <div className="relative aspect-[4/3] bg-stone-100 border border-stone-200">
                                        <Image
                                            src={img.url}
                                            alt={img.caption || label}
                                            fill
                                            className="object-cover"
                                            sizes="240px"
                                            unoptimized
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Caption…"
                                        value={img.caption || ""}
                                        onChange={(e) => setCaption(key, e.target.value)}
                                        className="w-full text-[10px] px-2 py-1 border border-stone-300 focus:border-stone-900 outline-none font-mono"
                                    />
                                    <div className="flex justify-between">
                                        <button
                                            type="button"
                                            onClick={() => refFor(key).current?.click()}
                                            className="text-[9px] uppercase tracking-widest font-bold text-stone-400 hover:text-stone-900 transition-colors"
                                        >
                                            Replace
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => remove(key)}
                                            className="text-stone-300 hover:text-red-500 transition-colors"
                                            title="Remove"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => refFor(key).current?.click()}
                                    disabled={busy === key}
                                    className="w-full flex flex-col items-center justify-center gap-2 aspect-[4/3] border border-dashed border-stone-300 hover:border-stone-900 text-stone-400 hover:text-stone-900 transition-colors disabled:opacity-50"
                                >
                                    {busy === key ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <>
                                            <Upload size={16} />
                                            <span className="text-[9px] uppercase tracking-widest font-bold">
                                                Set {label.split(" ")[0].toLowerCase()}
                                            </span>
                                        </>
                                    )}
                                </button>
                            )}
                            <input
                                ref={refFor(key)}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleFile(key, e)}
                            />
                        </div>
                    </div>
                );
            })}
            {error && (
                <p className="sm:col-span-2 text-red-500 text-[10px] uppercase tracking-widest font-bold">{error}</p>
            )}
        </div>
    );
}
