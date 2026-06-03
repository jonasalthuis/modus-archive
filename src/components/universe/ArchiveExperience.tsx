"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { collection, getDocs, query, where } from "firebase/firestore";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { Scene, type Target } from "./Scene";
import { GridControls } from "./GridControls";
import { ClusterControls } from "./ClusterControls";
import {
    applyFilters,
    clusteredLayout,
    gridLayout,
    makeKeyOf,
    universeLayout,
} from "./layouts";
import {
    EMPTY_FILTERS,
    type Cluster,
    type Filters,
    type GroupAttr,
    type UniverseModel,
    type ViewMode,
} from "./types";

// ── Firestore → UniverseModel ────────────────────────────────────────────────

function str(v: unknown): string | undefined {
    if (typeof v === "string") {
        const t = v.trim();
        return t.length ? t : undefined;
    }
    if (typeof v === "number") return String(v);
}
function num(v: unknown): number | undefined {
    if (typeof v === "number") return v;
    if (typeof v === "string" && v.trim() && !isNaN(Number(v))) return Number(v);
}

function toUniverse(id: string, d: Record<string, unknown>): UniverseModel {
    return {
        id,
        modelNumber: str(d.modelNumber) ?? id,
        title: str(d.title),
        architect: str(d.architect),
        leadMaker: str(d.leadMaker),
        year: num(d.year),
        scale: str(d.scale),
        modelType: str(d.modelType),
        buildingType: str(d.buildingType),
        buildingStatus: str(d.buildingStatus),
        materials: Array.isArray(d.materials)
            ? (d.materials.filter((x) => typeof x === "string") as string[])
            : undefined,
        location: str(d.location),
        images: Array.isArray(d.images)
            ? (d.images as UniverseModel["images"])
            : undefined,
    };
}

// Map each model id → the dossier titles that reference it (via modelImage items).
interface DossierDoc {
    title?: string;
    items?: { type?: string; modelId?: string }[];
}
function buildDossierMap(docs: DossierDoc[]): Map<string, string[]> {
    const map = new Map<string, string[]>();
    for (const dos of docs) {
        const title = dos.title?.trim();
        if (!title || !Array.isArray(dos.items)) continue;
        for (const item of dos.items) {
            if (item?.type === "modelImage" && item.modelId) {
                const arr = map.get(item.modelId) ?? [];
                if (!arr.includes(title)) arr.push(title);
                map.set(item.modelId, arr);
            }
        }
    }
    return map;
}

// ── URL helpers ───────────────────────────────────────────────────────────────

const VIEW_MODES: ViewMode[] = ["universe", "grid", "clustered"];

function LoadingScreen({ label }: { label: string }) {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-stone-50">
            <div className="space-y-3 text-center">
                <div className="w-12 h-px bg-stone-300 mx-auto animate-pulse" />
                <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-300">
                    {label}
                </p>
            </div>
        </div>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function ArchiveExperience() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const view: ViewMode = useMemo(() => {
        const v = searchParams.get("view") as ViewMode | null;
        return v && VIEW_MODES.includes(v) ? v : "universe";
    }, [searchParams]);

    const group: GroupAttr = useMemo(
        () => (searchParams.get("group") as GroupAttr) || "architect",
        [searchParams],
    );

    const setGroup = useCallback(
        (g: GroupAttr) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("group", g);
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        },
        [router, pathname, searchParams],
    );

    const [models, setModels] = useState<UniverseModel[]>([]);
    const [dossierMap, setDossierMap] = useState<Map<string, string[]>>(new Map());
    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const [modelsSnap, dossierSnap] = await Promise.all([
                    getDocs(query(collection(db, "ma_models"), where("isVisible", "==", true))),
                    getDocs(query(collection(db, "ma_dossiers"), where("isVisible", "==", true))).catch(
                        () => null,
                    ),
                ]);
                if (!alive) return;

                const all = modelsSnap.docs
                    .map((doc) => ({ raw: doc.data(), id: doc.id }))
                    .filter((x) => x.raw.inPrototype === true)
                    .map((x) => toUniverse(x.id, x.raw))
                    .sort((a, b) => (a.modelNumber ?? "").localeCompare(b.modelNumber ?? ""));
                setModels(all);

                if (dossierSnap) {
                    setDossierMap(buildDossierMap(dossierSnap.docs.map((d) => d.data() as DossierDoc)));
                }
            } catch (err) {
                console.error("Failed to load archive:", err);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, []);

    // Filtered set drives grid/clustered layouts; universe shows everything.
    const filtered = useMemo(() => applyFilters(models, filters), [models, filters]);

    const { targets, clusters, fitKey } = useMemo(() => {
        const map = new Map<string, Target>();
        const uni = universeLayout(models);
        let cl: Cluster[] = [];
        let key = "universe";

        if (view === "grid") {
            const { positions } = gridLayout(filtered);
            for (const m of models) {
                const p = positions.get(m.id);
                map.set(m.id, p ? { pos: p, visible: true } : { pos: uni.get(m.id)!, visible: false });
            }
            key = `grid:${filtered.length}`;
        } else if (view === "clustered") {
            const { positions, clusters: c } = clusteredLayout(filtered, makeKeyOf(group, dossierMap));
            cl = c;
            for (const m of models) {
                const p = positions.get(m.id);
                map.set(m.id, p ? { pos: p, visible: true } : { pos: uni.get(m.id)!, visible: false });
            }
            key = `clustered:${group}:${filtered.length}`;
        } else {
            for (const m of models) map.set(m.id, { pos: uni.get(m.id)!, visible: true });
        }

        return { targets: map, clusters: cl, fitKey: key };
    }, [view, group, models, filtered, dossierMap]);

    if (loading) return <LoadingScreen label="Loading collection…" />;

    if (models.length === 0) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-stone-50">
                <p className="text-[10px] uppercase tracking-[0.5em] font-bold text-stone-300">
                    No models published yet
                </p>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-white">
            <Canvas
                camera={{ position: [0, 0, 15], fov: 62, near: 0.1, far: 200 }}
                gl={{ antialias: true, alpha: false }}
                dpr={[1, 2]}
            >
                <Scene
                    models={models}
                    targets={targets}
                    mode={view}
                    clusters={clusters}
                    fitKey={fitKey}
                />
            </Canvas>

            {/* Mode-specific header controls */}
            {view === "grid" && (
                <GridControls models={models} filters={filters} onChange={setFilters} />
            )}
            {view === "clustered" && <ClusterControls groupBy={group} onChange={setGroup} />}

            {/* Hint overlay (floating modes only) */}
            {view !== "grid" && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
                    <p className="text-[9px] uppercase tracking-[0.4em] font-bold text-stone-400 select-none">
                        Drag to explore · Scroll to zoom · Click to open
                    </p>
                </div>
            )}
        </div>
    );
}
