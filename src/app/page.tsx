import React from 'react';
import Link from 'next/link';

export default function HomePage() {
    return (
        <main className="min-h-screen bg-white text-stone-900 font-serif selection:bg-stone-200 selection:text-black">
            {/* Header / Brand */}
            <header className="px-8 md:px-16 py-16 flex flex-col md:flex-row justify-between items-start md:items-end border-b border-stone-100">
                <div className="max-w-2xl">
                    <span className="text-[10px] uppercase tracking-[0.5em] font-bold text-stone-400 mb-6 block leading-none">
                        Archival Repository
                    </span>
                    <h1 className="text-6xl md:text-8xl font-light tracking-tighter leading-[0.85] mb-12">
                        NMA
                    </h1>
                    <p className="text-xl md:text-2xl text-stone-600 leading-snug max-w-lg mb-12 font-sans font-light tracking-tight">
                        Documenting the analogue DNA of 40 years of architectural history.
                        A research-first repository of 850 models and 1,500 narratives.
                    </p>
                    <nav className="flex space-x-12 text-[10px] uppercase tracking-[0.3em] font-bold">
                        <Link href="/archive" className="hover:text-stone-500 transition-colors border-b border-stone-900 pb-1">
                            The Collection
                        </Link>
                        <Link href="/about" className="hover:text-stone-500 transition-colors">
                            About NMA
                        </Link>
                        <Link href="/research" className="hover:text-stone-500 transition-colors">
                            Research
                        </Link>
                    </nav>
                </div>

                <div className="mt-16 md:mt-0 text-right">
                    <div className="p-8 border border-stone-100 bg-stone-50/50 md:min-w-[320px]">
                        <p className="text-[9px] uppercase tracking-[0.4em] text-stone-400 mb-4">Project Supported by</p>
                        <p className="text-xs font-bold uppercase tracking-widest mb-6">Creative Industries Fund NL</p>
                        <div className="flex justify-end space-x-3">
                            <div className="w-1 h-1 bg-stone-900"></div>
                            <div className="w-1 h-1 bg-stone-200"></div>
                            <div className="w-1 h-1 bg-stone-200"></div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Latest Acquisitions */}
            <section className="px-8 md:px-16 py-24">
                <div className="flex justify-between items-center mb-16">
                    <h2 className="text-[10px] uppercase tracking-[0.5em] font-bold text-stone-400">
                        Latest Acquisitions
                    </h2>
                    <Link
                        href="/archive"
                        className="text-[10px] uppercase tracking-widest font-bold border-b border-black pb-1 hover:text-stone-400 hover:border-stone-400 transition-all"
                    >
                        Browse All
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-stone-100 border border-stone-100">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="aspect-[3/4] bg-white group relative overflow-hidden transition-all duration-1000">
                            <div className="absolute inset-0 bg-stone-50 flex items-center justify-center">
                                <span className="text-[12rem] font-bold text-stone-100 select-none tracking-tighter">
                                    0{i}
                                </span>
                            </div>

                            <div className="absolute inset-0 p-8 flex flex-col justify-between opacity-0 group-hover:opacity-100 transition-all duration-500 bg-stone-900/5 backdrop-blur-[2px]">
                                <div className="flex justify-between items-start">
                                    <span className="text-[9px] font-mono bg-white text-stone-900 px-2 py-0.5 uppercase">
                                        NMA-00{i}
                                    </span>
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400">1:500</span>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-stone-500 mb-2 font-bold font-sans">
                                        Series Archive
                                    </p>
                                    <h3 className="text-xl font-normal leading-tight italic text-stone-900">
                                        Model Series #{i}00
                                    </h3>
                                </div>
                            </div>

                            <div className="absolute bottom-6 left-8 right-8 flex justify-between items-end group-hover:opacity-0 transition-opacity">
                                <span className="text-[9px] font-mono text-stone-300">#00{i}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="px-8 md:px-16 py-16 bg-stone-900 text-stone-500 flex flex-col md:flex-row justify-between items-center text-[10px] uppercase tracking-[0.3em] font-bold">
                <div className="flex space-x-12 mb-8 md:mb-0">
                    <span className="hover:text-white transition-colors cursor-default">NMA</span>
                    <span className="hover:text-white transition-colors cursor-default">London 1978–2014</span>
                </div>
                <div className="flex space-x-12 italic normal-case tracking-normal font-medium text-stone-600">
                    <span>© NMA {new Date().getFullYear()}</span>
                    <span>Jonas Althuis</span>
                </div>
            </footer>
        </main>
    );
}
