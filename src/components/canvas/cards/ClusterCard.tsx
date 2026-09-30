"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { ImageGroup } from "@/types/model";
import { BLUR_DATA_URL } from "@/lib/blur";

// Deterministic pseudo-random in [0,1) seeded from a string — keeps the loose
// scatter stable across re-renders instead of reshuffling on every paint.
function seededRand(seed: string): number {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
        h ^= seed.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 10000) / 10000;
}

const MAX_IMAGES = 8;
const TILE = 128;
const CELL_W = TILE * 0.85;
const CELL_H = TILE * 0.62;

// Loose, irregular grouping — images scattered with slight overlap and tilt,
// evoking the explore canvas aesthetic. Click any photo to browse fullscreen.
export function ClusterCard({ group }: { group: ImageGroup }) {
    const images = group.images.slice(0, MAX_IMAGES);
    const total = images.length;
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    const go = useCallback(
        (dir: number, e?: React.MouseEvent) => {
            e?.stopPropagation();
            setLightboxIndex((i) => (i === null ? null : (i + dir + total) % total));
        },
        [total],
    );

    useEffect(() => {
        if (lightboxIndex === null) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setLightboxIndex(null);
            else if (e.key === "ArrowLeft") setLightboxIndex((i) => (i === null ? null : (i - 1 + total) % total));
            else if (e.key === "ArrowRight") setLightboxIndex((i) => (i === null ? null : (i + 1) % total));
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [lightboxIndex, total]);

    if (total === 0) return null;

    const cols = Math.ceil(Math.sqrt(total * 1.4));
    const rows = Math.ceil(total / cols);
    const width = cols * CELL_W + TILE * 0.3;
    const height = rows * CELL_H + TILE * 0.3;

    const activeImg = lightboxIndex !== null ? images[lightboxIndex] : null;

    return (
        <>
            <div className="relative select-none" style={{ width, height }}>
                {images.map((img, i) => {
                    const jx = seededRand(img.url + "x");
                    const jy = seededRand(img.url + "y");
                    const jr = seededRand(img.url + "r");
                    const col = i % cols;
                    const row = Math.floor(i / cols);
                    const left = col * CELL_W + (jx - 0.5) * CELL_W * 0.5;
                    const top = row * CELL_H + (jy - 0.5) * CELL_H * 0.5;
                    const rotate = (jr - 0.5) * 14; // -7..7deg

                    return (
                        <button
                            key={img.url + i}
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setLightboxIndex(i);
                            }}
                            className="absolute bg-white p-1 shadow-[0_3px_14px_rgba(0,0,0,0.12)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.18)] hover:z-10 transition-shadow"
                            style={{ left, top, width: TILE, transform: `rotate(${rotate}deg)`, zIndex: 1 + i }}
                        >
                            <div className="relative bg-gray-100 aspect-[4/3]">
                                <Image
                                    src={img.url}
                                    alt={img.caption ?? `Photo ${i + 1}`}
                                    fill
                                    className="object-cover"
                                    sizes="130px"
                                    placeholder="blur"
                                    blurDataURL={BLUR_DATA_URL}
                                    draggable={false}
                                />
                            </div>
                        </button>
                    );
                })}
            </div>

            {activeImg &&
                typeof document !== "undefined" &&
                createPortal(
                    <div
                        className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center animate-in fade-in duration-150"
                        onClick={() => setLightboxIndex(null)}
                    >
                        <button
                            onClick={() => setLightboxIndex(null)}
                            className="absolute top-5 right-5 text-white/70 hover:text-white transition-colors"
                            aria-label="Close"
                        >
                            <X size={26} />
                        </button>

                        <div className="relative w-[90vw] h-[80vh]" onClick={(e) => e.stopPropagation()}>
                            <Image
                                src={activeImg.url}
                                alt={activeImg.caption ?? `Photo ${(lightboxIndex ?? 0) + 1}`}
                                fill
                                className="object-contain"
                                sizes="90vw"
                                placeholder="blur"
                                blurDataURL={BLUR_DATA_URL}
                            />
                        </div>

                        <div className="mt-4 text-center" onClick={(e) => e.stopPropagation()}>
                            {activeImg.caption && <p className="text-sm text-white/80 font-light">{activeImg.caption}</p>}
                            {total > 1 && (
                                <p className="text-[10px] font-mono text-white/40 mt-1">
                                    {(lightboxIndex ?? 0) + 1} / {total}
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
