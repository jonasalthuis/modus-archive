"use client";

import React, { Suspense, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Menu as MenuIcon, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ViewMode } from "./universe/types";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";

// Links shown in the MENU dropdown only — Dossiers/Artefacts have top-level buttons.
const MENU_LINKS = [
    { label: "About", href: "/info/about" },
    { label: "Account", href: "/account" },
];

const QUICK_LINKS = [
    { label: "Dossiers", href: "/dossiers" },
    { label: "Artefacts", href: "/artefacts" },
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
        <div className="flex items-center bg-white/70 backdrop-blur-xl border border-stone-200 rounded-md overflow-hidden h-[34px] flex-shrink-0">
            {VIEWS.map((v, i) => {
                const active = current === v.key;
                return (
                    <button
                        key={v.key}
                        onClick={() => setView(v.key)}
                        className={`px-3 h-full text-[9px] font-bold uppercase tracking-[0.25em] transition-colors duration-200 ${
                            active ? "bg-stone-900/80 backdrop-blur-md text-white" : "text-stone-600 hover:bg-stone-900 hover:text-white"
                        } ${i > 0 ? "border-l border-stone-200" : ""}`}
                    >
                        {v.label}
                    </button>
                );
            })}
        </div>
    );
}

const NAV_BTN =
    "text-[10px] font-bold uppercase tracking-[0.4em] px-3 leading-none rounded-md border border-stone-200 hover:border-stone-900 hover:bg-stone-900 hover:text-white bg-white/70 backdrop-blur-xl hover:backdrop-blur-none text-stone-700 transition-colors duration-300 select-none h-[34px] flex items-center flex-shrink-0";

export function Nav() {
    const pathname = usePathname();
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const [archiveHref, setArchiveHref] = useState("/");

    const isAdmin = Boolean(pathname?.startsWith("/admin"));
    const isArchive = pathname === "/";

    // Restore last archive view (grid/explore) from sessionStorage on mount.
    useEffect(() => {
        try {
            const saved = sessionStorage.getItem("archive_view");
            if (saved) setArchiveHref(`/?view=${saved}`);
        } catch { /* private browsing */ }
    }, [pathname]);

    // Close on outside click.
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
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

    // All hooks must run before any conditional return.
    if (isAdmin) return null;

    return (
        <>
            {/* Fading strip behind the fixed header — content fades to white and disappears underneath rather than cutting off sharply */}
            <div className="fixed top-0 inset-x-0 h-20 z-40 pointer-events-none bg-gradient-to-b from-white via-white/70 to-transparent" />
            <div className="fixed top-4 left-4 right-4 z-50 flex items-center gap-3 pointer-events-none">
            {/* Left cluster: NMA + optional view toggle + optional search */}
            <div className="relative group/nma flex-shrink-0 pointer-events-auto">
                <Link
                    href={archiveHref}
                    className="px-3 text-stone-900 hover:text-stone-500 transition-colors duration-300 select-none h-[34px] flex items-center justify-center text-2xl font-medium tracking-tight"
                >
                    NM<span className="italic">A</span>
                </Link>
                <span className="absolute top-full mt-2 left-0 px-2 py-1 whitespace-nowrap text-[9px] uppercase tracking-[0.25em] font-bold text-stone-900 bg-white/80 backdrop-blur-xl border border-stone-200 rounded pointer-events-none opacity-0 group-hover/nma:opacity-100 transition-opacity duration-150">
                    Network Models Archive
                </span>
            </div>

            {isArchive && (
                <Suspense fallback={null}>
                    <div className="pointer-events-auto">
                        <ViewToggle />
                    </div>
                </Suspense>
            )}

            {/* Flex spacer — pushes right cluster to the far right */}
            <div className="flex-1" />

            {/* Right cluster: Dossiers + Artefacts quick links */}
            {QUICK_LINKS.map((link) => {
                const active = pathname?.startsWith(link.href);
                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={`pointer-events-auto ${active
                            ? "text-[10px] font-bold uppercase tracking-[0.4em] px-3 leading-none rounded-md border border-stone-900/60 bg-stone-900/80 backdrop-blur-md text-white transition-colors duration-300 select-none h-[34px] flex items-center flex-shrink-0"
                            : NAV_BTN
                        }`}
                    >
                        {link.label}
                    </Link>
                );
            })}

            {/* Menu button + dropdown */}
            <div ref={menuRef} className="relative flex-shrink-0 pointer-events-auto">
                <button
                    onClick={() => setOpen((v) => !v)}
                    className={`
 text-[10px] font-bold uppercase tracking-[0.4em] px-3 leading-none rounded-md
 border transition-all duration-300 select-none h-[34px] flex items-center
 ${open ? "bg-stone-900/80 backdrop-blur-xl hover:backdrop-blur-none text-white border-stone-900/60" : "bg-white/50 backdrop-blur-xl hover:backdrop-blur-none text-stone-900 border-stone-200 hover:border-stone-900 hover:bg-stone-900 hover:text-white"}
 `}
                    aria-label="Toggle navigation"
                    aria-expanded={open}
                >
                    {open ? <X size={14} /> : <MenuIcon size={14} />}
                </button>

                <div
                    className={`
 absolute top-full mt-1 right-0 origin-top-right w-40 bg-white/55 backdrop-blur-xl border border-stone-200 rounded-md
 overflow-hidden transition-all duration-300 shadow-[0_8px_24px_rgba(0,0,0,0.10),0_2px_6px_rgba(0,0,0,0.06)]
 ${open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"}
 `}
                >
                    <nav className="py-2">
                        {MENU_LINKS.map((link) => {
                            const active = pathname?.startsWith(link.href);
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
                        {user && (
                            <button
                                onClick={() => signOut(auth)}
                                className="w-full text-left block px-5 py-3 text-[10px] uppercase tracking-[0.3em] font-bold text-stone-300 hover:text-red-500 hover:bg-stone-50 transition-colors duration-150"
                            >
                                Sign out
                            </button>
                        )}
                    </nav>
                </div>
            </div>
            </div>
        </>
    );
}
