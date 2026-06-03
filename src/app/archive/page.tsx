"use client";

import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import dynamic from "next/dynamic";
import type { UniverseModel } from "@/components/universe/ArchiveUniverse";

// Three.js canvas — loaded client-side only (large bundle, code-split automatically)
const ArchiveUniverse = dynamic(
    () => import("@/components/universe/ArchiveUniverse").then(m => m.ArchiveUniverse),
    {
        ssr: false,
        loading: () => (
            <div className="fixed inset-0 flex items-center justify-center bg-stone-50">
                <div className="space-y-3 text-center">
                    <div className="w-12 h-px bg-stone-300 mx-auto animate-pulse" />
                    <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-300">
                        Loading universe…
                    </p>
                </div>
            </div>
        ),
    },
);

interface ModelRecord extends UniverseModel {
    inPrototype?: boolean;
    [key: string]: unknown;
}

export default function ArchivePage() {
    const [models, setModels] = useState<ModelRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchModels() {
            try {
                // Firestore rules allow reads only where isVisible == true,
                // so include the matching filter in the query. Sort client-side.
                const q = query(collection(db, "ma_models"), where("isVisible", "==", true));
                const snap = await getDocs(q);
                const all = snap.docs
                    .map(d => ({ id: d.id, ...d.data() }) as ModelRecord)
                    .filter(m => m.inPrototype === true)
                    .sort((a, b) => (a.modelNumber ?? "").localeCompare(b.modelNumber ?? ""));
                setModels(all);
            } catch (err) {
                console.error("Failed to fetch archive:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchModels();
    }, []);

    if (loading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-stone-50">
                <div className="space-y-3 text-center">
                    <div className="w-12 h-px bg-stone-300 mx-auto animate-pulse" />
                    <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-300">
                        Loading collection…
                    </p>
                </div>
            </div>
        );
    }

    return <ArchiveUniverse models={models} />;
}
