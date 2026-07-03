"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ModelData, ImageGroup, ModelImage } from "@/types/model";

const ModelCanvas = dynamic(
    () => import("@/components/canvas/ModelCanvas").then(m => m.ModelCanvas),
    {
        ssr: false,
        loading: () => (
            <div className="fixed inset-0 flex items-center justify-center bg-stone-50">
                <div className="space-y-3 text-center">
                    <div className="w-12 h-px bg-stone-300 mx-auto animate-pulse" />
                    <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-300">
                        Opening model…
                    </p>
                </div>
            </div>
        ),
    },
);

// ── Data helpers ───────────────────────────────────────────────────────────────

function str(v: unknown): string | undefined {
    if (typeof v === "string") { const t = v.trim(); return t.length ? t : undefined; }
    if (typeof v === "number") return String(v);
}
function num(v: unknown): number | undefined {
    if (typeof v === "number") return v;
    if (typeof v === "string" && !isNaN(Number(v))) return Number(v);
}
function strArr(v: unknown): string[] | undefined {
    if (!Array.isArray(v)) return undefined;
    const out = v.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
    return out.length ? out : undefined;
}

function sanitize(id: string, data: Record<string, unknown>): ModelData {
    return {
        id,
        isVisible: data.isVisible === true,
        modelNumber: str(data.modelNumber) ?? id,
        title: str(data.title),
        architect: str(data.architect),
        year: num(data.year),
        scale: str(data.scale),
        modelSize: str(data.modelSize) ?? str(data.size),
        materials: strArr(data.materials),
        photographer: str(data.photographer),
        notes: str(data.notes),
        buildingStatus: str(data.buildingStatus),
        buildingType: str(data.buildingType),
        modelType: str(data.modelType),
        location: str(data.location),
        leadMaker: str(data.leadMaker),
        provenance: str(data.provenance),
        tags: strArr(data.tags),
        voiceNarrative: str(data.voiceNarrative),
        images: Array.isArray(data.images) ? (data.images as ModelImage[]) : undefined,
        imageGroups: Array.isArray(data.imageGroups) ? (data.imageGroups as ImageGroup[]) : undefined,
    };
}

async function fetchModel(id: string): Promise<ModelData | null> {
    const snap = await getDoc(doc(db, "ma_models", id));
    if (!snap.exists()) return null;
    const data = snap.data();
    if (data.isVisible === false) return null;
    return sanitize(snap.id, data);
}

async function fetchNeighbors(id: string): Promise<{ prevId: string | null; nextId: string | null }> {
    try {
        const snap = await getDocs(query(collection(db, "ma_models"), where("isVisible", "==", true)));
        const ids = snap.docs.map(d => d.id).sort();
        const i = ids.indexOf(id);
        return { prevId: i > 0 ? ids[i - 1] : null, nextId: i < ids.length - 1 ? ids[i + 1] : null };
    } catch {
        return { prevId: null, nextId: null };
    }
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ModelPageClient({ modelId }: { modelId: string }) {
    const [model, setModel] = useState<ModelData | null>(null);
    const [prevId, setPrevId] = useState<string | null>(null);
    const [nextId, setNextId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        setLoading(true);
        setNotFound(false);
        Promise.all([fetchModel(modelId), fetchNeighbors(modelId)]).then(([m, n]) => {
            if (!m) { setNotFound(true); }
            else { setModel(m); }
            setPrevId(n.prevId);
            setNextId(n.nextId);
            setLoading(false);
        }).catch(() => {
            setNotFound(true);
            setLoading(false);
        });
    }, [modelId]);

    if (loading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-stone-50">
                <div className="space-y-3 text-center">
                    <div className="w-12 h-px bg-stone-300 mx-auto animate-pulse" />
                    <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-300">
                        Opening model…
                    </p>
                </div>
            </div>
        );
    }

    if (notFound || !model) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-stone-50">
                <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-300">
                    Model not found
                </p>
            </div>
        );
    }

    return <ModelCanvas model={model} prevId={prevId} nextId={nextId} />;
}
