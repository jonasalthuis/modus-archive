import React from "react";
import Link from "next/link";

export const metadata = {
    title: "About — NMA",
};

function Section({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <section className="border-t border-stone-200 pt-12 pb-16">
            <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-300 mb-8">{label}</p>
            {children}
        </section>
    );
}

export default function AboutPage() {
    return (
        <main className="min-h-screen bg-white text-stone-900">
            {/* Top padding for global nav */}
            <div className="pt-[58px]">
                <div className="max-w-3xl mx-auto px-8 py-16">

                    {/* Page header */}
                    <header className="border-b border-stone-200 pb-16 mb-0">
                        <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-300 mb-6">
                            Network Modelmakers Archive
                        </p>
                        <h1 className="text-6xl font-light tracking-tight leading-[1.03] mb-8 max-w-xl">
                            About<br />MODUS
                        </h1>
                        <p className="text-lg font-light text-stone-500 leading-relaxed max-w-xl">
                            A public digital archive of architectural scale models made by Network Modelmakers,
                            a London workshop active 1978–2014.
                        </p>
                    </header>

                    <Section label="The Workshop">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                            <div>
                                <h2 className="text-3xl font-light tracking-tight leading-snug mb-6">
                                    Network Modelmakers
                                </h2>
                                <div className="space-y-5 text-base font-light text-stone-600 leading-relaxed">
                                    <p>
                                        Network Modelmakers was a specialist architectural model workshop based
                                        in London, operating from 1978 until its closure in 2014. Over more
                                        than three decades, the workshop produced physical scale models for
                                        some of the most significant architectural practices of the period.
                                    </p>
                                    <p>
                                        Clients included Richard Rogers Partnership, Zaha Hadid Architects,
                                        Herzog & de Meuron, David Chipperfield Architects, Eva Jiřičná
                                        Architects, and dozens of other studios working at the intersection
                                        of architecture, infrastructure, and urban design.
                                    </p>
                                    <p>
                                        The models ranged from presentation pieces for client meetings and
                                        planning inquiries to working study models used to test and develop
                                        architectural ideas. Many were made for competition entries; others
                                        documented buildings that were never built.
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-8">
                                <div>
                                    <p className="text-[8px] uppercase tracking-[0.45em] font-bold text-stone-300 mb-2">
                                        Active
                                    </p>
                                    <p className="text-stone-700 font-light">1978 – 2014</p>
                                </div>
                                <div>
                                    <p className="text-[8px] uppercase tracking-[0.45em] font-bold text-stone-300 mb-2">
                                        Location
                                    </p>
                                    <p className="text-stone-700 font-light">London, United Kingdom</p>
                                </div>
                                <div>
                                    <p className="text-[8px] uppercase tracking-[0.45em] font-bold text-stone-300 mb-2">
                                        Collection size
                                    </p>
                                    <p className="text-stone-700 font-light">~850 models · ~1,500 photographs</p>
                                </div>
                                <div>
                                    <p className="text-[8px] uppercase tracking-[0.45em] font-bold text-stone-300 mb-2">
                                        Notable clients
                                    </p>
                                    <p className="text-stone-700 font-light leading-relaxed">
                                        Rogers · Hadid · Herzog & de Meuron<br />
                                        Chipperfield · Jiřičná · and others
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Section>

                    <Section label="The Archive">
                        <div className="space-y-5 text-base font-light text-stone-600 leading-relaxed max-w-xl mb-10">
                            <p>
                                MODUS is a systematic effort to document, photograph, and contextualise
                                the models that remain from the workshop's output. Each model has been
                                catalogued with its original metadata — architect, year, scale, materials,
                                commission context — and photographed in detail.
                            </p>
                            <p>
                                Beyond the individual model records, the archive is organised into Dossiers:
                                curated thematic collections that group models by architect, period, material,
                                building type, or other threads of interest. These are the editorial layer of
                                the archive — a way of reading the collection rather than just indexing it.
                            </p>
                            <p>
                                The archive is designed to grow. As more models are documented and more
                                research is completed, new Dossiers and Artefacts — texts, recordings,
                                contextual documents — will be added.
                            </p>
                        </div>
                        <div className="grid grid-cols-3 gap-8 border-t border-stone-100 pt-10">
                            {[
                                { n: "~850", label: "Models" },
                                { n: "~1,500", label: "Photographs" },
                                { n: "1978–2014", label: "Period covered" },
                            ].map((s) => (
                                <div key={s.label}>
                                    <p className="text-3xl font-light text-stone-900 mb-1">{s.n}</p>
                                    <p className="text-[9px] uppercase tracking-[0.4em] font-bold text-stone-300">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </Section>

                    <Section label="How It Works">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                            {[
                                {
                                    title: "Models",
                                    body: "Individual records for each physical model. Each entry includes photography, metadata (scale, materials, architect, year), and links to related dossiers and artefacts.",
                                    href: "/",
                                    cta: "Browse models",
                                },
                                {
                                    title: "Dossiers",
                                    body: "Curated thematic collections. Each dossier is an editorial document — a structured argument or story told through a selection of models, images, and texts.",
                                    href: "/dossiers",
                                    cta: "Open dossiers",
                                },
                                {
                                    title: "Artefacts",
                                    body: "Primary source material: photographs, texts, audio recordings, correspondence, and documents connected to the models and the workshop.",
                                    href: "/artefacts",
                                    cta: "Browse artefacts",
                                },
                            ].map((item) => (
                                <div key={item.title} className="space-y-4">
                                    <p className="text-[8px] uppercase tracking-[0.4em] font-bold text-stone-300">{item.title}</p>
                                    <p className="text-base font-light text-stone-600 leading-relaxed">{item.body}</p>
                                    <Link
                                        href={item.href}
                                        className="text-[9px] uppercase tracking-[0.3em] font-bold text-stone-400 hover:text-stone-900 transition-colors"
                                    >
                                        {item.cta} →
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </Section>

                    <Section label="The Project">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                            <div className="space-y-5 text-base font-light text-stone-600 leading-relaxed">
                                <p>
                                    MODUS is a collaboration between Jonas Althuis and Alessandro Rognoni.
                                    Jonas leads the technical development; Alessandro leads the archival
                                    research, content, and photography.
                                </p>
                                <p>
                                    The project is funded by Stimuleringsfonds Creatieve Industrie and
                                    EFL Stichting, and developed as part of a broader effort to document
                                    the material culture of late twentieth century architectural practice
                                    in Britain.
                                </p>
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <p className="text-[8px] uppercase tracking-[0.45em] font-bold text-stone-300 mb-2">Research & content</p>
                                    <p className="text-stone-700 font-light">Alessandro Rognoni</p>
                                </div>
                                <div>
                                    <p className="text-[8px] uppercase tracking-[0.45em] font-bold text-stone-300 mb-2">Development</p>
                                    <p className="text-stone-700 font-light">Jonas Althuis</p>
                                </div>
                                <div>
                                    <p className="text-[8px] uppercase tracking-[0.45em] font-bold text-stone-300 mb-2">Funding</p>
                                    <p className="text-stone-700 font-light leading-relaxed">
                                        Stimuleringsfonds Creatieve Industrie<br />
                                        EFL Stichting
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Section>

                    <Section label="Contact">
                        <div className="space-y-4 text-base font-light text-stone-600 leading-relaxed max-w-xl">
                            <p>
                                For enquiries about the archive, access to specific models or documents,
                                or collaboration proposals, please get in touch.
                            </p>
                            <a
                                href="mailto:info@modusarchive.com"
                                className="inline-block text-[9px] uppercase tracking-[0.3em] font-bold text-stone-900 border-b border-stone-300 hover:border-stone-900 transition-colors pb-0.5"
                            >
                                info@modusarchive.com
                            </a>
                        </div>
                    </Section>

                </div>
            </div>
        </main>
    );
}
