import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Helper to fetch model data
// Helper to fetch model data
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
    photographer?: string;
    notes?: string;
    description?: string;
    buildingStatus?: string;
    voiceNarrative?: string;
    [key: string]: unknown;
}

async function getModel(id: string): Promise<ModelData | null> {
    try {
        const docRef = doc(db, "ma_models", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.isVisible === false) return null;
            return { id: docSnap.id, ...data } as ModelData;
        }
        return null;
    } catch (error) {
        console.error("Error fetching model:", error);
        return null;
    }
}

export default async function ModelPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const model = await getModel(id);

    if (!model) {
        // Fallback for demo/dev if DB is empty, or return 404
        if (process.env.NODE_ENV === 'development') {
            // Keep mock for dev testing if DB fetch fails/is empty
            // ... actually, let's strictly test real data or partial data
            // Returning 404 is safer to verify flow.
        }
        notFound();
    }

    return (
        <main className="min-h-screen bg-white font-sans text-black selection:bg-black selection:text-white">
            {/* Minimal Navigation */}
            <nav className="p-8 border-b border-black flex justify-between items-center bg-white sticky top-0 z-50">
                <Link href="/archive" className="text-xs uppercase tracking-widest font-bold hover:underline flex items-center">
                    <span className="mr-2">←</span> Back to Collection
                </Link>
                <div className="text-[10px] uppercase tracking-[0.4em] font-bold text-gray-400">
                    Modus Archive / Record {id}
                </div>
                <div className="flex space-x-4">
                    <button className="text-[10px] font-bold uppercase tracking-widest border border-black hover:bg-black hover:text-white transition-colors px-3 py-1">Inquire</button>
                </div>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100vh-80px)]">
                {/* Media Half */}
                <div className="bg-gray-100 relative group overflow-hidden border-r border-black/10">
                    <div className="absolute inset-0 flex items-center justify-center text-[25vw] font-bold text-gray-200 tracking-tighter select-none">
                        IMAGE
                    </div>

                    {/* Media HUD */}
                    <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end">
                        <div className="bg-black/90 text-white p-6 backdrop-blur-md max-w-sm">
                            <span className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">Original Plate</span>
                            <p className="text-sm italic leading-relaxed">
                                {model.photographer ? `Photographed by ${model.photographer}` : 'Archival Image'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Analytical Data Half */}
                <div className="p-12 md:p-24 overflow-y-auto bg-white">
                    <header className="mb-16">
                        <div className="flex items-center space-x-3 text-xs uppercase tracking-widest text-gray-500 font-bold mb-4">
                            <span>{model.architect || 'Unknown Architect'}</span>
                            <span className="w-1.5 h-1.5 bg-black rounded-full"></span>
                            <span>{model.year || 'N/D'}</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-light tracking-tight leading-none mb-8">
                            {model.title || 'Untitled Project'}
                        </h1>
                        <div className="h-0.5 w-24 bg-black"></div>
                    </header>

                    <section className="space-y-12 max-w-xl">
                        {/* Summary Block */}
                        <div>
                            <h3 className="text-xs uppercase tracking-[0.4em] font-bold text-gray-400 mb-6">Historical Context</h3>
                            <p className="text-xl text-black leading-relaxed">
                                &quot;{model.notes || model.description || 'No description available in archive.'}&quot;
                            </p>
                        </div>

                        {/* Technical Specs */}
                        <div className="grid grid-cols-2 gap-8 py-8 border-y border-gray-100">
                            <div>
                                <h4 className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Scale</h4>
                                <p className="text-sm font-bold uppercase tracking-tight">{model.scale || 'N/A'}</p>
                            </div>
                            <div>
                                <h4 className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Size</h4>
                                <p className="text-sm font-bold uppercase tracking-tight">{model.modelSize || 'N/A'}</p>
                            </div>
                            <div className="col-span-2">
                                <h4 className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Materials</h4>
                                <div className="flex flex-wrap gap-2">
                                    {model.materials && Array.isArray(model.materials) ? model.materials.map((m: string) => (
                                        <span key={m} className="text-[10px] font-mono bg-gray-100 px-2 py-1 uppercase">{m}</span>
                                    )) : <span className="text-xs text-gray-300">Not catalogued</span>}
                                </div>
                            </div>
                        </div>

                        {/* Audio Narrative (Optional) */}
                        {model.voiceNarrative && (
                            <div className="p-8 bg-gray-50 border-l-4 border-black">
                                <h3 className="text-xs uppercase tracking-widest font-bold mb-4 flex items-center">
                                    <span className="w-2 h-2 bg-black rounded-full animate-pulse mr-2"></span>
                                    Audio Narrative
                                </h3>
                                <p className="text-sm text-gray-600 leading-relaxed italic">
                                    Transcript loading...
                                </p>
                                <button className="mt-6 text-[10px] uppercase tracking-widest font-bold flex items-center hover:underline">
                                    Listen to Recording →
                                </button>
                            </div>
                        )}
                    </section>

                    {/* Footer Stats */}
                    <footer className="mt-24 pt-12 border-t border-gray-200 text-[10px] font-mono text-gray-300 uppercase tracking-widest">
                        Record ID: MOD-{id} / Hash.Archival.0x{id.substring(0, 4)} / Status: {model.buildingStatus || 'Archived'}
                    </footer>
                </div>
            </div>
        </main>
    );
}
