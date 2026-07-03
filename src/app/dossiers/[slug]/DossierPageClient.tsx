"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Quote as QuoteIcon, StickyNote } from "lucide-react";
import { AdminEditBadge } from "@/components/AdminEditBadge";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DossierItemType = "heading" | "text" | "quote" | "note" | "artefact" | "modelImage";

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
}

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

const LEFT_TYPES: DossierItemType[] = ["heading", "text", "quote", "note"];
const RIGHT_TYPES: DossierItemType[] = ["modelImage", "artefact"];

// ── Left-panel renderers ──────────────────────────────────────────────────────

function LeftHeading({ item }: { item: DossierItem }) {
    return (
        <div className="pt-8 pb-2">
            <div className="w-6 h-px bg-stone-200 mb-5" />
            <h2 className="text-xl font-light uppercase tracking-[0.08em] text-stone-900 leading-snug">
                {item.content}
            </h2>
        </div>
    );
}

function LeftText({
    item,
    onScrollToMedia,
}: {
    item: DossierItem;
    onScrollToMedia?: () => void;
}) {
    return (
        <div className="border border-stone-100 p-6 space-y-4">
            {(item.content ?? "")
                .split(/\n\n+/)
                .filter((p) => p.trim())
                .map((para, i) => (
                    <p key={i} className="text-base font-light text-stone-700 leading-relaxed">
                        {para.trim()}
                    </p>
                ))}
            {onScrollToMedia && (
                <button
                    onClick={onScrollToMedia}
                    className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.3em] font-bold text-stone-300 hover:text-stone-900 transition-colors pt-1"
                >
                    View in gallery <ArrowUpRight size={10} />
                </button>
            )}
        </div>
    );
}

function LeftQuote({ item }: { item: DossierItem }) {
    return (
        <div className="border-l-2 border-stone-300 pl-6 py-1 space-y-3">
            <QuoteIcon size={14} className="text-stone-300" />
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

function LeftNote({ item }: { item: DossierItem }) {
    return (
        <div className="border border-stone-200 bg-stone-50 p-5 flex items-start gap-3">
            <StickyNote size={12} className="text-stone-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-light text-stone-600 leading-relaxed">{item.content}</p>
        </div>
    );
}

// ── Right-panel renderers ─────────────────────────────────────────────────────

function RightImage({
    item,
    highlighted,
}: {
    item: DossierItem;
    highlighted: boolean;
}) {
    return (
        <div
            id={`dossier-right-${item.id}`}
            className={`transition-all duration-300 ${highlighted ? "outline outline-1 outline-stone-400" : ""}`}
        >
            <div className="relative w-full aspect-[4/3] bg-stone-100 overflow-hidden">
                {item.imageUrl ? (
                    <Image
                        src={item.imageUrl}
                        alt={item.imageCaption ?? item.modelTitle ?? ""}
                        fill
                        className="object-cover"
                        sizes="50vw"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[9px] uppercase tracking-[0.4em] font-bold text-stone-300">
                            No image
                        </span>
                    </div>
                )}
            </div>
            <div className="px-5 py-4 border border-t-0 border-stone-100 space-y-1.5">
                {item.imageCaption && (
                    <p className="text-[11px] text-stone-500 font-light">{item.imageCaption}</p>
                )}
                {item.modelId && (
                    <Link
                        href={`/models/${item.modelId}`}
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
}

function RightArtefact({ item }: { item: DossierItem }) {
    const href = item.artefactSlug ? `/artefacts/${item.artefactSlug}` : null;
    return (
        <div id={`dossier-right-${item.id}`} className="border border-stone-100 p-5 space-y-3">
            <p className="text-[8px] uppercase tracking-[0.5em] font-bold text-stone-300">Artefact</p>
            <h3 className="text-base font-light text-stone-900 leading-snug">
                {item.artefactTitle ?? item.artefactSlug ?? "—"}
            </h3>
            {item.artefactExcerpt && (
                <p className="text-sm font-light text-stone-500 leading-relaxed line-clamp-3">
                    {item.artefactExcerpt}
                </p>
            )}
            {href && (
                <Link
                    href={href}
                    className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.3em] font-bold text-stone-400 hover:text-stone-900 transition-colors border-b border-stone-200 hover:border-stone-900 pb-px"
                >
                    Open artefact <ArrowUpRight size={9} />
                </Link>
            )}
        </div>
    );
}

// ── Main layout ───────────────────────────────────────────────────────────────

export function DossierPageClient({
    dossier,
    related = [],
}: {
    dossier: DossierData;
    related?: RelatedDossier[];
}) {
    const router = useRouter();
    const items = dossier.items ?? [];

    const leftItems = useMemo(() => items.filter((i) => LEFT_TYPES.includes(i.type)), [items]);
    const rightItems = useMemo(() => items.filter((i) => RIGHT_TYPES.includes(i.type)), [items]);

    const [activeLeftId, setActiveLeftId] = useState<string | null>(leftItems[0]?.id ?? null);

    const leftPanelRef = useRef<HTMLDivElement>(null);
    const rightPanelRef = useRef<HTMLDivElement>(null);
    const leftItemEls = useRef<Map<string, HTMLDivElement>>(new Map());

    // For each left item, map to the next right item in original sequence (for "View in gallery" links).
    const nextRightFor = useMemo(() => {
        const map = new Map<string, DossierItem>();
        let nextRight: DossierItem | null = null;
        for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];
            if (RIGHT_TYPES.includes(item.type)) nextRight = item;
            else if (nextRight && LEFT_TYPES.includes(item.type)) map.set(item.id, nextRight);
        }
        return map;
    }, [items]);

    // Active right item follows the active left item.
    const activeRightId = useMemo(() => {
        if (!activeLeftId) return null;
        return nextRightFor.get(activeLeftId)?.id ?? null;
    }, [activeLeftId, nextRightFor]);

    // Scroll-track left panel with IntersectionObserver.
    useEffect(() => {
        if (!leftPanelRef.current || leftItems.length === 0) return;
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        const id = entry.target.getAttribute("data-item-id");
                        if (id) setActiveLeftId(id);
                    }
                }
            },
            { root: leftPanelRef.current, rootMargin: "-30% 0% -30% 0%", threshold: 0 },
        );
        leftItemEls.current.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, [leftItems]);

    // Auto-scroll right panel when active item changes.
    useEffect(() => {
        if (!activeRightId) return;
        const el = document.getElementById(`dossier-right-${activeRightId}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, [activeRightId]);

    const scrollToRight = useCallback((item: DossierItem) => {
        const el = document.getElementById(`dossier-right-${item.id}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, []);

    const registerLeftRef = useCallback(
        (id: string) => (el: HTMLDivElement | null) => {
            if (el) leftItemEls.current.set(id, el);
            else leftItemEls.current.delete(id);
        },
        [],
    );

    // Random dossier from related list.
    const handleRandom = useCallback(() => {
        if (related.length === 0) return;
        const pick = related[Math.floor(Math.random() * related.length)];
        router.push(`/dossiers/${pick.id}`);
    }, [related, router]);

    return (
        <div className="fixed inset-0 flex" style={{ paddingTop: "58px" }}>
            <AdminEditBadge href="/admin" />

            {/* ── LEFT — narrative content ── */}
            <div
                ref={leftPanelRef}
                className="w-1/2 overflow-y-auto border-r border-stone-100"
            >
                <div className="max-w-xl mx-auto px-10 py-10 space-y-0">

                    {/* Back nav */}
                    <Link
                        href="/dossiers"
                        className="text-[9px] uppercase tracking-[0.35em] font-bold text-stone-300 hover:text-stone-900 transition-colors mb-10 inline-block"
                    >
                        ← Dossiers
                    </Link>

                    {/* Header card */}
                    <div className="border border-stone-100 p-8 mt-6 mb-10 space-y-5">
                        {dossier.tags && dossier.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {dossier.tags.map((t) => (
                                    <span
                                        key={t}
                                        className="text-[7px] uppercase tracking-[0.4em] font-bold border border-stone-200 px-1.5 py-0.5 text-stone-400"
                                    >
                                        {t}
                                    </span>
                                ))}
                            </div>
                        )}
                        <div>
                            <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-300 mb-2">
                                Dossier
                            </p>
                            <h1 className="text-3xl font-light tracking-tight leading-[1.05]">
                                {dossier.title}
                            </h1>
                        </div>
                        {dossier.intro && (
                            <p className="text-base font-light text-stone-500 leading-relaxed">
                                {dossier.intro}
                            </p>
                        )}
                        {/* Metadata row */}
                        {(dossier.author || rightItems.length > 0) && (
                            <div className="flex flex-wrap gap-6 pt-4 border-t border-stone-100">
                                {dossier.author && (
                                    <div>
                                        <p className="text-[8px] uppercase tracking-[0.4em] font-bold text-stone-300 mb-0.5">
                                            Author
                                        </p>
                                        <p className="text-[11px] text-stone-600">{dossier.author}</p>
                                    </div>
                                )}
                                {dossier.publishDate && (
                                    <div>
                                        <p className="text-[8px] uppercase tracking-[0.4em] font-bold text-stone-300 mb-0.5">
                                            Date
                                        </p>
                                        <p className="text-[11px] text-stone-600">{dossier.publishDate}</p>
                                    </div>
                                )}
                                {rightItems.length > 0 && (
                                    <div>
                                        <p className="text-[8px] uppercase tracking-[0.4em] font-bold text-stone-300 mb-0.5">
                                            Media
                                        </p>
                                        <p className="text-[11px] text-stone-600">
                                            {rightItems.length} item{rightItems.length !== 1 ? "s" : ""}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Content items */}
                    {leftItems.length === 0 ? (
                        <p className="text-sm font-light text-stone-300 py-8">No content yet.</p>
                    ) : (
                        <div className="space-y-5">
                            {leftItems.map((item) => {
                                const linked = nextRightFor.get(item.id);
                                return (
                                    <div
                                        key={item.id}
                                        ref={registerLeftRef(item.id)}
                                        data-item-id={item.id}
                                    >
                                        {item.type === "heading" && <LeftHeading item={item} />}
                                        {item.type === "text" && (
                                            <LeftText
                                                item={item}
                                                onScrollToMedia={linked ? () => scrollToRight(linked) : undefined}
                                            />
                                        )}
                                        {item.type === "quote" && <LeftQuote item={item} />}
                                        {item.type === "note" && <LeftNote item={item} />}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Related dossiers */}
                    {related.length > 0 && (
                        <div className="mt-16 pt-10 border-t border-stone-100 space-y-5">
                            <div className="flex items-center justify-between">
                                <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-300">
                                    Related
                                </p>
                                <button
                                    onClick={handleRandom}
                                    className="text-[9px] uppercase tracking-[0.3em] font-bold text-stone-300 hover:text-stone-900 transition-colors"
                                >
                                    Random →
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {related.slice(0, 4).map((r) => (
                                    <Link
                                        key={r.id}
                                        href={`/dossiers/${r.id}`}
                                        className="group border border-stone-100 hover:border-stone-300 transition-colors duration-200 p-4 space-y-2"
                                    >
                                        {r.coverImage && (
                                            <div className="relative w-full aspect-video overflow-hidden bg-stone-50 mb-3">
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
                                            <p className="text-[11px] font-light text-stone-400 line-clamp-2">
                                                {r.intro}
                                            </p>
                                        )}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="h-20" />
                </div>
            </div>

            {/* ── RIGHT — media gallery ── */}
            <div ref={rightPanelRef} className="flex-1 overflow-y-auto bg-stone-50/50">
                {rightItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3">
                        <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-300">
                            No media attached
                        </p>
                        <p className="text-[11px] text-stone-400 font-light">
                            Add images or artefacts to this dossier in the CMS.
                        </p>
                    </div>
                ) : (
                    <div className="p-4 space-y-4">
                        <p className="text-[8px] uppercase tracking-[0.5em] font-bold text-stone-300 px-1 pt-1">
                            {rightItems.length} item{rightItems.length !== 1 ? "s" : ""}
                        </p>
                        {rightItems.map((item) => (
                            <div key={item.id}>
                                {item.type === "modelImage" && (
                                    <RightImage
                                        item={item}
                                        highlighted={item.id === activeRightId}
                                    />
                                )}
                                {item.type === "artefact" && <RightArtefact item={item} />}
                            </div>
                        ))}
                        <div className="h-10" />
                    </div>
                )}
            </div>
        </div>
    );
}
