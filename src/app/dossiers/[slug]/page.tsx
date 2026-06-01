import React from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { DossierItem } from "@/cms/views/DossierEditor";

interface DossierData {
    id: string;
    slug?: string;
    title?: string;
    intro?: string;
    coverImage?: string;
    tags?: string[];
    items?: DossierItem[];
    isVisible?: boolean;
}

async function getDossier(slug: string): Promise<DossierData | null> {
    try {
        // The slug is the document ID — fetch it directly
        const snap = await getDoc(doc(db, "ma_dossiers", slug));
        if (!snap.exists()) return null;
        const data = snap.data();
        if (data.isVisible === false) return null;
        return { id: snap.id, ...data } as DossierData;
    } catch (e) {
        console.error("Dossier fetch error", e);
        return null;
    }
}

// ── Item renderers ────────────────────────────────────────────────────────────

function HeadingItem({ item }: { item: DossierItem }) {
    return (
        <h2 className="text-2xl font-light uppercase tracking-[0.1em] text-stone-900 border-b border-stone-200 pb-4 pt-4">
            {item.content}
        </h2>
    );
}

function TextItem({ item }: { item: DossierItem }) {
    if (!item.content) return null;
    return (
        <div className="space-y-4">
            {item.content
                .split(/\n\n+/)
                .filter((p) => p.trim())
                .map((para, i) => (
                    <p key={i} className="text-base font-light text-stone-700 leading-relaxed">
                        {para.trim()}
                    </p>
                ))}
        </div>
    );
}

function ArtefactItem({ item }: { item: DossierItem }) {
    const href = item.artefactSlug ? `/artefacts/${item.artefactSlug}` : null;
    const Inner = (
        <div
            className={`border border-stone-200 p-6 transition-colors ${href ? "hover:border-stone-900 cursor-pointer" : ""}`}
        >
            <p className="text-[8px] uppercase tracking-[0.5em] font-bold text-stone-300 mb-3">Artefact</p>
            <h3 className="text-xl font-light mb-2">{item.artefactTitle || item.artefactSlug || "—"}</h3>
            {item.artefactExcerpt && (
                <p className="text-sm font-light text-stone-500 leading-relaxed mb-4">{item.artefactExcerpt}</p>
            )}
            {href && (
                <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-stone-500">Read artefact →</span>
            )}
        </div>
    );
    return href ? <Link href={href}>{Inner}</Link> : Inner;
}

function ModelImageItem({ item }: { item: DossierItem }) {
    return (
        <figure className="space-y-2">
            {item.imageUrl ? (
                <div className="relative w-full aspect-[4/3] bg-stone-50">
                    <Image
                        src={item.imageUrl}
                        alt={item.imageCaption || (item.modelTitle ? `${item.modelTitle}` : "Model photograph")}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 700px"
                    />
                </div>
            ) : (
                <div className="w-full h-56 bg-stone-50 border border-stone-200 flex items-center justify-center">
                    <span className="text-[9px] uppercase tracking-[0.4em] font-bold text-stone-200">
                        Model {item.modelId || "photograph"}
                    </span>
                </div>
            )}
            <figcaption className="space-y-1">
                {item.imageCaption && <p className="text-[11px] text-stone-400 font-light">{item.imageCaption}</p>}
                {item.modelId && (
                    <Link
                        href={`/models/${item.modelId}`}
                        className="text-[9px] font-mono text-stone-300 hover:text-stone-700 transition-colors"
                    >
                        ↗ Model {item.modelId}
                        {item.modelTitle ? ` — ${item.modelTitle}` : ""}
                    </Link>
                )}
            </figcaption>
        </figure>
    );
}

function DossierItemRenderer({ item }: { item: DossierItem }) {
    switch (item.type) {
        case "heading":
            return <HeadingItem item={item} />;
        case "text":
            return <TextItem item={item} />;
        case "artefact":
            return <ArtefactItem item={item} />;
        case "modelImage":
            return <ModelImageItem item={item} />;
        default:
            return null;
    }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DossierPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const dossier = await getDossier(slug);

    if (!dossier) notFound();

    const items = dossier.items || [];

    return (
        <main className="min-h-screen bg-white font-sans text-stone-900">
            {/* Nav */}
            <nav className="px-8 py-5 border-b border-stone-200 flex items-center gap-4 bg-white sticky top-0 z-40">
                <Link
                    href="/dossiers"
                    className="text-[10px] uppercase tracking-widest font-bold text-stone-400 hover:text-stone-900 transition-colors flex items-center gap-2"
                >
                    ← Dossiers
                </Link>
            </nav>

            {/* Cover image */}
            {dossier.coverImage && (
                <div className="relative w-full h-[55vh] bg-stone-100">
                    <Image
                        src={dossier.coverImage}
                        alt={dossier.title || ""}
                        fill
                        className="object-cover"
                        sizes="100vw"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-white/40 to-transparent" />
                </div>
            )}

            <div className="max-w-2xl mx-auto px-8 py-16">
                {/* Dossier header */}
                <header className="mb-16 border-b border-stone-200 pb-12">
                    {/* Tags */}
                    {dossier.tags && dossier.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-6">
                            {dossier.tags.map((t) => (
                                <span
                                    key={t}
                                    className="text-[8px] uppercase tracking-[0.4em] font-bold border border-stone-200 px-2 py-1 text-stone-400"
                                >
                                    {t}
                                </span>
                            ))}
                        </div>
                    )}

                    <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-300 mb-4">Dossier</p>
                    <h1 className="text-4xl md:text-5xl font-light tracking-tight leading-[1.05] mb-6">
                        {dossier.title}
                    </h1>

                    {dossier.intro && (
                        <p className="text-lg font-light text-stone-600 leading-relaxed max-w-xl">{dossier.intro}</p>
                    )}
                </header>

                {/* Items */}
                {items.length === 0 ? (
                    <p className="text-sm font-light text-stone-300 text-center py-16">
                        This dossier has no content yet.
                    </p>
                ) : (
                    <div className="space-y-12">
                        {items.map((item) => (
                            <div key={item.id}>
                                <DossierItemRenderer item={item} />
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer */}
                <footer className="mt-24 pt-8 border-t border-stone-200">
                    <div className="flex items-center justify-between">
                        <Link
                            href="/dossiers"
                            className="text-[9px] uppercase tracking-[0.3em] font-bold text-stone-400 hover:text-stone-900 transition-colors"
                        >
                            ← All dossiers
                        </Link>
                        <span className="text-[9px] font-mono text-stone-200 uppercase tracking-widest">
                            NMA · Dossier
                        </span>
                    </div>
                </footer>
            </div>
        </main>
    );
}
