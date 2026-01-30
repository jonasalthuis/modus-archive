import React from 'react';
import Link from 'next/link';

/**
 * Modus Archive Hub - Index Page
 * Focuses on Discovery, Archival Integrity, and Rich Media.
 */
export default function Page() {
    return (
        <main className="min-h-screen bg-white text-stone-900 font-serif selection:bg-amber-100">
            {/* Header / Brand Section */}
            <header className="px-8 md:px-16 py-12 flex flex-col md:flex-row justify-between items-start md:items-end border-b border-stone-200">
                <div className="max-w-2xl">
                    <span className="text-xs uppercase tracking-[0.3em] font-semibold text-stone-400 mb-4 block">Archive Hub</span>
                    <h1 className="text-5xl md:text-7xl font-light tracking-tight leading-none mb-8">
                        Modus <br />
                        <span className="italic font-normal">Modelmaking</span>
                    </h1>
                    <p className="text-lg md:text-xl text-stone-600 leading-relaxed max-w-lg mb-8">
                        Documenting the analogue DNA of 40 years of architectural history.
                        A research-first repository of 850 models and 1,500 narratives.
                    </p>
                    <nav className="flex space-x-8 text-sm uppercase tracking-widest font-bold">
                        <Link href="/archive" className="hover:text-amber-800 transition-colors">The Collection</Link>
                        <Link href="/about" className="hover:text-amber-800 transition-colors">About Modus</Link>
                        <Link href="/research" className="hover:text-amber-800 transition-colors">Research Unit</Link>
                    </nav>
                </div>
                <div className="mt-8 md:mt-0 text-right">
                    <div className="p-6 border border-stone-200 bg-stone-50 md:min-w-[300px]">
                        <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">Project Supported by</p>
                        <p className="text-sm font-bold uppercase tracking-tight mb-4">Creative Industries Fund NL</p>
                        <div className="flex justify-end space-x-2">
                            <div className="w-1.5 h-1.5 bg-amber-600 rounded-full"></div>
                            <div className="w-1.5 h-1.5 bg-stone-300 rounded-full"></div>
                            <div className="w-1.5 h-1.5 bg-stone-300 rounded-full"></div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Discovery / Grid Section */}
            <section className="px-8 md:px-16 py-20">
                <div className="flex justify-between items-center mb-12">
                    <h2 className="text-sm uppercase tracking-[0.4em] font-bold">Latest Acquisitions</h2>
                    <button className="text-sm underline hover:text-amber-800">Browse All</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-1">
                    {/* Placeholder Media Cards */}
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="aspect-[4/5] bg-stone-100 group relative overflow-hidden transition-all duration-700 hover:z-10 hover:scale-[1.02]">
                            {/* Placeholder for images */}
                            <div className="absolute inset-0 bg-stone-200 flex items-center justify-center">
                                <span className="text-[10rem] font-bold text-stone-300 opacity-50 tracking-tighter">0{i}</span>
                            </div>

                            <div className="absolute inset-0 bg-gradient-to-t from-stone-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                            <div className="absolute bottom-0 left-0 p-6 text-white translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500">
                                <p className="text-xs uppercase tracking-widest mb-1">Scale 1:500</p>
                                <h3 className="text-xl font-normal leading-tight italic">Model Series #{i}00</h3>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Institutional Bar */}
            <footer className="px-8 md:px-16 py-12 bg-stone-900 text-stone-400 flex flex-col md:flex-row justify-between items-center text-xs uppercase tracking-[0.2em] font-medium">
                <div className="flex space-x-8 mb-4 md:mb-0">
                    <span>TU Delft Architecture</span>
                    <span>Rotterdamse Academie</span>
                </div>
                <div className="flex space-x-8 italic normal-case tracking-normal">
                    <span>© Modus Archive 2026</span>
                    <span>Admin: Jonas Althuis</span>
                </div>
            </footer>
        </main>
    );
}
