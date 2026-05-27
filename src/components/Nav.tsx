"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
    { label: "Collection", href: "/archive" },
    { label: "Dossiers", href: "/dossiers" },
    { label: "About", href: "/info/about" },
];

export function Nav() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Hide entirely on admin routes
    if (pathname?.startsWith("/admin")) return null;

    // Close on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    // Close on ESC
    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if (e.key === "Escape") setOpen(false);
        }
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, []);

    // Close when route changes
    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    return (
        <div ref={ref} className="fixed top-6 right-8 z-50">
            {/* Mark — always visible */}
            <button
                onClick={() => setOpen((v) => !v)}
                className={`
                    text-[10px] font-bold uppercase tracking-[0.4em] px-3 py-2
                    border transition-all duration-300 select-none
                    ${open
                        ? "bg-stone-900 text-white border-stone-900"
                        : "bg-white text-stone-900 border-stone-200 hover:border-stone-900"
                    }
                `}
                aria-label="Toggle navigation"
            >
                NMA
            </button>

            {/* Expanded panel */}
            <div
                className={`
                    absolute right-0 top-full mt-1 w-44 bg-white border border-stone-200
                    overflow-hidden transition-all duration-300 origin-top-right
                    ${open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"}
                `}
            >
                <nav className="py-2">
                    {NAV_LINKS.map((link) => {
                        const active = pathname === link.href ||
                            (link.href !== "/" && pathname?.startsWith(link.href));
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`
                                    block px-5 py-3 text-[10px] uppercase tracking-[0.3em] font-bold
                                    transition-colors duration-150
                                    ${active
                                        ? "text-stone-900 bg-stone-50"
                                        : "text-stone-400 hover:text-stone-900 hover:bg-stone-50"
                                    }
                                `}
                            >
                                {link.label}
                            </Link>
                        );
                    })}
                    <div className="mx-5 my-1 border-t border-stone-100" />
                    <Link
                        href="/admin"
                        className="block px-5 py-3 text-[10px] uppercase tracking-[0.3em] font-bold text-stone-300 hover:text-stone-900 hover:bg-stone-50 transition-colors duration-150"
                    >
                        Admin
                    </Link>
                </nav>
            </div>
        </div>
    );
}
