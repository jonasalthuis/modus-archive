import React from 'react';
import Link from 'next/link';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Artefact {
    id: string;
    slug?: string;
    title?: string;
    author?: string;
    publishDate?: string;
    excerpt?: string;
    tags?: string[];
    heroImage?: string;
}

async function getArtefacts(): Promise<Artefact[]> {
    try {
        const snap = await getDocs(
            query(
                collection(db, 'ma_articles'),
                where('isVisible', '==', true),
                orderBy('publishDate', 'desc'),
            )
        );
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Artefact));
    } catch {
        // Index may not exist — fall back to unordered
        try {
            const snap = await getDocs(
                query(collection(db, 'ma_articles'), where('isVisible', '==', true))
            );
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as Artefact));
        } catch {
            return [];
        }
    }
}

function formatDate(dateStr: string | undefined): string | null {
    if (!dateStr) return null;
    try {
        return new Date(dateStr).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
        });
    } catch {
        return dateStr;
    }
}

export default async function ArtefactsPage() {
    const artefacts = await getArtefacts();

    return (
        <main className="min-h-screen bg-white font-sans text-stone-900">
            {/* Nav */}
            <nav className="px-8 py-5 border-b border-stone-100 flex justify-between items-center bg-white sticky top-0 z-40">
                <Link
                    href="/"
                    className="text-[10px] uppercase tracking-widest font-bold text-stone-400 hover:text-stone-900 transition-colors"
                >
                    ← NMA
                </Link>
                <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-stone-300">
                    Artefacts
                </span>
                <div className="w-16" />
            </nav>

            <div className="max-w-4xl mx-auto px-8 py-20">
                {/* Header */}
                <div className="mb-16 border-b border-stone-100 pb-12">
                    <h1 className="text-5xl font-light tracking-tight leading-[1.05] mb-4">
                        Artefacts
                    </h1>
                    <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-stone-300">
                        Network Modelmakers Archive — Texts &amp; documents
                    </p>
                </div>

                {/* List */}
                {artefacts.length === 0 ? (
                    <div className="py-20 text-center">
                        <p className="text-[10px] uppercase tracking-[0.5em] font-bold text-stone-300">
                            No artefacts published yet
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-stone-100">
                        {artefacts.map(a => {
                            const href = `/artefacts/${a.slug || a.id}`;
                            const date = formatDate(a.publishDate);
                            return (
                                <article key={a.id} className="py-10 group">
                                    {/* Meta row */}
                                    <div className="flex items-center gap-4 mb-4">
                                        {date && (
                                            <span className="text-[9px] font-mono text-stone-300 uppercase tracking-widest">
                                                {date}
                                            </span>
                                        )}
                                        {a.author && (
                                            <>
                                                <span className="w-1 h-px bg-stone-200 inline-block" />
                                                <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-stone-400">
                                                    {a.author}
                                                </span>
                                            </>
                                        )}
                                        {a.tags && a.tags.length > 0 && (
                                            <>
                                                <span className="w-1 h-px bg-stone-200 inline-block" />
                                                <div className="flex gap-2 flex-wrap">
                                                    {a.tags.slice(0, 3).map(t => (
                                                        <span key={t} className="text-[8px] uppercase tracking-[0.3em] font-bold border border-stone-200 px-2 py-0.5 text-stone-400">
                                                            {t}
                                                        </span>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <h2 className="text-3xl font-light tracking-tight leading-snug mb-4">
                                        <Link
                                            href={href}
                                            className="hover:text-stone-500 transition-colors"
                                        >
                                            {a.title || '—'}
                                        </Link>
                                    </h2>

                                    {a.excerpt && (
                                        <p className="text-base font-light text-stone-500 leading-relaxed mb-5 max-w-2xl">
                                            {a.excerpt}
                                        </p>
                                    )}

                                    <Link
                                        href={href}
                                        className="text-[9px] uppercase tracking-[0.3em] font-bold text-stone-400 hover:text-stone-900 transition-colors"
                                    >
                                        Read artefact →
                                    </Link>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}
