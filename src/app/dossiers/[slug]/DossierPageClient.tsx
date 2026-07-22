"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowUpRight, ArrowLeft, ChevronLeft, ChevronRight, Quote as QuoteIcon, StickyNote, X, ChevronUp, ChevronDown, ArrowUp } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DossierItemType = "heading" | "text" | "quote" | "note" | "artefact" | "modelImage" | "image";

export type ImageWidth = "small" | "medium" | "full";

export interface DossierItem {
    id: string;
    type: DossierItemType;
    content?: string;
    artefactSlug?: string;
    artefactTitle?: string;
    artefactExcerpt?: string;
    modelId?: string;
    modelTitle?: string;
    imageUrl?: string;
    imageCaption?: string;
    /** Legacy field used by directly-authored "image" items — same role as imageCaption */
    caption?: string;
    imageWidth?: ImageWidth;
}

const IMAGE_WIDTH_PCT: Record<ImageWidth, string> = {
    small: "50%",
    medium: "75%",
    full: "100%",
};

export interface DossierData {
    id: string;
    title?: string;
    intro?: string;
    coverImage?: string;
    tags?: string[];
    items?: DossierItem[];
    author?: string;
    publishDate?: string;
}

export interface RelatedDossier {
    id: string;
    title?: string;
    intro?: string;
    tags?: string[];
    coverImage?: string;
}

export interface DossierNav {
    prevSlug?: string | null;
    nextSlug?: string | null;
}

// ── Content renderers ─────────────────────────────────────────────────────────

function ContentHeading({ item }: { item: DossierItem }) {
    return (
        <div className="pt-8 pb-2">
            <div className="w-6 h-px bg-stone-200 mb-5" />
            <h2 className="text-xl font-light uppercase tracking-[0.08em] text-stone-900 leading-snug">
                {item.content}
            </h2>
        </div>
    );
}

function ContentText({ item }: { item: DossierItem }) {
    return (
        <div className="border border-stone-200 p-6 space-y-4">
            {(item.content ?? "")
                .split(/\n\n+/)
                .filter((p) => p.trim())
                .map((para, i) => (
                    <p key={i} className="text-base font-light text-stone-800 leading-relaxed">
                        {para.trim()}
                    </p>
                ))}
        </div>
    );
}

function ContentQuote({ item }: { item: DossierItem }) {
    return (
        <div className="border-l-2 border-stone-400 pl-6 py-1 space-y-3">
            <QuoteIcon size={14} className="text-stone-400" />
            {(item.content ?? "")
                .split(/\n\n+/)
                .filter((p) => p.trim())
                .map((para, i) => (
                    <p key={i} className="text-lg font-light text-stone-500 leading-relaxed italic">
                        {para.trim()}
                    </p>
                ))}
        </div>
    );
}

function ContentNote({ item }: { item: DossierItem }) {
    return (
        <div className="border border-stone-200 bg-stone-50 p-5 flex items-start gap-3 rounded-lg">
            <StickyNote size={12} className="text-stone-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-light text-stone-700 leading-relaxed">{item.content}</p>
        </div>
    );
}

function ContentImage({ item, onOpen }: { item: DossierItem; onOpen: () => void }) {
    const caption = item.imageCaption ?? item.caption;
    const width = IMAGE_WIDTH_PCT[item.imageWidth ?? "full"];
    return (
        <div style={{ maxWidth: width, marginLeft: "auto", marginRight: "auto" }}>
            <button
                onClick={onOpen}
                className="group w-full text-left space-y-0 focus:outline-none"
            >
                <div className="relative w-full aspect-[4/3] overflow-hidden bg-stone-100">
                    {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={item.imageUrl}
                            alt={caption ?? item.modelTitle ?? ""}
                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[9px] uppercase tracking-[0.4em] font-bold text-stone-300">No image</span>
                        </div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white text-[9px] uppercase tracking-[0.4em] font-bold bg-black/50 px-3 py-1.5">
                            View larger
                        </span>
                    </div>
                </div>
                {(caption || item.modelId) && (
                    <div className="border border-t-0 border-stone-200 px-4 py-3 flex items-start justify-between gap-4">
                        {caption && (
                            <p className="text-[11px] text-stone-600 font-light leading-relaxed">{caption}</p>
                        )}
                        {item.modelId && (
                            <span className="text-[9px] font-mono text-stone-400 flex-shrink-0">
                                {item.modelId}
                            </span>
                        )}
                    </div>
                )}
            </button>
        </div>
    );
}

function ContentArtefact({ item }: { item: DossierItem }) {
    const href = item.artefactSlug ? `/artefacts/${item.artefactSlug}` : null;
    return (
        <div className="border border-stone-200 p-5 space-y-3 rounded-lg">
            <p className="text-[8px] uppercase tracking-[0.5em] font-bold text-stone-500">Artefact</p>
            <h3 className="text-base font-light text-stone-900 leading-snug">
                {item.artefactTitle ?? item.artefactSlug ?? "—"}
            </h3>
            {item.artefactExcerpt && (
                <p className="text-sm font-light text-stone-600 leading-relaxed line-clamp-3">
                    {item.artefactExcerpt}
                </p>
            )}
            {href && (
                <Link
                    href={href}
                    className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.3em] font-bold text-stone-600 hover:text-stone-900 transition-colors border-b border-stone-300 hover:border-stone-900 pb-px"
                    onClick={(e) => e.stopPropagation()}
                >
                    Open artefact <ArrowUpRight size={9} />
                </Link>
            )}
        </div>
    );
}

// ── Image gallery panel ───────────────────────────────────────────────────────

function ImageGallery({
    items,
    initialIdx,
    onClose,
}: {
    items: DossierItem[];
    initialIdx: number;
    onClose: () => void;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [currentIdx, setCurrentIdx] = useState(initialIdx);

    // Scroll to initial image immediately (no animation on open)
    useEffect(() => {
        const el = slideRefs.current[initialIdx];
        if (el && containerRef.current) {
            containerRef.current.scrollTop = el.offsetTop;
        }
    }, [initialIdx]);

    // Track which slide is most visible with IntersectionObserver
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const observer = new IntersectionObserver(
            (entries) => {
                let best: { idx: number; ratio: number } | null = null;
                for (const entry of entries) {
                    const idx = Number(entry.target.getAttribute("data-idx"));
                    if (!best || entry.intersectionRatio > best.ratio) {
                        best = { idx, ratio: entry.intersectionRatio };
                    }
                }
                if (best) setCurrentIdx(best.idx);
            },
            { root: container, threshold: [0, 0.25, 0.5, 0.75, 1] },
        );
        slideRefs.current.forEach((el) => el && observer.observe(el));
        return () => observer.disconnect();
    }, [items]);

    const scrollTo = (idx: number) => {
        slideRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const galleryBtn =
        "flex items-center justify-center w-7 h-7 rounded-md text-stone-400 hover:bg-stone-900 hover:text-white disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-stone-400 transition-colors duration-200";

    return (
        <div className="h-full bg-white p-3">
            <div className="h-full flex flex-col border border-stone-200 rounded-xl overflow-hidden bg-white shadow-sm">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 flex-shrink-0">
                    <p className="text-[9px] uppercase tracking-[0.4em] font-bold text-stone-400">
                        {currentIdx + 1} / {items.length}
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => scrollTo(Math.max(0, currentIdx - 1))}
                            disabled={currentIdx === 0}
                            aria-label="Previous image"
                            className={galleryBtn}
                        >
                            <ChevronUp size={14} />
                        </button>
                        <button
                            onClick={() => scrollTo(Math.min(items.length - 1, currentIdx + 1))}
                            disabled={currentIdx === items.length - 1}
                            aria-label="Next image"
                            className={galleryBtn}
                        >
                            <ChevronDown size={14} />
                        </button>
                        <div className="w-px h-4 bg-stone-200 mx-1" />
                        <button onClick={onClose} aria-label="Close gallery" className={galleryBtn}>
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Filmstrip — each slide is almost full height so next one peeks */}
                <div
                    ref={containerRef}
                    className="flex-1 overflow-y-scroll"
                    style={{ scrollSnapType: "y mandatory" }}
                >
                    {items.map((item, i) => {
                        const caption = item.imageCaption ?? item.caption;
                        return (
                            <div
                                key={item.id}
                                ref={(el) => { slideRefs.current[i] = el; }}
                                data-idx={i}
                                onClick={() => scrollTo(i)}
                                style={{ scrollSnapAlign: "start", height: "calc(100% - 64px)" }}
                                className="flex-shrink-0 flex flex-col cursor-pointer"
                            >
                                {/* Image fills available space */}
                                <div className="flex-1 relative overflow-hidden bg-stone-50">
                                    {item.imageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={item.imageUrl}
                                            alt={caption ?? ""}
                                            className="w-full h-full object-contain"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-[9px] uppercase tracking-[0.4em] font-bold text-stone-300">No image</span>
                                        </div>
                                    )}
                                </div>
                                {/* Caption strip */}
                                <div className="flex-shrink-0 px-4 py-3 border-t border-stone-100 space-y-1 bg-white">
                                    {caption && (
                                        <p className="text-[11px] text-stone-500 font-light leading-relaxed">{caption}</p>
                                    )}
                                    {item.modelId && (
                                        <Link
                                            href={`/models/${item.modelId}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="inline-flex items-center gap-1 text-[9px] font-mono text-stone-400 hover:text-stone-900 transition-colors"
                                        >
                                            Model {item.modelId}
                                            {item.modelTitle ? ` — ${item.modelTitle}` : ""}
                                            <ArrowUpRight size={9} />
                                        </Link>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {/* Bottom spacer so last slide can scroll into snap position */}
                    <div style={{ height: "64px" }} />
                </div>
            </div>
        </div>
    );
}

// ── Main layout ───────────────────────────────────────────────────────────────

export function DossierPageClient({
    dossier,
    related = [],
    prevSlug,
    nextSlug,
}: {
    dossier: DossierData;
    related?: RelatedDossier[];
    prevSlug?: string | null;
    nextSlug?: string | null;
}) {
    const router = useRouter();
    const items = dossier.items ?? [];

    // All image items collected for gallery
    const imageItems = useMemo(
        () => items.filter((i) => i.type === "modelImage" || i.type === "image"),
        [items],
    );

    const [galleryIdx, setGalleryIdx] = useState<number | null>(null);

    const openGallery = useCallback((item: DossierItem) => {
        const idx = imageItems.findIndex((img) => img.id === item.id);
        setGalleryIdx(idx >= 0 ? idx : 0);
    }, [imageItems]);

    const galleryOpen = galleryIdx !== null;

    return (
        <div className="fixed inset-0 flex" style={{ paddingTop: "58px" }}>

            {/* Back button — next to NMA in nav bar */}
            <div className="fixed top-4 left-4 z-[49] flex items-center gap-3 pointer-events-none">
                <div className="px-3 h-[34px] flex items-center justify-center text-2xl font-light tracking-tight opacity-0 select-none">
                    NM<span className="italic">A</span>
                </div>
                <div className="relative group/back pointer-events-auto">
                    <Link
                        href="/dossiers"
                        aria-label="Back to dossiers"
                        className="inline-flex items-center justify-center w-[34px] h-[34px] border border-stone-200 rounded-md bg-white/70 backdrop-blur-xl text-stone-500 hover:bg-stone-900 hover:border-stone-900 hover:text-white transition-colors duration-300"
                    >
                        <ArrowLeft size={13} />
                    </Link>
                    <span className="absolute top-full mt-2 left-0 px-2 py-1 whitespace-nowrap text-[9px] uppercase tracking-[0.25em] font-bold text-stone-900 bg-white/80 backdrop-blur-xl border border-stone-200 rounded pointer-events-none opacity-0 group-hover/back:opacity-100 transition-opacity duration-150">
                        Back to dossiers
                    </span>
                </div>
            </div>

            {/* ── Main content column ── */}
            <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" id="dossier-scroll">
                <div className="w-[60vw] mx-auto py-10 space-y-0">

                    {/* Header card */}
                    <div className="border border-stone-200 rounded-xl p-8 mt-6 mb-10 space-y-5">
                        {dossier.tags && dossier.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {dossier.tags.map((t) => (
                                    <span
                                        key={t}
                                        className="text-[8px] uppercase tracking-[0.35em] font-bold border border-stone-300 rounded-md px-2 py-0.5 text-stone-600"
                                    >
                                        {t}
                                    </span>
                                ))}
                            </div>
                        )}
                        <div>
                            <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-500 mb-2">Dossier</p>
                            <h1 className="text-3xl font-light tracking-tight leading-[1.05]">{dossier.title}</h1>
                        </div>
                        {dossier.intro && (
                            <p className="text-base font-light text-stone-700 leading-relaxed">{dossier.intro}</p>
                        )}
                        {(dossier.author || dossier.publishDate || imageItems.length > 0) && (
                            <div className="flex flex-wrap gap-6 pt-4 border-t border-stone-200">
                                {dossier.author && (
                                    <div>
                                        <p className="text-[8px] uppercase tracking-[0.4em] font-bold text-stone-500 mb-0.5">Author</p>
                                        <p className="text-[11px] text-stone-700">{dossier.author}</p>
                                    </div>
                                )}
                                {dossier.publishDate && (
                                    <div>
                                        <p className="text-[8px] uppercase tracking-[0.4em] font-bold text-stone-500 mb-0.5">Date</p>
                                        <p className="text-[11px] text-stone-700">{dossier.publishDate}</p>
                                    </div>
                                )}
                                {imageItems.length > 0 && (
                                    <div>
                                        <p className="text-[8px] uppercase tracking-[0.4em] font-bold text-stone-500 mb-0.5">Images</p>
                                        <p className="text-[11px] text-stone-700">{imageItems.length}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* All content items — in order */}
                    {items.length === 0 ? (
                        <p className="text-sm font-light text-stone-400 py-8">No content yet.</p>
                    ) : (
                        <div className="space-y-5">
                            {items.map((item) => (
                                <div key={item.id}>
                                    {item.type === "heading"    && <ContentHeading item={item} />}
                                    {item.type === "text"       && <ContentText item={item} />}
                                    {item.type === "quote"      && <ContentQuote item={item} />}
                                    {item.type === "note"       && <ContentNote item={item} />}
                                    {(item.type === "modelImage" || item.type === "image") && <ContentImage item={item} onOpen={() => openGallery(item)} />}
                                    {item.type === "artefact"   && <ContentArtefact item={item} />}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Related dossiers */}
                    {related.length > 0 && (
                        <div className="mt-16 pt-10 border-t border-stone-200 space-y-5">
                            <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-500">Related</p>
                            <div className="grid grid-cols-2 gap-4">
                                {related.slice(0, 4).map((r) => (
                                    <Link
                                        key={r.id}
                                        href={`/dossiers/${r.id}`}
                                        className="group border border-stone-200 hover:border-stone-400 transition-colors duration-200 p-4 space-y-2 rounded-xl"
                                    >
                                        {r.coverImage && (
                                            <div className="relative w-full aspect-video overflow-hidden bg-stone-100 mb-3 rounded-lg">
                                                <Image
                                                    src={r.coverImage}
                                                    alt={r.title ?? ""}
                                                    fill
                                                    className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
                                                    sizes="200px"
                                                />
                                            </div>
                                        )}
                                        <h3 className="text-sm font-light text-stone-900 leading-snug group-hover:text-stone-500 transition-colors">
                                            {r.title}
                                        </h3>
                                        {r.intro && (
                                            <p className="text-[11px] font-light text-stone-500 line-clamp-2">{r.intro}</p>
                                        )}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="h-28" />
                </div>
            </div>

            {/* Bottom-right: prev/next dossier + back to top */}
            <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2">
                {(prevSlug != null || nextSlug != null) && (
                    <>
                        <Link
                            href={prevSlug ? `/dossiers/${prevSlug}` : "#"}
                            aria-label="Previous dossier"
                            className={`flex items-center justify-center w-[34px] h-[34px] rounded-md border bg-white/70 backdrop-blur-xl shadow-sm transition-colors duration-300 ${prevSlug ? "border-stone-200 text-stone-500 hover:bg-stone-900 hover:border-stone-900 hover:text-white" : "border-stone-100 text-stone-300 pointer-events-none"}`}
                        >
                            <ChevronLeft size={13} />
                        </Link>
                        <Link
                            href={nextSlug ? `/dossiers/${nextSlug}` : "#"}
                            aria-label="Next dossier"
                            className={`flex items-center justify-center w-[34px] h-[34px] rounded-md border bg-white/70 backdrop-blur-xl shadow-sm transition-colors duration-300 ${nextSlug ? "border-stone-200 text-stone-500 hover:bg-stone-900 hover:border-stone-900 hover:text-white" : "border-stone-100 text-stone-300 pointer-events-none"}`}
                        >
                            <ChevronRight size={13} />
                        </Link>
                    </>
                )}
                <button
                    onClick={() => document.getElementById("dossier-scroll")?.scrollTo({ top: 0, behavior: "smooth" })}
                    title="Back to top"
                    className="flex items-center justify-center w-[34px] h-[34px] rounded-md border border-stone-200 bg-white/70 backdrop-blur-xl text-stone-500 hover:bg-stone-900 hover:border-stone-900 hover:text-white transition-colors duration-300 shadow-sm"
                >
                    <ArrowUp size={13} />
                </button>
            </div>

            {/* ── Gallery panel — slides in from right when an image is clicked ── */}
            <div
                style={{
                    width: galleryOpen ? "clamp(320px, 38vw, 580px)" : 0,
                    flexShrink: 0,
                    overflow: "hidden",
                    transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
            >
                {galleryOpen && galleryIdx !== null && (
                    <ImageGallery
                        items={imageItems}
                        initialIdx={galleryIdx}
                        onClose={() => setGalleryIdx(null)}
                    />
                )}
            </div>
        </div>
    );
}
