"use client";

import React, { Suspense, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ViewMode } from "./universe/types";

const NAV_LINKS = [
    { label: "Collection", href: "/" },
    { label: "Dossiers", href: "/dossiers" },
    { label: "Artefacts", href: "/artefacts" },
    { label: "About", href: "/info/about" },
    { label: "Account", href: "/account" },
];

const VIEWS: { key: ViewMode; label: string }[] = [
    { key: "explore", label: "Explore" },
    { key: "grid", label: "Grid" },
];

// Segmented view toggle — reads/writes ?view= in the URL. Only shown on "/".
function ViewToggle() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const current = (searchParams.get("view") as ViewMode) || "explore";

    const setView = (v: ViewMode) => {
        const params = new URLSearchParams(searchParams.toString());
        if (v === "explore") params.delete("view");
        else params.set("view", v);
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    };

    return (
        <div className="flex items-center bg-white border border-stone-200 rounded-md overflow-hidden h-[34px]">
            {VIEWS.map((v, i) => {
                const active = current === v.key;
                return (
                    <button
                        key={v.key}
                        onClick={() => setView(v.key)}
                        className={`px-3 h-full text-[9px] font-bold uppercase tracking-[0.25em] transition-colors duration-200 ${
                            active ? "bg-stone-900 text-white" : "text-stone-400 hover:text-stone-900"
                        } ${i > 0 ? "border-l border-stone-200" : ""}`}
                    >
                        {v.label}
                    </button>
                );
            })}
        </div>
    );
}

export function Nav() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Hide entirely on admin routes.
    if (pathname?.startsWith("/admin")) return null;

    // Close on outside click.
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    // Close on ESC.
    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if (e.key === "Escape") setOpen(false);
        }
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, []);

    // Close when route changes.
    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    return (
        <div ref={ref} className="fixed top-6 left-8 z-50 flex items-start gap-2">
            {/* Mark + dropdown */}
            <div className="relative">
                <button
                    onClick={() => setOpen((v) => !v)}
                    className={`
 text-[10px] font-bold uppercase tracking-[0.4em] px-3 py-2 rounded-md
 border transition-all duration-300 select-none h-[34px]
 ${open ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-900 border-stone-200 hover:border-stone-900"}
 `}
                    aria-label="Toggle navigation"
                >
                    NMA
                </button>

                <div
                    className={`
 absolute top-full mt-1 left-0 origin-top-left w-44 bg-white border border-stone-200 rounded-md
 overflow-hidden transition-all duration-300
 ${open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"}
 `}
                >
                    <nav className="py-2">
                        {NAV_LINKS.map((link) => {
                            const active =
                                pathname === link.href ||
                                (link.href !== "/" && pathname?.startsWith(link.href));
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`
 block px-5 py-3 text-[10px] uppercase tracking-[0.3em] font-bold
 transition-colors duration-150
 ${active ? "text-stone-900 bg-stone-50" : "text-stone-400 hover:text-stone-900 hover:bg-stone-50"}
 `}
                                >
                                    {link.label}
                                </Link>
                            );
                        })}
                        <div className="mx-5 my-1 border-t border-stone-200" />
                        <Link
                            href="/admin"
                            className="block px-5 py-3 text-[10px] uppercase tracking-[0.3em] font-bold text-stone-300 hover:text-stone-900 hover:bg-stone-50 transition-colors duration-150"
                        >
                            Admin
                        </Link>
                    </nav>
                </div>
            </div>

            {/* View toggle — only on the universe landing */}
            {pathname === "/" && (
                <Suspense fallback={null}>
                    <ViewToggle />
                </Suspense>
            )}
        </div>
    );
}
