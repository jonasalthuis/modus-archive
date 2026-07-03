"use client";

import React from "react";
import Link from "next/link";
import { useAuth, canAccessAdmin } from "@/lib/auth";
import { Pencil } from "lucide-react";

/**
 * Floating "Edit in admin" badge — visible only to admin/editor accounts.
 * Renders nothing for public visitors.
 */
export function AdminEditBadge({ href = "/admin" }: { href?: string }) {
    const auth = useAuth();
    if (!canAccessAdmin(auth)) return null;

    return (
        <Link
            href={href}
            target={href.startsWith("/admin") ? undefined : "_blank"}
            rel="noopener noreferrer"
            className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-stone-900 text-white text-[9px] font-bold uppercase tracking-[0.25em] hover:bg-stone-700 transition-colors shadow-lg"
        >
            <Pencil size={11} />
            Edit
        </Link>
    );
}
