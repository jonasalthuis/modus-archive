"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BookOpen, Search, Hash } from "lucide-react";
import { GUIDES, headingSlug } from "../guides/registry";

// Pull plain text out of arbitrary React children (for heading ids + the in-page TOC)
function childrenToText(children: React.ReactNode): string {
    if (children == null) return "";
    if (typeof children === "string" || typeof children === "number") return String(children);
    if (Array.isArray(children)) return children.map(childrenToText).join("");
    if (React.isValidElement(children)) return childrenToText((children.props as { children?: React.ReactNode }).children);
    return "";
}

interface TocEntry {
    id: string;
    text: string;
    level: number;
}

export const GuidesView = ({
    initialGuide,
    initialAnchor,
    onOpenGuide,
}: {
    initialGuide?: string;
    initialAnchor?: string;
    onOpenGuide?: (guideId: string, anchor?: string) => void;
}) => {
    const [activeId, setActiveId] = useState(initialGuide || GUIDES[0].id);
    const [search, setSearch] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    const activeGuide = GUIDES.find((g) => g.id === activeId) ?? GUIDES[0];

    // Build a table of contents from the active doc's ## / ### headings
    const toc = useMemo<TocEntry[]>(() => {
        const lines = activeGuide.content.split("\n");
        const entries: TocEntry[] = [];
        let inCode = false;
        for (const line of lines) {
            if (line.trim().startsWith("```")) inCode = !inCode;
            if (inCode) continue;
            const m = /^(#{2,3})\s+(.*)$/.exec(line);
            if (m) {
                const text = m[2].replace(/[*_`]/g, "").trim();
                entries.push({ id: headingSlug(text), text, level: m[1].length });
            }
        }
        return entries;
    }, [activeGuide]);

    // Scroll to anchor (or top) whenever the active guide / requested anchor changes
    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;
        const t = setTimeout(() => {
            if (initialAnchor) {
                const el = container.querySelector(`#${CSS.escape(initialAnchor)}`);
                if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                    return;
                }
            }
            container.scrollTo({ top: 0 });
        }, 60);
        return () => clearTimeout(t);
    }, [activeId, initialAnchor]);

    // Sync when the engine asks for a specific guide (via a ? icon)
    useEffect(() => {
        if (initialGuide) setActiveId(initialGuide);
    }, [initialGuide]);

    const goTo = (guideId: string, anchor?: string) => {
        setActiveId(guideId);
        onOpenGuide?.(guideId, anchor);
        // Local scroll if it's the same guide and we have an anchor
        if (anchor) {
            setTimeout(() => {
                const el = scrollRef.current?.querySelector(`#${CSS.escape(anchor)}`);
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 60);
        }
    };

    const filteredGuides = GUIDES.filter(
        (g) =>
            !search ||
            g.title.toLowerCase().includes(search.toLowerCase()) ||
            g.content.toLowerCase().includes(search.toLowerCase()),
    );

    // Heading renderer factory — assigns an id so anchors + the TOC work
    const heading = (level: 1 | 2 | 3) => {
        const Tag = `h${level}` as "h1";
        const HeadingComponent = ({ children }: { children?: React.ReactNode }) => {
            const id = headingSlug(childrenToText(children));
            return (
                <Tag id={id} className="scroll-mt-6 group">
                    <>
                        {children}
                        <a
                            href={`#${id}`}
                            onClick={(e) => {
                                e.preventDefault();
                                scrollRef.current
                                    ?.querySelector(`#${CSS.escape(id)}`)
                                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }}
                            className="ml-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 no-underline align-middle"
                            aria-label="Link to section"
                        >
                            <Hash size={14} className="inline" />
                        </a>
                    </>
                </Tag>
            );
        };
        HeadingComponent.displayName = `GuideHeading${level}`;
        return HeadingComponent;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="pb-6 border-b border-black flex items-center gap-3">
                <BookOpen size={22} className="text-gray-900" />
                <div>
                    <h2 className="text-2xl font-light uppercase tracking-widest">Knowledge Center</h2>
                    <p className="text-[9px] font-mono text-gray-500 mt-1">Guides &amp; reference for running the archive</p>
                </div>
            </div>

            <div className="flex gap-6 items-start">
                {/* ── Left rail: guide list ── */}
                <aside className="w-60 flex-shrink-0 space-y-4 sticky top-0">
                    {/* Search */}
                    <div className="relative">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search guides…"
                            className="w-full pl-8 pr-3 py-2 bg-white rounded-lg border border-gray-300 shadow-sm text-[11px] focus:outline-none focus:border-gray-900 transition-colors"
                        />
                    </div>

                    <nav className="space-y-1">
                        {filteredGuides.map((g) => (
                            <button
                                key={g.id}
                                onClick={() => goTo(g.id)}
                                className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                                    g.id === activeId
                                        ? "bg-gray-900 text-white border-gray-900"
                                        : "bg-white border-gray-300 shadow-sm hover:border-gray-500"
                                }`}
                            >
                                <p className="text-[11px] font-bold uppercase tracking-[0.15em]">{g.title}</p>
                                <p
                                    className={`text-[10px] leading-snug mt-1 ${
                                        g.id === activeId ? "text-gray-400" : "text-gray-500"
                                    }`}
                                >
                                    {g.description}
                                </p>
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* ── Content card ── */}
                <div className="flex-1 min-w-0 flex gap-6">
                    <article
                        ref={scrollRef}
                        className="flex-1 min-w-0 bg-white rounded-xl border border-gray-300 shadow-sm p-10 max-h-[calc(100vh-12rem)] overflow-y-auto"
                    >
                        <div
                            className="prose prose-stone max-w-none
                                prose-headings:font-light prose-headings:tracking-tight
                                prose-h1:text-3xl prose-h1:uppercase prose-h1:tracking-[0.1em] prose-h1:mb-2
                                prose-h2:text-xl prose-h2:mt-10 prose-h2:pb-2 prose-h2:border-b prose-h2:border-gray-300
                                prose-h3:text-base prose-h3:uppercase prose-h3:tracking-wider prose-h3:text-gray-800
                                prose-p:text-gray-800 prose-p:leading-relaxed
                                prose-a:text-gray-900 prose-a:font-medium prose-a:underline-offset-2
                                prose-strong:text-gray-900
                                prose-code:text-gray-800 prose-code:bg-gray-200 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-[''] prose-code:after:content-['']
                                prose-table:text-sm
                                prose-th:bg-gray-200 prose-th:text-[10px] prose-th:uppercase prose-th:tracking-wider prose-th:text-gray-700 prose-th:font-bold prose-th:px-3 prose-th:py-2
                                prose-td:px-3 prose-td:py-2 prose-td:align-top prose-td:border-gray-300
                                prose-blockquote:border-l-2 prose-blockquote:border-gray-900 prose-blockquote:bg-gray-100 prose-blockquote:py-1 prose-blockquote:not-italic prose-blockquote:font-normal prose-blockquote:text-gray-700
                                prose-li:text-gray-800 prose-li:marker:text-gray-500
                                prose-hr:border-gray-300"
                        >
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    h1: heading(1),
                                    h2: heading(2),
                                    h3: heading(3),
                                    a: ({ href, children }) => {
                                        const url = href || "";
                                        // Internal doc link: ./admin-guide.md  or  ./x.md#anchor
                                        const md = /^\.?\/?([\w-]+)\.md(?:#([\w-]+))?$/.exec(url);
                                        if (md) {
                                            const targetId = md[1];
                                            const anchor = md[2];
                                            const exists = GUIDES.some((g) => g.id === targetId);
                                            return (
                                                <a
                                                    href={`#${targetId}`}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        if (exists) goTo(targetId, anchor);
                                                    }}
                                                >
                                                    {children}
                                                </a>
                                            );
                                        }
                                        // In-page anchor
                                        if (url.startsWith("#")) {
                                            return (
                                                <a
                                                    href={url}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        scrollRef.current
                                                            ?.querySelector(`#${CSS.escape(url.slice(1))}`)
                                                            ?.scrollIntoView({ behavior: "smooth", block: "start" });
                                                    }}
                                                >
                                                    {children}
                                                </a>
                                            );
                                        }
                                        // External
                                        return (
                                            <a href={url} target="_blank" rel="noopener noreferrer">
                                                {children}
                                            </a>
                                        );
                                    },
                                    table: ({ children }) => (
                                        <div className="overflow-x-auto border border-gray-300 rounded-lg my-6">
                                            <table className="!my-0">{children}</table>
                                        </div>
                                    ),
                                }}
                            >
                                {activeGuide.content}
                            </ReactMarkdown>
                        </div>
                    </article>

                    {/* ── On-this-page TOC ── */}
                    {toc.length > 2 && (
                        <nav className="hidden xl:block w-52 flex-shrink-0 sticky top-0 max-h-[calc(100vh-12rem)] overflow-y-auto">
                            <p className="text-[8px] uppercase tracking-[0.5em] font-bold text-gray-500 mb-3 pl-3">
                                On this page
                            </p>
                            <ul className="space-y-1 border-l border-gray-300">
                                {toc.map((t) => (
                                    <li key={t.id}>
                                        <button
                                            onClick={() =>
                                                scrollRef.current
                                                    ?.querySelector(`#${CSS.escape(t.id)}`)
                                                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                                            }
                                            className={`block text-left w-full text-[11px] leading-snug py-1 -ml-px border-l border-transparent hover:border-gray-900 hover:text-gray-900 transition-colors text-gray-600 ${
                                                t.level === 3 ? "pl-6" : "pl-3"
                                            }`}
                                        >
                                            {t.text}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    )}
                </div>
            </div>
        </div>
    );
};
