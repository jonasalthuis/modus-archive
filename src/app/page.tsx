"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { prefetchArchive } from "@/lib/archivePrefetch";

// Kick off Firestore queries immediately — before the dynamic chunk finishes loading.
prefetchArchive();

function Loading() {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-stone-50">
            <div className="space-y-3 text-center">
                <div className="w-12 h-px bg-stone-300 mx-auto animate-pulse" />
                <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-300">
                    Loading archive…
                </p>
            </div>
        </div>
    );
}

// The 3D archive universe — client-only (large WebGL bundle, code-split here).
const ArchiveExperience = dynamic(
    () => import("@/components/universe/ArchiveExperience").then((m) => m.ArchiveExperience),
    { ssr: false, loading: () => <Loading /> },
);

export default function HomePage() {
    return (
        <Suspense fallback={<Loading />}>
            <ArchiveExperience />
        </Suspense>
    );
}
