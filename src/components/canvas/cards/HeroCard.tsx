"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Maximize2, X, ChevronLeft, ChevronRight } from "lucide-react";
import type { ImageGroup } from "@/types/model";
import { BLUR_DATA_URL } from "@/lib/blur";

// Large opening image — fills most of the viewport on the entry zoom. This is
// always whichever group is first, regardless of its mode, so it needs to
// support browsing multiple images itself (arrows + fullscreen lightbox) —
// otherwise a group with several photos would only ever show the first one.
export function HeroCard({ group }: { group: ImageGroup }) {
    const total = group.images.length;
    const [index, setIndex] = useState(0);
    const [lightbox, setLightbox] = useState(false);

    const img = group.images[index];

    const go = useCallback(
        (dir: number, e?: React.MouseEvent) => {
            e?.stopPropagation();
            setIndex((i) => (i + dir + total) % total);
        },
        [total],
    );

    useEffect(() => {
        if (!lightbox) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setLightbox(false);
            else if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + total) % total);
            else if (e.key === "ArrowRight") setIndex((i) => (i + 1) % total);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [lightbox, total]);

    if (!img) return null;

    return (
        <>
            <div className="relative bg-gray-100 overflow-hidden select-none group" style={{ width: 600, height: 460 }}>
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

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setLightbox(true);
                    }}
                    className="absolute top-3 right-3 w-8 h-8 bg-white/85 hover:bg-white flex items-center justify-center text-gray-700 transition-colors border border-gray-200"
                    aria-label="Open lightbox"
                    title="Expand"
                >
                    <Maximize2 size={14} />
                </button>

                {total > 1 && (
                    <>
                        <button
                            onClick={(e) => go(-1, e)}
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white flex items-center justify-center text-gray-700 transition-colors border border-gray-200"
                            aria-label="Previous"
                        >
                            <ChevronLeft size={17} />
                        </button>
                        <button
                            onClick={(e) => go(1, e)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white flex items-center justify-center text-gray-700 transition-colors border border-gray-200"
                            aria-label="Next"
                        >
                            <ChevronRight size={17} />
                        </button>
                    </>
                )}

                {(img.caption || total > 1) && (
                    <div className="absolute bottom-0 inset-x-0 bg-white/75 backdrop-blur-sm border-t border-gray-100 px-4 py-2.5 flex items-center justify-between">
                        <p className="text-[9px] text-gray-500 font-light leading-snug truncate">{img.caption ?? ""}</p>
                        {total > 1 && (
                            <p className="text-[9px] font-mono text-gray-400 flex-shrink-0 ml-2">
                                {index + 1}&thinsp;/&thinsp;{total}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {lightbox &&
                typeof document !== "undefined" &&
                createPortal(
                    <div
                        className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center animate-in fade-in duration-150"
                        onClick={() => setLightbox(false)}
                    >
                        <button
                            onClick={() => setLightbox(false)}
                            className="absolute top-5 right-5 text-white/70 hover:text-white transition-colors"
                            aria-label="Close"
                        >
                            <X size={26} />
                        </button>

                        <div className="relative w-[90vw] h-[80vh]" onClick={(e) => e.stopPropagation()}>
                            <Image
                                src={img.url}
                                alt={img.caption ?? `Photo ${index + 1}`}
                                fill
                                className="object-contain"
                                sizes="90vw"
                                placeholder="blur"
                                blurDataURL={BLUR_DATA_URL}
                            />
                        </div>

                        <div className="mt-4 text-center" onClick={(e) => e.stopPropagation()}>
                            {img.caption && <p className="text-sm text-white/80 font-light">{img.caption}</p>}
                            {total > 1 && (
                                <p className="text-[10px] font-mono text-white/40 mt-1">
                                    {index + 1} / {total}
                                </p>
                            )}
                        </div>

                        {total > 1 && (
                            <>
                                <button
                                    onClick={(e) => go(-1, e)}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                                    aria-label="Previous"
                                >
                                    <ChevronLeft size={32} />
                                </button>
                                <button
                                    onClick={(e) => go(1, e)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                                    aria-label="Next"
                                >
                                    <ChevronRight size={32} />
                                </button>
                            </>
                        )}
                    </div>,
                    document.body,
                )}
        </>
    );
}
