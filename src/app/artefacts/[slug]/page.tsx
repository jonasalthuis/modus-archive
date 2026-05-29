import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ArtefactData {
    id: string;
    slug?: string;
    title?: string;
    author?: string;
    publishDate?: string;
    heroImage?: string;
    excerpt?: string;
    content?: string;
    tags?: string[];
}

async function getArtefact(slug: string): Promise<ArtefactData | null> {
    try {
        const snap = await getDocs(
            query(
                collection(db, 'ma_articles'),
                where('slug', '==', slug),
                where('isVisible', '==', true),
                limit(1),
            )
        );
        if (snap.empty) return null;
        const d = snap.docs[0];
        return { id: d.id, ...d.data() } as ArtefactData;
    } catch (e) {
        console.error('Artefact fetch error', e);
        return null;
    }
}

function formatDate(dateStr: string | undefined): string | null {
    if (!dateStr) return null;
    try {
        return new Date(dateStr).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'long', year: 'numeric',
        });
    } catch {
        return dateStr;
    }
}

// Render markdown-like content as paragraphs
function renderContent(content: string | undefined): React.ReactNode {
    if (!content) return null;
    return content
        .split(/\n\n+/)
        .filter(p => p.trim())
        .map((para, i) => (
            <p key={i} className="text-base font-light text-stone-700 leading-relaxed mb-6">
                {para.trim()}
            </p>
        ));
}

export default async function ArtefactPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const artefact = await getArtefact(slug);

    if (!artefact) notFound();

    const date = formatDate(artefact.publishDate);

    return (
        <main className="min-h-screen bg-white font-sans text-stone-900">
            {/* Nav */}
            <nav className="px-8 py-5 border-b border-stone-100 flex items-center gap-4 bg-white sticky top-0 z-40">
                <Link
                    href="/artefacts"
                    className="text-[10px] uppercase tracking-widest font-bold text-stone-400 hover:text-stone-900 transition-colors flex items-center gap-2"
                >
                    ← Artefacts
                </Link>
            </nav>

            {/* Hero image */}
            {artefact.heroImage && (
                <div className="relative w-full h-[50vh] bg-stone-100">
                    <Image
                        src={artefact.heroImage}
                        alt={artefact.title || ''}
                        fill
                        className="object-cover"
                        sizes="100vw"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-white/60 to-transparent" />
                </div>
            )}

            <article className="max-w-2xl mx-auto px-8 py-16">
                {/* Header */}
                <header className="mb-12 border-b border-stone-100 pb-12">
                    {/* Tags */}
                    {artefact.tags && artefact.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-6">
                            {artefact.tags.map(t => (
                                <span
                                    key={t}
                                    className="text-[8px] uppercase tracking-[0.4em] font-bold border border-stone-200 px-2 py-1 text-stone-400"
                                >
                                    {t}
                                </span>
                            ))}
                        </div>
                    )}

                    <h1 className="text-4xl md:text-5xl font-light tracking-tight leading-[1.05] mb-8">
                        {artefact.title}
                    </h1>

                    {/* Byline */}
                    <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] font-bold text-stone-400">
                        {artefact.author && <span>{artefact.author}</span>}
                        {artefact.author && date && <span className="w-1 h-px bg-stone-200 inline-block" />}
                        {date && <span className="font-mono normal-case tracking-normal">{date}</span>}
                    </div>

                    {/* Excerpt */}
                    {artefact.excerpt && (
                        <p className="mt-6 text-lg font-light text-stone-500 leading-relaxed italic">
                            {artefact.excerpt}
                        </p>
                    )}
                </header>

                {/* Body */}
                <div className="prose-artefact">
                    {renderContent(artefact.content)}
                </div>

                {/* Footer */}
                <footer className="mt-20 pt-8 border-t border-stone-100">
                    <div className="flex items-center justify-between">
                        <Link
                            href="/artefacts"
                            className="text-[9px] uppercase tracking-[0.3em] font-bold text-stone-400 hover:text-stone-900 transition-colors"
                        >
                            ← All artefacts
                        </Link>
                        <span className="text-[9px] font-mono text-stone-200 uppercase tracking-widest">
                            NMA · Artefact
                        </span>
                    </div>
                </footer>
            </article>
        </main>
    );
}
