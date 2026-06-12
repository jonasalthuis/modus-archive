"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { collection, getDocs, query, where } from "firebase/firestore";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Maximize, Pause, Play, RotateCcw } from "lucide-react";
import { db } from "@/lib/firebase";
import { Scene, type Target, type CameraCommand } from "./Scene";
import { GridControls } from "./GridControls";
import { ClusterControls } from "./ClusterControls";
import { SortControls } from "./SortControls";
import { ScaleDock } from "./ScaleDock";
import { ControlsHelp } from "./ControlsHelp";
import {
    applyFilters,
    clusteredLayout,
    distinctScales,
    gridLayout,
    GROUP_ATTRS,
    makeKeyOf,
    sortModels,
    universeLayout,
    type SortAttr,
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

// Icon-only button with a small tooltip label that appears on hover.
function TooltipButton({
    icon,
    label,
    onClick,
    active = false,
}: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    active?: boolean;
}) {
    return (
        <div className="relative group/btn">
            <button
                onClick={onClick}
                aria-label={label}
                className={`flex items-center justify-center w-[34px] h-[34px] rounded-md border transition-colors ${
                    active
                        ? "bg-stone-900 text-white border-stone-900"
                        : "bg-white text-stone-400 border-stone-200 hover:border-stone-900 hover:text-stone-900"
                }`}
            >
                {icon}
            </button>
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 whitespace-nowrap text-[9px] uppercase tracking-[0.25em] font-bold text-stone-900 bg-white border border-stone-200 rounded pointer-events-none opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150">
                {label}
            </span>
        </div>
    );
}

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
    const [paused, setPaused] = useState(false);
    const [hideFiltered, setHideFiltered] = useState(false);
    const [sort, setSort] = useState<SortAttr>("default");

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

    // Sort + filter pipeline (grid only; explore ignores sort/filter).
    const sortedModels = useMemo(() => sortModels(models, sort), [models, sort]);
    const filtered = useMemo(() => applyFilters(sortedModels, filters), [sortedModels, filters]);
    const scales = useMemo(() => distinctScales(models), [models]);

    // Whether any filter is currently active in grid mode
    const hasFilter = useMemo(
        () =>
            view === "grid" &&
            (!!filters.text.trim() ||
                !!filters.modelType ||
                !!filters.buildingType ||
                !!filters.buildingStatus ||
                filters.scales.length > 0),
        [view, filters],
    );

    const { targets, clusters } = useMemo(() => {
        const map = new Map<string, Target>();
        let cl: Cluster[] = [];

        if (view === "grid") {
            // Full grid: all sorted models (used for dim mode and as fallback positions).
            const { positions: fullPos } = gridLayout(sortedModels);
            const filteredIds = new Set(filtered.map((m) => m.id));

            if (hideFiltered && hasFilter) {
                // Compact grid: only filtered models, sorted — they animate to new positions.
                const { positions: compactPos } = gridLayout(filtered);
                for (const m of sortedModels) {
                    if (filteredIds.has(m.id)) {
                        map.set(m.id, { pos: compactPos.get(m.id)!, visible: true });
                    } else {
                        // Fade out at the full-grid position so they animate back correctly on unhide.
                        map.set(m.id, { pos: fullPos.get(m.id)!, visible: false });
                    }
                }
            } else {
                // Full grid: all models visible, non-matching dimmed.
                for (const m of sortedModels) {
                    const matches = !hasFilter || filteredIds.has(m.id);
                    map.set(m.id, { pos: fullPos.get(m.id)!, visible: true, dimmed: !matches });
                }
            }
        } else if (group === "none") {
            const uni = universeLayout(models);
            for (const m of models) map.set(m.id, { pos: uni.get(m.id)!, visible: true });
        } else {
            const sortMode = GROUP_ATTRS.find((a) => a.key === group)?.sortMode ?? "alpha";
            const { positions, clusters: c } = clusteredLayout(models, makeKeyOf(group, dossierMap), sortMode);
            cl = c;
            for (const m of models) map.set(m.id, { pos: positions.get(m.id)!, visible: true });
        }
        return { targets: map, clusters: cl };
    }, [view, group, sortedModels, filtered, models, dossierMap, hasFilter, hideFiltered]);

    // Camera re-frame logic.
    // Grid: re-frame on view change, hideFiltered toggle, or compact-grid size change.
    // Explore: re-frame on view change or grouping change.
    const prev = useRef<{
        view: ViewMode;
        group: GroupAttr;
        hideFiltered: boolean;
        filteredCount: number;
    } | null>(null);
    useEffect(() => {
        if (loading) return;
        const p = prev.current;

        if (!p) {
            if (view === "grid" || group !== "none") issue("fit");
        } else if (view !== p.view) {
            if (view === "grid") issue("fit");
            else issue(group === "none" ? "default" : "fit");
        } else if (view === "explore" && group !== p.group) {
            if (group === "none") issue("default");
            else issue("fit"); // always re-frame when entering or switching groupings
        } else if (view === "grid" && hideFiltered !== p.hideFiltered) {
            issue("fit");
        } else if (view === "grid" && hideFiltered && filtered.length !== p.filteredCount) {
            // Compact grid changed size while hidden → re-frame.
            issue("fit");
        }
        prev.current = { view, group, hideFiltered, filteredCount: filtered.length };
    }, [view, group, hideFiltered, filtered.length, loading, issue]);

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
                    paused={paused}
                />
            </Canvas>

            {view === "grid" && (
                <GridControls
                    models={models}
                    filters={filters}
                    onChange={(f) => {
                        setFilters(f);
                        // If all filters cleared, exit hideFiltered mode automatically.
                        const anyActive =
                            !!f.text.trim() ||
                            !!f.modelType ||
                            !!f.buildingType ||
                            !!f.buildingStatus ||
                            f.scales.length > 0;
                        if (!anyActive) setHideFiltered(false);
                    }}
                />
            )}
            {view === "grid" && <SortControls sort={sort} onChange={setSort} />}
            {view === "explore" && <ClusterControls groupBy={group} onChange={setGroup} />}

            {/* Bottom-docked scale filter (grid only) */}
            {view === "grid" && (
                <ScaleDock
                    scales={scales}
                    selected={filters.scales}
                    onChange={(next) => {
                        setFilters((f) => ({ ...f, scales: next }));
                        if (next.length === 0) setHideFiltered(false);
                    }}
                />
            )}

            {/* Controls help (bottom-left) */}
            <ControlsHelp mode={view} />

            {/* Bottom-right action bar */}
            <div className="fixed bottom-6 right-6 z-40 flex items-end gap-2">
                {/* Hide / show filtered — grid mode, only when a filter is active */}
                {view === "grid" && hasFilter && (
                    <TooltipButton
                        icon={hideFiltered ? <Eye size={13} /> : <EyeOff size={13} />}
                        label={hideFiltered ? "Show all" : "Hide filtered"}
                        onClick={() => setHideFiltered((h) => !h)}
                        active={hideFiltered}
                    />
                )}

                {/* Reset + Pause/Play — explore mode only */}
                {view === "explore" && (
                    <>
                        <TooltipButton
                            icon={<RotateCcw size={13} />}
                            label="Reset view"
                            onClick={() => {
                                issue("default");
                                setPaused(true);
                            }}
                        />
                        <TooltipButton
                            icon={paused ? <Play size={13} /> : <Pause size={13} />}
                            label={paused ? "Resume" : "Pause"}
                            onClick={() => setPaused((p) => !p)}
                            active={paused}
                        />
                    </>
                )}

                {/* Fit all — always */}
                <TooltipButton
                    icon={<Maximize size={13} />}
                    label="Fit all"
                    onClick={() => issue("fit")}
                />
            </div>
        </div>
    );
}
