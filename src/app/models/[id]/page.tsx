import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { clean, getHeroImage } from '@/lib/modelUtils';

interface ModelImage {
    url: string;
    importance: 1 | 2 | 3;
    isStarred: boolean;
    caption?: string;
}

interface ModelData {
    id: string;
    isVisible?: boolean;
    modelNumber?: string;
    year?: number;
    title?: string;
    architect?: string;
    scale?: string;
    modelSize?: string;
    materials?: string[];
    tags?: string[];
    photographer?: string;
    notes?: string;
    buildingStatus?: string;
    buildingType?: string;
    modelType?: string;
    location?: string;
    leadMaker?: string;
    voiceNarrative?: string;
    images?: ModelImage[];
    [key: string]: unknown;
}

async function getModel(id: string): Promise<ModelData | null> {
    try {
        const docRef = doc(db, "ma_models", id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return null;
        const data = docSnap.data();
        if (data.isVisible === false) return null;
        return { id: docSnap.id, ...data } as ModelData;
    } catch (error) {
        console.error("Error fetching model:", error);
        return null;
    }
}

// Metadata rows — only render if value is meaningful
function MetaRow({ label, value }: { label: string; value: string | null | undefined }) {
    if (!value) return null;
    return (
        <div>
            <dt className="text-[9px] uppercase tracking-[0.4em] font-bold text-stone-300 mb-1">{label}</dt>
            <dd className="text-sm font-light text-stone-800">{value}</dd>
        </div>
    );
}

export default async function ModelPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const model = await getModel(id);
    if (!model) notFound();

    const heroImage = getHeroImage(model.images);
    const images = model.images || [];
    const title = clean(model.title) || 'Untitled';
    const architect = clean(model.architect);
    const notes = clean(model.notes);
    const materials = (model.materials || []).filter(m => clean(m) !== null);
    const tags = (model.tags || []).filter(t => clean(t) !== null);

    return (
        <main className="min-h-screen bg-white font-sans text-stone-900">

            {/* Nav bar */}
            <nav className="px-8 py-5 border-b border-stone-100 flex justify-between items-center bg-white sticky top-0 z-40">
                <Link
                    href="/archive"
                    className="text-[10px] uppercase tracking-widest font-bold text-stone-400 hover:text-stone-900 transition-colors flex items-center gap-2"
                >
                    ← Collection
                </Link>
                <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-stone-300 font-mono">
                    {model.modelNumber}
                </span>
                <button className="text-[10px] font-bold uppercase tracking-widest border border-stone-200 hover:border-stone-900 transition-colors px-3 py-2">
                    Inquire
                </button>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100vh-57px)]">

                {/* Image column */}
                <div className="bg-stone-50 relative border-r border-stone-100 flex flex-col">
                    {/* Main image */}
                    <div className="flex-1 relative min-h-[60vw] lg:min-h-0">
                        {heroImage ? (
                            <Image
                                src={heroImage}
                                alt={title}
                                fill
                                className="object-contain p-8"
                                sizes="(max-width: 1024px) 100vw, 50vw"
                                priority
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-stone-200 font-bold text-[20vw] lg:text-[12vw] tracking-tighter select-none">
                                {model.modelNumber?.slice(-2) || '—'}
                            </div>
                        )}
                    </div>

                    {/* Thumbnail strip — only if multiple images */}
                    {images.length > 1 && (
                        <div className="flex gap-2 p-4 border-t border-stone-100 overflow-x-auto">
                            {images.map((img, i) => (
                                <div
                                    key={i}
                                    className={`relative w-16 h-16 flex-shrink-0 border ${
                                        img.isStarred ? 'border-stone-900' : 'border-stone-200'
                                    }`}
                                >
                                    <Image
                                        src={img.url}
                                        alt={img.caption || `Photo ${i + 1}`}
                                        fill
                                        className="object-cover"
                                        sizes="64px"
                                    />
                                    {/* Importance dot */}
                                    <div className={`absolute bottom-1 right-1 w-2 h-2 rounded-full ${
                                        img.importance === 1 ? 'bg-stone-900' :
                                        img.importance === 2 ? 'bg-stone-400' : 'bg-stone-200'
                                    }`} />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Photographer credit */}
                    {clean(model.photographer) && (
                        <div className="px-6 pb-4 pt-2 border-t border-stone-100">
                            <p className="text-[9px] uppercase tracking-[0.3em] text-stone-300 font-bold">
                                Photo: {model.photographer}
                            </p>
                        </div>
                    )}
                </div>

                {/* Metadata column */}
                <div className="p-10 md:p-16 overflow-y-auto">
                    {/* Header */}
                    <header className="mb-12">
                        <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-4">
                            {architect && <span>{architect}</span>}
                            {architect && model.year && <span className="w-1 h-px bg-stone-200 inline-block" />}
                            {model.year && <span>{model.year}</span>}
                        </div>
                        <h1 className="text-3xl md:text-5xl font-light tracking-tight leading-tight mb-6">
                            {title}
                        </h1>
                        <div className="h-px w-16 bg-stone-900" />
                    </header>

                    {/* Notes */}
                    {notes && (
                        <div className="mb-12">
                            <p className="text-base font-light text-stone-600 leading-relaxed">
                                {notes}
                            </p>
                        </div>
                    )}

                    {/* Specs grid */}
                    <dl className="grid grid-cols-2 gap-x-8 gap-y-6 mb-12 py-8 border-y border-stone-100">
                        <MetaRow label="Scale" value={clean(model.scale)} />
                        <MetaRow label="Physical size" value={clean(model.modelSize) || clean(model.size as string)} />
                        <MetaRow label="Model type" value={clean(model.modelType)} />
                        <MetaRow label="Building type" value={clean(model.buildingType)} />
                        <MetaRow label="Building status" value={clean(model.buildingStatus)} />
                        <MetaRow label="Location" value={clean(model.location)} />
                        <MetaRow label="Lead maker" value={clean(model.leadMaker)} />
                        <MetaRow label="Provenance" value={clean(model.provenance as string)} />

                        {materials.length > 0 && (
                            <div className="col-span-2">
                                <dt className="text-[9px] uppercase tracking-[0.4em] font-bold text-stone-300 mb-2">Materials</dt>
                                <dd className="flex flex-wrap gap-2">
                                    {materials.map(m => (
                                        <span key={m} className="text-[9px] font-mono bg-stone-100 px-2 py-1 uppercase">
                                            {m}
                                        </span>
                                    ))}
                                </dd>
                            </div>
                        )}
                    </dl>

                    {/* Tags */}
                    {tags.length > 0 && (
                        <div className="mb-10">
                            <p className="text-[9px] uppercase tracking-[0.4em] font-bold text-stone-300 mb-3">Tags</p>
                            <div className="flex flex-wrap gap-2">
                                {tags.map(t => (
                                    <span key={t} className="text-[9px] font-bold uppercase tracking-widest border border-stone-200 px-3 py-1 text-stone-500">
                                        {t}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Audio narrative */}
                    {model.voiceNarrative && (
                        <div className="mb-10 p-6 border-l-2 border-stone-900 bg-stone-50">
                            <p className="text-[9px] uppercase tracking-[0.4em] font-bold text-stone-400 mb-3 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-stone-900 rounded-full animate-pulse inline-block" />
                                Audio Narrative
                            </p>
                            <audio
                                controls
                                src={model.voiceNarrative}
                                className="w-full h-8"
                            />
                        </div>
                    )}

                    {/* Footer */}
                    <footer className="mt-16 pt-8 border-t border-stone-100 text-[9px] font-mono text-stone-200 uppercase tracking-widest">
                        NMA · {model.modelNumber} · {clean(model.buildingStatus) || 'Archival'}
                    </footer>
                </div>
            </div>
        </main>
    );
}
