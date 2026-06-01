"use client";

import React, { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import Image from "next/image";
import { clean, getHeroImage } from "@/lib/modelUtils";

interface ModelImage {
    url: string;
    importance: 1 | 2 | 3;
    isStarred: boolean;
    caption?: string;
}

interface ModelRecord {
    id: string;
    modelNumber?: string;
    title?: string;
    architect?: string;
    year?: number;
    scale?: string;
    modelType?: string;
    buildingType?: string;
    isVisible?: boolean;
    inPrototype?: boolean;
    images?: ModelImage[];
    tags?: string[];
    gridSize?: string;
    [key: string]: unknown;
}

export default function ArchivePage() {
    const [models, setModels] = useState<ModelRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [activeFilter, setActiveFilter] = useState("All");

    useEffect(() => {
        async function fetchModels() {
            setLoading(true);
            try {
                const q = query(collection(db, "ma_models"), orderBy("modelNumber", "asc"));
                const snapshot = await getDocs(q);
                const results = snapshot.docs
                    .map((doc) => ({ id: doc.id, ...doc.data() }) as ModelRecord)
                    // Show only models marked for the prototype
                    .filter((m) => m.inPrototype === true);
                setModels(results);
            } catch (error) {
                console.error("Failed to fetch archive:", error);
            }
            setLoading(false);
        }
        fetchModels();
    }, []);

    const filteredModels = models.filter((model) => {
        const term = search.toLowerCase();
        const matchesSearch =
            (model.title?.toLowerCase() || "").includes(term) ||
            (model.architect?.toLowerCase() || "").includes(term) ||
            (model.modelNumber?.toLowerCase() || "").includes(term);

        const category = clean(model.modelType) || clean(model.buildingType as string) || null;
        const matchesFilter = activeFilter === "All" || category === activeFilter;

        return matchesSearch && matchesFilter;
    });

    // Build filter list from clean, non-null modelType values
    const categories = [
        "All",
        ...Array.from(
            new Set(
                models
                    .map((m) => clean(m.modelType) || clean(m.buildingType as string))
                    .filter((v): v is string => v !== null),
            ),
        ).sort(),
    ];

    return (
        <main className="min-h-screen bg-white font-sans text-stone-900 selection:bg-stone-900 selection:text-white">
            {/* Sticky header */}
            <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-stone-200 px-8 py-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <input
                        type="text"
                        placeholder="Search by title, architect, or model number..."
                        className="w-full md:w-[380px] bg-stone-50 border border-stone-200 focus:border-stone-900 rounded-none py-3 px-5 text-[10px] uppercase tracking-[0.2em] transition-all outline-none placeholder:text-stone-300 font-bold"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                    <div className="flex gap-2 overflow-x-auto items-center flex-shrink-0">
                        <span className="text-[9px] uppercase tracking-[0.4em] text-stone-300 font-bold whitespace-nowrap">
                            Filter:
                        </span>
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setActiveFilter(cat)}
                                className={`text-[9px] uppercase tracking-[0.2em] font-bold px-3 py-2 border transition-all whitespace-nowrap ${
                                    activeFilter === cat
                                        ? "bg-stone-900 text-white border-stone-900"
                                        : "text-stone-400 border-stone-200 hover:border-stone-900 hover:text-stone-900"
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-8 py-20">
                <div className="flex justify-between items-end mb-16 border-b border-stone-200 pb-8">
                    <div>
                        <h1 className="text-4xl font-light uppercase tracking-[0.2em] text-stone-400 mb-2">
                            The <span className="text-stone-900">Collection</span>
                        </h1>
                        <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-stone-300">
                            NMA — London 1978–2014
                        </p>
                    </div>
                    <span className="text-[10px] font-mono text-stone-400 bg-stone-50 px-3 py-1 border border-stone-200">
                        {filteredModels.length} records
                    </span>
                </div>

                {loading ? (
                    <div className="py-40 text-center space-y-4">
                        <div className="w-12 h-px bg-stone-200 mx-auto animate-pulse" />
                        <p className="text-[10px] uppercase tracking-[0.5em] text-stone-300 animate-pulse">
                            Loading...
                        </p>
                    </div>
                ) : filteredModels.length === 0 ? (
                    <div className="py-32 text-center border-y border-stone-200">
                        <p className="text-stone-300 uppercase tracking-[0.5em] text-[10px] font-bold">
                            No records matched.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-20">
                        {filteredModels.map((model) => {
                            const hero = getHeroImage(model.images);
                            const title = clean(model.title) || "Untitled";
                            const architect = clean(model.architect);
                            const type = clean(model.modelType) || clean(model.buildingType as string);

                            return (
                                <Link href={`/models/${model.id}`} key={model.id} className="group block">
                                    {/* Image / placeholder */}
                                    <div className="aspect-[4/5] bg-stone-50 overflow-hidden relative mb-6 border border-stone-200 group-hover:border-stone-200 transition-colors duration-500">
                                        {hero ? (
                                            <Image
                                                src={hero}
                                                alt={title}
                                                fill
                                                className="object-cover group-hover:scale-[1.02] transition-transform duration-700"
                                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center text-stone-100 font-bold text-[7rem] tracking-tighter select-none group-hover:scale-105 transition-transform duration-700">
                                                {model.modelNumber?.slice(-2) || "—"}
                                            </div>
                                        )}

                                        {/* HUD on hover */}
                                        <div className="absolute top-4 left-4 right-4 flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <span className="text-[9px] font-mono bg-white/90 border border-stone-200 px-2 py-1">
                                                {model.modelNumber}
                                            </span>
                                            {clean(model.scale) && (
                                                <span className="text-[9px] font-bold uppercase tracking-widest text-stone-600 bg-white/80 px-2 py-1">
                                                    {model.scale}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Metadata */}
                                    <div className="space-y-3 px-1">
                                        <h2 className="text-xl font-light leading-snug tracking-tight group-hover:text-stone-500 transition-colors">
                                            {title}
                                        </h2>
                                        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] font-bold">
                                            {architect && <span className="text-stone-900">{architect}</span>}
                                            {architect && model.year && <span className="w-1 h-px bg-stone-200" />}
                                            {model.year && <span className="text-stone-400">{model.year}</span>}
                                        </div>
                                        {type && (
                                            <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-stone-300 border border-stone-200 px-3 py-1 inline-block">
                                                {type}
                                            </span>
                                        )}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}

                <footer className="border-t border-stone-900 mt-32 pt-10 flex flex-col md:flex-row justify-between items-center gap-4">
                    <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-stone-400">
                        NMA © {new Date().getFullYear()}
                    </span>
                    <span className="text-[10px] font-mono text-stone-300">{models.length} total records</span>
                </footer>
            </div>
        </main>
    );
}
