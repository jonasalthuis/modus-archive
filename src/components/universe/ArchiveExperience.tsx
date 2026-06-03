"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { collection, getDocs, query, where } from "firebase/firestore";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Maximize } from "lucide-react";
import { db } from "@/lib/firebase";
import { Scene, type Target, type CameraCommand } from "./Scene";
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
        images: Array.isArray(d.images) ? (d.images as UniverseModel["images"]) : undefined,
    };
}

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

const VIEW_MODES: ViewMode[] = ["explore", "grid"];

function LoadingScreen({ label }: { label: string }) {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-white">
            <div className="space-y-3 text-center">
                <div className="w-12 h-px bg-stone-300 mx-auto animate-pulse" />
                <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-300">{label}</p>
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
        return v && VIEW_MODES.includes(v) ? v : "explore";
    }, [searchParams]);

    const group: GroupAttr = useMemo(
        () => (searchParams.get("group") as GroupAttr) || "none",
        [searchParams],
    );

    const setGroup = useCallback(
        (g: GroupAttr) => {
            const params = new URLSearchParams(searchParams.toString());
            if (g === "none") params.delete("group");
            else params.set("group", g);
            const qs = params.toString();
            router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        },
        [router, pathname, searchParams],
    );

    const [models, setModels] = useState<UniverseModel[]>([]);
    const [dossierMap, setDossierMap] = useState<Map<string, string[]>>(new Map());
    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
    const [loading, setLoading] = useState(true);

    // Camera command — bump token to move the camera. Starts at "default".
    const [cameraCmd, setCameraCmd] = useState<CameraCommand>({ type: "default", token: 0 });
    const issue = useCallback((type: CameraCommand["type"]) => {
        setCameraCmd((c) => ({ type, token: c.token + 1 }));
    }, []);

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

    // Grid applies filters; explore shows everything.
    const filtered = useMemo(() => applyFilters(models, filters), [models, filters]);

    const { targets, clusters } = useMemo(() => {
        const map = new Map<string, Target>();
        let cl: Cluster[] = [];

        if (view === "grid") {
            const { positions } = gridLayout(filtered);
            const uni = universeLayout(models);
            for (const m of models) {
                const p = positions.get(m.id);
                map.set(m.id, p ? { pos: p, visible: true } : { pos: uni.get(m.id)!, visible: false });
            }
        } else if (group === "none") {
            const uni = universeLayout(models);
            for (const m of models) map.set(m.id, { pos: uni.get(m.id)!, visible: true });
        } else {
            const { positions, clusters: c } = clusteredLayout(models, makeKeyOf(group, dossierMap));
            cl = c;
            for (const m of models) map.set(m.id, { pos: positions.get(m.id)!, visible: true });
        }
        return { targets: map, clusters: cl };
    }, [view, group, models, filtered, dossierMap]);

    // Decide when the camera re-frames. Crucially, changing the grouping
    // attribute (attribute → attribute) does NOT move the camera, so you can
    // watch the cards migrate between clusters.
    const prev = useRef<{ view: ViewMode; group: GroupAttr; gridCount: number } | null>(null);
    useEffect(() => {
        if (loading) return;
        const gridCount = view === "grid" ? filtered.length : -1;
        const p = prev.current;

        if (!p) {
            // Initial frame: explore+none keeps the default close view; otherwise fit.
            if (view === "grid" || group !== "none") issue("fit");
        } else if (view !== p.view) {
            if (view === "grid") issue("fit");
            else issue(group === "none" ? "default" : "fit");
        } else if (view === "explore" && group !== p.group) {
            if (group === "none") issue("default"); // back to the open universe
            else if (p.group === "none") issue("fit"); // entering clustering → frame it
            // attribute → attribute: leave the camera where it is
        } else if (view === "grid" && gridCount !== p.gridCount) {
            issue("fit");
        }
        prev.current = { view, group, gridCount };
    }, [view, group, filtered.length, loading, issue]);

    if (loading) return <LoadingScreen label="Loading collection…" />;
    if (models.length === 0) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-white">
                <p className="text-[10px] uppercase tracking-[0.5em] font-bold text-stone-300">
                    No models published yet
                </p>
            </div>
        );
    }

    const hint =
        view === "grid"
            ? "Scroll to pan · Pinch to zoom · Click to open"
            : "Drag to orbit · Shift-drag to pan · Scroll to zoom";

    return (
        <div className="fixed inset-0 bg-white">
            <Canvas
                camera={{ position: [0, 0, 16], fov: 62, near: 0.1, far: 300 }}
                gl={{ antialias: true, alpha: false }}
                dpr={[1, 2]}
            >
                <Scene
                    models={models}
                    targets={targets}
                    mode={view}
                    group={group}
                    clusters={clusters}
                    cameraCmd={cameraCmd}
                />
            </Canvas>

            {view === "grid" && (
                <GridControls models={models} filters={filters} onChange={setFilters} />
            )}
            {view === "explore" && <ClusterControls groupBy={group} onChange={setGroup} />}

            {/* Zoom-all / fit button */}
            <button
                onClick={() => issue("fit")}
                aria-label="Frame all models"
                className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-white border border-stone-200 rounded-md px-3 h-[34px] text-[9px] uppercase tracking-[0.3em] font-bold text-stone-500 hover:border-stone-900 hover:text-stone-900 transition-colors"
            >
                <Maximize size={13} />
                Fit all
            </button>

            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
                <p className="text-[9px] uppercase tracking-[0.4em] font-bold text-stone-400 select-none">
                    {hint}
                </p>
            </div>
        </div>
    );
}
