import React from "react";
import Link from "next/link";
import Image from "next/image";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Dossier {
    id: string;
    slug?: string;
    title?: string;
    intro?: string;
    coverImage?: string;
    tags?: string[];
    items?: unknown[];
}

async function getDossiers(): Promise<Dossier[]> {
    try {
        const snap = await getDocs(query(collection(db, "ma_dossiers"), where("isVisible", "==", true)));
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Dossier);
    } catch {
        return [];
    }
}

export default async function DossiersPage() {
    const dossiers = await getDossiers();

    return (
        <main className="min-h-screen bg-white font-sans text-stone-900">
            {/* Nav */}
            <nav className="px-8 py-5 border-b border-stone-200 flex justify-between items-center bg-white sticky top-0 z-40">
                <Link
                    href="/"
                    className="text-[10px] uppercase tracking-widest font-bold text-stone-400 hover:text-stone-900 transition-colors"
                >
                    ← NMA
                </Link>
                <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-stone-300">Dossiers</span>
                <div className="w-16" />
            </nav>

            <div className="max-w-5xl mx-auto px-8 py-20">
                {/* Header */}
                <div className="mb-16 border-b border-stone-200 pb-12">
                    <h1 className="text-5xl font-light tracking-tight leading-[1.05] mb-4">Dossiers</h1>
                    <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-stone-300">
                        Network Modelmakers Archive — Thematic collections
                    </p>
                </div>

                {dossiers.length === 0 ? (
                    <div className="py-20 text-center">
                        <p className="text-[10px] uppercase tracking-[0.5em] font-bold text-stone-300">
                            No dossiers published yet
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {dossiers.map((d) => {
                            const href = `/dossiers/${d.slug || d.id}`;
                            const itemCount = Array.isArray(d.items) ? d.items.length : 0;
                            return (
                                <Link
                                    key={d.id}
                                    href={href}
                                    className="group border border-stone-200 hover:border-stone-900 transition-all duration-300 block"
                                >
                                    {/* Cover image */}
                                    {d.coverImage ? (
                                        <div className="relative h-52 bg-stone-100 overflow-hidden">
                                            <Image
                                                src={d.coverImage}
                                                alt={d.title || ""}
                                                fill
                                                className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
                                                sizes="(max-width: 768px) 100vw, 50vw"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-52 bg-stone-50 flex items-center justify-center border-b border-stone-200">
                                            <span className="text-[8px] uppercase tracking-[0.6em] font-bold text-stone-200">
                                                Dossier
                                            </span>
                                        </div>
                                    )}

                                    <div className="p-6 space-y-3">
                                        {/* Tags */}
                                        {d.tags && d.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {d.tags.slice(0, 3).map((t) => (
                                                    <span
                                                        key={t}
                                                        className="text-[7px] uppercase tracking-[0.4em] font-bold border border-stone-200 px-1.5 py-0.5 text-stone-400"
                                                    >
                                                        {t}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        <h2 className="text-xl font-light leading-snug group-hover:text-stone-600 transition-colors">
                                            {d.title || "—"}
                                        </h2>

                                        {d.intro && (
                                            <p className="text-sm font-light text-stone-500 leading-relaxed line-clamp-3">
                                                {d.intro}
                                            </p>
                                        )}

                                        <div className="flex items-center justify-between pt-2">
                                            <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-stone-400 group-hover:text-stone-900 transition-colors">
                                                Open dossier →
                                            </span>
                                            {itemCount > 0 && (
                                                <span className="text-[9px] font-mono text-stone-300">
                                                    {itemCount} item{itemCount !== 1 ? "s" : ""}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}
