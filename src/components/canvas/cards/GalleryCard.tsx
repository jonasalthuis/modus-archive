"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Maximize2, X, ChevronLeft, ChevronRight } from "lucide-react";
import type { ImageGroup } from "@/types/model";
import { BLUR_DATA_URL } from "@/lib/blur";

export function GalleryCard({ group }: { group: ImageGroup }) {
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

    // Keyboard navigation while the lightbox is open
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

    if (!img || total === 0) return null;

    return (
        <>
            {/* Card */}
            <div className="relative bg-gray-100 overflow-hidden rounded-lg select-none shadow-[0_2px_12px_rgba(0,0,0,0.06)]" style={{ width: 360, height: 270 }}>
                <div className="relative bg-gray-100 group h-full">
                    <Image
                        src={img.url}
                        alt={img.caption ?? `Photo ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="300px"
                        placeholder="blur"
                        blurDataURL={BLUR_DATA_URL}
                        draggable={false}
                    />
                    {/* Expand → lightbox */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setLightbox(true);
                        }}
                        className="absolute top-2 right-2 w-7 h-7 bg-white/85 hover:bg-white flex items-center justify-center text-gray-700 transition-colors border border-gray-200"
                        aria-label="Open lightbox"
                        title="Expand"
                    >
                        <Maximize2 size={13} />
                    </button>
                    {total > 1 && (
                        <>
                            <button
                                onClick={(e) => go(-1, e)}
                                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/80 hover:bg-white flex items-center justify-center text-gray-700 transition-colors border border-gray-200"
                                aria-label="Previous"
                            >
                                <ChevronLeft size={15} />
                            </button>
                            <button
                                onClick={(e) => go(1, e)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/80 hover:bg-white flex items-center justify-center text-gray-700 transition-colors border border-gray-200"
                                aria-label="Next"
                            >
                                <ChevronRight size={15} />
                            </button>
                        </>
                    )}
                </div>
                {(img.caption || total > 1) && (
                    <div className="absolute bottom-0 inset-x-0 bg-white/75 backdrop-blur-sm border-t border-gray-100 px-3 py-2 flex items-center justify-between">
                        <p className="text-[9px] text-gray-500 font-light truncate">{img.caption ?? ""}</p>
                        {total > 1 && (
                            <p className="text-[8px] font-mono text-gray-400 flex-shrink-0 ml-2">
                                {index + 1}&thinsp;/&thinsp;{total}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Full-screen lightbox */}
            {lightbox &&
                typeof document !== "undefined" &&
                createPortal(
                    <div
                        className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center animate-in fade-in duration-150"
                        onClick={() => setLightbox(false)}
                    >
                        {/* Close */}
                        <button
                            onClick={() => setLightbox(false)}
                            className="absolute top-5 right-5 text-white/70 hover:text-white transition-colors"
                            aria-label="Close"
                        >
                            <X size={26} />
                        </button>

                        {/* Image */}
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

                        {/* Caption + counter */}
                        <div className="mt-4 text-center" onClick={(e) => e.stopPropagation()}>
                            {img.caption && <p className="text-sm text-white/80 font-light">{img.caption}</p>}
                            {total > 1 && (
                                <p className="text-[10px] font-mono text-white/40 mt-1">
                                    {index + 1} / {total}
                                </p>
                            )}
                        </div>

                        {/* Arrows */}
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
