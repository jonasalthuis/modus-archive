"use client";

import React, { useState } from 'react';

// Mock data for the 850+ models
const MOCK_MODELS = [
    { id: '101', title: 'Museum of the Future Prototyping', architect: 'OMA', year: 2018, category: 'Competition', scale: '1:200', image: '01' },
    { id: '102', title: 'Vertical City Study', architect: 'MVRDV', year: 2015, category: 'Urban Design', scale: '1:500', image: '02' },
    { id: '103', title: 'Linear Housing Block', architect: 'Atelier Bow-Wow', year: 2020, category: 'Residential', scale: '1:50', image: '03' },
    { id: '104', title: 'The Network Workshop Interior', architect: 'Modus', year: 1985, category: 'Interior', scale: '1:20', image: '04' },
    { id: '105', title: 'Pavilion of Light', architect: 'SANAA', year: 2012, category: 'Cultural', scale: '1:100', image: '01' },
    { id: '106', title: 'Harbor Masterplan', architect: 'KCAP', year: 2005, category: 'Masterplan', scale: '1:1000', image: '02' },
];

export default function ArchivePage() {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('All');

    const filteredModels = MOCK_MODELS.filter(model => {
        const matchesSearch = model.title.toLowerCase().includes(search.toLowerCase()) ||
            model.architect.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === 'All' || model.category === filter;
        return matchesSearch && matchesFilter;
    });

    const categories = ['All', ...new Set(MOCK_MODELS.map(m => m.category))];

    return (
        <main className="min-h-screen bg-white font-sans text-black selection:bg-black selection:text-white">
            {/* Search and Filter Header */}
            <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-black px-8 py-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="relative w-full md:w-96">
                        <input
                            type="text"
                            placeholder="Search Archive..."
                            className="w-full bg-gray-50 border-b border-gray-200 focus:border-black rounded-none py-3 px-4 text-sm uppercase tracking-widest transition-all outline-none placeholder:text-gray-400"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="flex space-x-4 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setFilter(cat)}
                                className={`text-[10px] uppercase tracking-[0.2em] font-bold px-4 py-2 border whitespace-nowrap transition-all ${filter === cat ? 'bg-black text-white border-black' : 'bg-transparent text-gray-400 border-gray-200 hover:border-black hover:text-black'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Archive Grid */}
            <div className="max-w-7xl mx-auto px-8 py-16">
                <div className="flex justify-between items-baseline mb-12 border-b border-black pb-4">
                    <h1 className="text-2xl font-light uppercase tracking-widest text-gray-400">
                        The <span className="text-black">Collection</span>
                    </h1>
                    <span className="text-xs font-mono text-gray-400">{filteredModels.length} Entries Found</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
                    {filteredModels.map((model) => (
                        <a href={`/models/${model.id}`} key={model.id} className="group block">
                            <div className="aspect-[4/3] bg-gray-100 overflow-hidden relative mb-6">
                                <div className="absolute inset-0 flex items-center justify-center text-gray-200 font-bold text-9xl tracking-tighter opacity-50 group-hover:scale-110 transition-transform duration-700">
                                    {model.image}
                                </div>
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500"></div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-start">
                                    <h2 className="text-xl font-normal group-hover:underline transition-all decoration-1 underline-offset-4 leading-tight">
                                        {model.title}
                                    </h2>
                                    <span className="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 mt-1">{model.id}</span>
                                </div>
                                <div className="flex items-center space-x-3 text-xs uppercase tracking-widest text-gray-500 font-bold">
                                    <span>{model.architect}</span>
                                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                    <span>{model.year}</span>
                                </div>
                                <div className="pt-2 flex space-x-2">
                                    <span className="text-[10px] uppercase tracking-tighter text-gray-400 border border-gray-200 px-2 py-0.5">Scale {model.scale}</span>
                                    <span className="text-[10px] uppercase tracking-tighter text-gray-400 border border-gray-200 px-2 py-0.5">{model.category}</span>
                                </div>
                            </div>
                        </a>
                    ))}
                </div>

                {filteredModels.length === 0 && (
                    <div className="py-24 text-center border border-dashed border-gray-300">
                        <p className="text-gray-400 uppercase tracking-widest text-sm italic">No records matching your research query were found.</p>
                    </div>
                )}

                <div className="border-t border-black mt-20 pt-8 flex justify-between items-end">
                    <div className="text-xs uppercase tracking-widest">
                        Modus Archive &copy; {new Date().getFullYear()}
                    </div>
                    <div className="text-right">
                        <div className="text-xs font-bold uppercase tracking-widest mb-1">Status</div>
                        <div className="text-xs font-mono text-emerald-600">● System Operational</div>
                    </div>
                </div>
            </div>
        </main>
    );
}
