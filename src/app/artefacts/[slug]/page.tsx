import React from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowLeft, ChevronLeft, ChevronRight, Shuffle } from "lucide-react";

export const dynamic = "force-dynamic";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ArtefactData {
    id: string;
    slug?: string;
    type?: string;
    title?: string;
    imageUrl?: string;
    heroImage?: string;
    images?: { url: string; caption?: string }[];
    audioUrl?: string;
    content?: string;
    excerpt?: string;
    tags?: string[];
    modelId?: string;
    modelNumber?: string;
    photographer?: string;
    usedInDossiers?: string[];
    isVisible?: boolean;
}

interface ModelRef {
    id: string;
    title?: string;
    modelNumber?: string;
    architect?: string;
}

interface DossierRef {
    id: string;
    slug?: string;
    title?: string;
}

// ── Data fetching ─────────────────────────────────────────────────────────────

async function getArtefact(slug: string): Promise<ArtefactData | null> {
    try {
        const snap = await getDoc(doc(db, "ma_artefacts", slug));
        if (!snap.exists()) return null;
        const data = snap.data();
        if (data.isVisible === false) return null;
        return JSON.parse(JSON.stringify({ id: snap.id, ...data })) as ArtefactData;
    } catch {
        return null;
    }
}

async function getModel(modelId: string): Promise<ModelRef | null> {
    try {
        const snap = await getDoc(doc(db, "ma_models", modelId));
        if (!snap.exists()) return null;
        const d = snap.data();
        return { id: snap.id, title: d.title, modelNumber: d.modelNumber, architect: d.architect };
    } catch {
        return null;
    }
}

async function getDossiersReferencingArtefact(artefactSlug: string): Promise<DossierRef[]> {
    try {
        const snap = await getDocs(
            query(collection(db, "ma_dossiers"), where("isVisible", "==", true)),
        );
        const refs: DossierRef[] = [];
        snap.docs.forEach((d) => {
            const data = d.data();
            const items: { type?: string; artefactSlug?: string }[] = data.items ?? [];
            const mentions = items.some(
                (item) => item.type === "artefact" && item.artefactSlug === artefactSlug,
            );
            if (mentions) {
                refs.push({ id: d.id, slug: data.slug || d.id, title: data.title });
            }
        });
        return refs;
    } catch {
        return [];
    }
}

async function getAllArtefactSlugs(): Promise<string[]> {
    try {
        const snap = await getDocs(
            query(collection(db, "ma_artefacts"), where("isVisible", "==", true), orderBy("__name__")),
        );
        return snap.docs.map((d) => d.id);
    } catch {
        return [];
    }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ArtefactPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;

    const [artefact, dossiers, allSlugs] = await Promise.all([
        getArtefact(slug),
        getDossiersReferencingArtefact(slug),
        getAllArtefactSlugs(),
    ]);

    if (!artefact) notFound();

    const model = artefact.modelId ? await getModel(artefact.modelId) : null;

    const imageUrl = artefact.imageUrl || artefact.heroImage || artefact.images?.[0]?.url;
    const hasAudio = !!artefact.audioUrl;
    const hasText = !!(artefact.content && !imageUrl);

    // prev / next / random
    const currentIdx = allSlugs.indexOf(slug);
    const prevSlug = currentIdx > 0 ? allSlugs[currentIdx - 1] : null;
    const nextSlug = currentIdx >= 0 && currentIdx < allSlugs.length - 1 ? allSlugs[currentIdx + 1] : null;
    const otherSlugs = allSlugs.filter((s) => s !== slug);
    const randomSlug = otherSlugs.length > 0
        ? otherSlugs[Math.floor(Math.random() * otherSlugs.length)]
        : null;

    const navBtn = "flex items-center justify-center w-[34px] h-[34px] bg-white border border-stone-300 rounded-md hover:border-stone-900 hover:text-stone-900 transition-colors text-stone-500 cursor-pointer";
    const pill = "flex items-center gap-1.5 h-[34px] px-3 bg-white border border-stone-300 rounded-md hover:border-stone-900 hover:text-stone-900 transition-colors text-stone-500 text-[8px] uppercase tracking-[0.35em] font-bold cursor-pointer";

    return (
        <main className="min-h-screen bg-white text-stone-900 flex flex-col">

            {/* Back button — next to NMA */}
            <div className="fixed top-4 left-4 z-[49] flex items-center gap-2 pointer-events-none">
                <div className="h-[34px] px-3 text-[10px] font-bold uppercase tracking-[0.4em] opacity-0 select-none">NMA</div>
                <div className="relative group/back pointer-events-auto">
                    <Link
                        href="/artefacts"
                        aria-label="Back to artefacts"
                        className="inline-flex items-center justify-center w-[34px] h-[34px] border border-stone-200 rounded-md bg-white/70 backdrop-blur-xl text-stone-500 hover:bg-stone-900 hover:border-stone-900 hover:text-white transition-colors duration-300"
                    >
                        <ArrowLeft size={13} />
                    </Link>
                    <span className="absolute top-full mt-2 left-0 px-2 py-1 whitespace-nowrap text-[9px] uppercase tracking-[0.25em] font-bold text-stone-900 bg-white/80 backdrop-blur-xl border border-stone-200 rounded pointer-events-none opacity-0 group-hover/back:opacity-100 transition-opacity duration-150">
                        Back to artefacts
                    </span>
                </div>
            </div>

            {/* Bottom-right: random + prev/next */}
            <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2">
                {randomSlug && (
                    <Link href={`/artefacts/${randomSlug}`} className={pill}>
                        <Shuffle size={11} />
                        Random
                    </Link>
                )}
                {(prevSlug || nextSlug) && (
                    <div className="flex items-center gap-1">
                        <Link href={prevSlug ? `/artefacts/${prevSlug}` : "#"} aria-label="Previous artefact"
                            className={`${navBtn} ${!prevSlug ? "opacity-30 pointer-events-none" : ""}`}>
                            <ChevronLeft size={15} />
                        </Link>
                        <Link href={nextSlug ? `/artefacts/${nextSlug}` : "#"} aria-label="Next artefact"
                            className={`${navBtn} ${!nextSlug ? "opacity-30 pointer-events-none" : ""}`}>
                            <ChevronRight size={15} />
                        </Link>
                    </div>
                )}
            </div>

            {/* ── Full-screen artefact display ── */}
            <div className="flex-1 relative">
                {imageUrl && (
                    <div className="flex items-center justify-center h-[calc(100vh-58px)] bg-white px-8">
                        <Image
                            src={imageUrl}
                            alt={artefact.title ?? ""}
                            width={1600}
                            height={1200}
                            className="max-w-[60vw] max-h-[80vh] w-auto h-auto object-contain"
                            sizes="60vw"
                            priority
                        />
                    </div>
                )}

                {hasAudio && !imageUrl && (
                    <div className="flex items-center justify-center h-[calc(100vh-58px)] bg-white">
                        <div className="max-w-lg w-full px-8 space-y-8">
                            <h1 className="text-4xl font-light tracking-tight leading-[1.05]">
                                {artefact.title}
                            </h1>
                            <audio
                                src={artefact.audioUrl}
                                controls
                                className="w-full"
                                style={{ colorScheme: "light" }}
                            />
                        </div>
                    </div>
                )}

                {hasText && (
                    <div className="flex items-start justify-center min-h-[calc(100vh-58px)] pt-24 pb-16 px-8">
                        <div className="max-w-2xl w-full space-y-8">
                            <h1 className="text-5xl font-light tracking-tight leading-[1.05]">
                                {artefact.title}
                            </h1>
                            {artefact.excerpt && (
                                <p className="text-xl font-light text-stone-500 leading-relaxed">
                                    {artefact.excerpt}
                                </p>
                            )}
                            <div className="space-y-5 pt-4">
                                {artefact.content!
                                    .split(/\n\n+/)
                                    .filter((p) => p.trim())
                                    .map((para, i) => (
                                        <p key={i} className="text-base font-light text-stone-700 leading-relaxed">
                                            {para.trim()}
                                        </p>
                                    ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Info strip ── */}
            <div className="border-t border-stone-200 bg-white">
                <div className="mx-auto px-8 py-8 flex flex-col gap-8" style={{ width: "60%" }}>

                    {/* Part of */}
                    <div>
                        <p className="text-[8px] uppercase tracking-[0.45em] font-bold text-stone-400 mb-3">
                            Part of
                        </p>
                        {model ? (
                            <Link
                                href={`/models/${model.id}`}
                                className="group flex items-baseline gap-3"
                            >
                                <span className="font-mono text-[11px] text-stone-400 group-hover:text-stone-700 transition-colors">
                                    {model.modelNumber ?? model.id}
                                </span>
                                <span className="text-lg font-light text-stone-900 group-hover:text-stone-600 transition-colors leading-snug">
                                    {model.title ?? "Untitled model"}
                                </span>
                                {model.architect && (
                                    <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-stone-400 group-hover:text-stone-600 transition-colors hidden sm:inline">
                                        {model.architect}
                                    </span>
                                )}
                                <span className="text-stone-400 group-hover:text-stone-900 transition-colors text-sm ml-auto">→</span>
                            </Link>
                        ) : (
                            <p className="text-sm font-light text-stone-400">—</p>
                        )}
                    </div>

                    {/* Mentioned in dossier */}
                    <div>
                        <p className="text-[8px] uppercase tracking-[0.45em] font-bold text-stone-400 mb-3">
                            Mentioned in dossier
                        </p>
                        {dossiers.length > 0 ? (
                            <div className="flex flex-col gap-2">
                                {dossiers.map((d) => (
                                    <Link
                                        key={d.id}
                                        href={`/dossiers/${d.slug || d.id}`}
                                        className="text-base font-light text-stone-900 hover:text-stone-500 underline underline-offset-4 decoration-stone-300 hover:decoration-stone-500 transition-colors"
                                    >
                                        {d.title ?? d.id}
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm font-light text-stone-400">—</p>
                        )}
                    </div>

                    {/* Photographer credit */}
                    {artefact.photographer && (
                        <div className="pt-2 border-t border-stone-100">
                            <span className="text-[9px] font-light text-stone-400">
                                Photo: {artefact.photographer}
                            </span>
                        </div>
                    )}

                </div>
            </div>
        </main>
    );
}
