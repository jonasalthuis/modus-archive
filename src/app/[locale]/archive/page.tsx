"use client";

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';

interface ModelRecord {
    id: string;
    modelNumber?: string;
    title?: string;
    architect?: string;
    year?: number;
    scale?: string;
    modelType?: string;
    buildingType?: string;
    [key: string]: any;
}

export default function ArchivePage() {
    const [models, setModels] = useState<ModelRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('All');

    useEffect(() => {
        async function fetchModels() {
            setLoading(true);
            try {
                const q = query(collection(db, "ma_models"), orderBy("modelNumber", "asc"));
                const querySnapshot = await getDocs(q);
                const results = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as ModelRecord[];
                setModels(results);
            } catch (error) {
                console.error("Failed to fetch archive:", error);
            }
            setLoading(false);
        }
        fetchModels();
    }, []);

    const filteredModels = models.filter(model => {
        const matchesSearch = (model.title?.toLowerCase() || '').includes(search.toLowerCase()) ||
            (model.architect?.toLowerCase() || '').includes(search.toLowerCase()) ||
            (model.modelNumber?.toLowerCase() || '').includes(search.toLowerCase());

        const category = model.modelType || model.buildingType || 'Uncategorized';
        const matchesFilter = filter === 'All' || category === filter;

        return matchesSearch && matchesFilter;
    });

    const categories = ['All', ...new Set(models.map(m => m.modelType || m.buildingType || 'Uncategorized').filter(Boolean))].sort();

    return (
        <main className="min-h-screen bg-white font-sans text-stone-900 selection:bg-stone-900 selection:text-white">
            {/* Search and Filter Header */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-2xl border-b border-stone-100 px-8 py-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="relative w-full md:w-[400px]">
                        <input
                            type="text"
                            placeholder="Search Archive by ID, Architect, or Project..."
                            className="w-full bg-stone-50 border-stone-200 focus:border-stone-900 rounded-none py-4 px-6 text-[10px] uppercase tracking-[0.2em] transition-all outline-none placeholder:text-stone-300 font-bold"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="flex space-x-3 overflow-x-auto pb-2 md:pb-0 no-scrollbar items-center">
                        <span className="text-[9px] uppercase tracking-[0.4em] text-stone-300 mr-2 font-bold whitespace-nowrap">Filter By Type:</span>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setFilter(cat)}
                                className={`text-[9px] uppercase tracking-[0.2em] font-bold px-4 py-2 border transition-all whitespace-nowrap ${filter === cat ? 'bg-stone-900 text-white border-stone-900' : 'bg-transparent text-stone-400 border-stone-100 hover:border-stone-900 hover:text-stone-900'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Archive Grid */}
            <div className="max-w-7xl mx-auto px-8 py-24">
                <div className="flex justify-between items-end mb-20 border-b border-stone-100 pb-8">
                    <div>
                        <h1 className="text-4xl font-light uppercase tracking-[0.2em] text-stone-400 mb-2">
                            The <span className="text-stone-900">Collection</span>
                        </h1>
                        <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-stone-300">Preserving 40 Years of Analogue DNA</p>
                    </div>
                    <span className="text-[10px] font-mono text-stone-400 bg-stone-50 px-3 py-1 border border-stone-100">{filteredModels.length} Records Found</span>
                </div>

                {loading ? (
                    <div className="py-40 text-center space-y-4">
                        <div className="w-12 h-px bg-stone-200 mx-auto animate-pulse"></div>
                        <p className="text-[10px] uppercase tracking-[0.5em] text-stone-400 animate-pulse">Accessing Primary Evidence...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-24">
                        {filteredModels.map((model) => (
                            <Link href={`/models/${model.id}`} key={model.id} className="group block">
                                <div className="aspect-[4/5] bg-stone-50 overflow-hidden relative mb-8 border border-stone-50 group-hover:border-stone-200 transition-colors duration-500">
                                    <div className="absolute inset-0 flex items-center justify-center text-stone-100 font-bold text-[8rem] tracking-tighter opacity-80 group-hover:scale-105 transition-transform duration-1000 select-none">
                                        {model.modelNumber?.slice(-2) || '00'}
                                    </div>
                                    <div className="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/[0.02] transition-colors duration-500"></div>

                                    {/* Card HUD */}
                                    <div className="absolute top-6 left-6 right-6 flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                        <span className="text-[9px] font-mono bg-white border border-stone-100 px-2 py-1 uppercase">{model.modelNumber}</span>
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400 bg-white/50 backdrop-blur-sm px-2 py-1">Scale {model.scale || 'N/A'}</span>
                                    </div>
                                </div>

                                <div className="space-y-4 px-2">
                                    <div className="flex justify-between items-start">
                                        <h2 className="text-2xl font-light leading-[1.1] tracking-tight group-hover:text-stone-500 transition-colors">
                                            {model.title || 'Untitled Archive Record'}
                                        </h2>
                                    </div>
                                    <div className="flex items-center space-x-4 text-[10px] uppercase tracking-[0.2em] text-stone-400 font-bold">
                                        <span className="text-stone-900">{model.architect || 'Unknown Firm'}</span>
                                        <span className="w-1 h-px bg-stone-200"></span>
                                        <span>{model.year || 'N/D'}</span>
                                    </div>
                                    <div className="pt-2">
                                        <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-stone-300 border border-stone-100 px-3 py-1.5 inline-block">
                                            {model.modelType || model.buildingType || 'Archival Study'}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {!loading && filteredModels.length === 0 && (
                    <div className="py-32 text-center border-y border-stone-100">
                        <p className="text-stone-300 uppercase tracking-[0.5em] text-[10px] font-bold italic">Zero records matched your research query.</p>
                    </div>
                )}

                <div className="border-t border-stone-900 mt-32 pt-12 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="text-[10px] uppercase tracking-[0.4em] font-bold text-stone-400">
                        Modus Archive &copy; {new Date().getFullYear()} / System Status: Operational
                    </div>
                    <div className="flex space-x-8 text-[10px] uppercase tracking-[0.3em] font-bold">
                        <span className="text-stone-300">Record Count: {models.length}</span>
                        <span className="text-stone-300">Visual Assets: 1,500+</span>
                    </div>
                </div>
            </div>
        </main>
    );
}

