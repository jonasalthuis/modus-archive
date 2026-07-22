"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { getArchivePromises } from "@/lib/archivePrefetch";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ChevronLeft, ChevronRight, Columns, Eye, EyeOff, FilterX, Maximize, Minimize2, Pause, Play, RotateCcw, Shuffle, X } from "lucide-react";
import { db } from "@/lib/firebase";
import { Scene, type Target, type CameraCommand } from "./Scene";
import { GridControls } from "./GridControls";
import { ClusterControls } from "./ClusterControls";
import { SortControls } from "./SortControls";
import { ScaleDock } from "./ScaleDock";
import { SearchBar } from "./SearchBar";
import { ControlsHelp } from "./ControlsHelp";
import {
    applyFilters,
    clusteredLayout,
    computeSections,
    distinctScales,
    gridLayout,
    GROUP_ATTRS,
    makeKeyOf,
    sortModels,
    universeLayout,
    type SortAttr,
} from "./layouts";
import {
    type Cluster,
    type Filters,
    type GroupAttr,
    type UniverseModel,
    type Vec3,
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
// tooltipAlign="right" pins the tooltip to the button's right edge (for rightmost buttons).
function TooltipButton({
    icon,
    label,
    onClick,
    active = false,
    tooltipAlign = "center",
}: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    active?: boolean;
    tooltipAlign?: "center" | "right";
}) {
    return (
        <div className="relative group/btn">
            <button
                onClick={onClick}
                aria-label={label}
                className={`flex items-center justify-center w-[34px] h-[34px] rounded-md border transition-colors ${
                    active
                        ? "bg-stone-900 text-white border-stone-900"
                        : "bg-white/50 backdrop-blur-xl hover:backdrop-blur-none text-stone-400 border-stone-200 hover:bg-stone-900 hover:border-stone-900 hover:text-white"
                }`}
            >
                {icon}
            </button>
            <span className={`absolute bottom-full mb-2 px-2 py-1 whitespace-nowrap text-[9px] uppercase tracking-[0.25em] font-bold text-stone-900 bg-white/50 backdrop-blur-xl border border-stone-200 rounded pointer-events-none opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150 ${
                tooltipAlign === "right" ? "right-0" : "left-1/2 -translate-x-1/2"
            }`}>
                {label}
            </span>
        </div>
    );
}

// ── Card focus overlay — floats above the bottom edge when a card is selected ──

function MetaItem({ label, value, className = "flex-1 basis-0" }: { label: string; value?: string | number; className?: string }) {
    if (!value) return null;
    return (
        <div className={`flex flex-col gap-1 min-w-0 ${className}`}>
            <span className="text-[8px] uppercase tracking-[0.35em] font-bold text-stone-400 whitespace-nowrap">
                {label}
            </span>
            <span className="text-[11px] uppercase tracking-[0.15em] font-bold text-stone-700">
                {value}
            </span>
        </div>
    );
}

function CardFocusOverlay({
    model,
    onClose,
    onNavigate,
}: {
    model: UniverseModel | null;
    onClose: () => void;
    onNavigate: (id: string) => void;
}) {
    const visible = model !== null;

    return (
        <div
            onClick={(e) => e.stopPropagation()}
            className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(94vw,900px)] transition-all duration-300 ease-out ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
            }`}
        >
            <div className="bg-white/55 backdrop-blur-xl border border-stone-200 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
                <div className="px-6 py-4">
                    {/* Row 1: number + title + buttons */}
                    <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="min-w-0 flex-1">
                            <h2 className="text-[17px] font-light text-stone-900 leading-snug truncate">
                                {model?.title ?? "—"}
                            </h2>
                            <p className="font-mono text-[10px] text-stone-400 mt-0.5 tracking-wide">
                                {model?.modelNumber}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
                            <button
                                onClick={() => model && onNavigate(model.id)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white text-[9px] uppercase tracking-[0.3em] font-bold hover:bg-stone-700 transition-colors rounded-md"
                            >
                                View
                                <ArrowRight size={11} />
                            </button>
                            <button
                                onClick={onClose}
                                aria-label="Close"
                                className="flex items-center justify-center w-[34px] h-[34px] bg-white/50 backdrop-blur-xl hover:backdrop-blur-none border border-stone-200 rounded-md hover:bg-stone-900 hover:border-stone-900 hover:text-white transition-colors text-stone-400"
                            >
                                <X size={13} />
                            </button>
                        </div>
                    </div>

                    {/* Row 2: spread metadata */}
                    <div className="flex gap-4 pt-3 border-t border-stone-100">
                        <MetaItem label="Architect" value={model?.architect} className="flex-[3] basis-0 min-w-0" />
                        <MetaItem label="Model Builder" value={model?.leadMaker} className="flex-[2] basis-0 min-w-0" />
                        <MetaItem label="Year"      value={model?.year} />
                        <MetaItem label="Scale"     value={model?.scale} />
                        <MetaItem label="Location"  value={model?.location} className="flex-[2] basis-0 min-w-0" />
                        <MetaItem label="Type"      value={model?.buildingType} />
                        <MetaItem label="Status"    value={model?.buildingStatus} />
                    </div>
                </div>
            </div>
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

    // Persist last-used view so the NMA nav link restores it.
    useEffect(() => {
        try {
            if (view === "explore") sessionStorage.removeItem("archive_view");
            else sessionStorage.setItem("archive_view", view);
        } catch { /* private browsing */ }
    }, [view]);

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
    const [loading, setLoading] = useState(true);
    const [paused, setPaused] = useState(false);
    // Random seed per session so explore positions differ on each page load.
    const [layoutSeed] = useState(() => Math.random().toString(36).slice(2));
    const [hideFiltered, setHideFiltered] = useState(false);
    const [collapseToken, setCollapseToken] = useState(0);
    const [expandToken, setExpandToken] = useState(0);
    const [panelsCollapsed, setPanelsCollapsed] = useState(false);

    // ── URL-derived state ──────────────────────────────────────────────────────
    // Stable ref so callbacks can always read the latest params without
    // appearing in their dependency arrays (avoids infinite re-render loops).
    const searchParamsRef = useRef(searchParams);
    searchParamsRef.current = searchParams;

    const VALID_SORTS: SortAttr[] = ["default", "scale", "year", "architect", "leadMaker", "modelType", "buildingType", "buildingStatus", "location"];

    const filters: Filters = useMemo(() => ({
        text: searchParams.get("q") ?? "",
        pinnedTerms: searchParams.getAll("pin"),
        modelType: searchParams.get("type"),
        buildingType: searchParams.get("building"),
        buildingStatus: searchParams.get("status"),
        leadMaker: searchParams.get("maker"),
        material: searchParams.get("material"),
        decade: searchParams.get("decade"),
        scales: searchParams.getAll("scale"),
    }), [searchParams]);

    const sort: SortAttr = useMemo(() => {
        const s = searchParams.get("sort");
        return s && VALID_SORTS.includes(s as SortAttr) ? (s as SortAttr) : "default";
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const focusedId = searchParams.get("focus");

    // ── URL write helper ───────────────────────────────────────────────────────
    const updateUrl = useCallback(
        (updates: Record<string, string | string[] | null>) => {
            const params = new URLSearchParams(searchParamsRef.current.toString());
            for (const [key, value] of Object.entries(updates)) {
                params.delete(key);
                if (value === null) continue;
                if (Array.isArray(value)) {
                    for (const v of value) if (v) params.append(key, v);
                } else if (value) {
                    params.set(key, value);
                }
            }
            const qs = params.toString();
            router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        },
        [router, pathname],
    );

    const setFilters = useCallback(
        (f: Filters) =>
            updateUrl({
                q: f.text || null,
                pin: f.pinnedTerms,
                type: f.modelType,
                building: f.buildingType,
                status: f.buildingStatus,
                maker: f.leadMaker,
                material: f.material,
                decade: f.decade,
                scale: f.scales,
            }),
        [updateUrl],
    );

    const setSort = useCallback(
        (s: SortAttr) => updateUrl({ sort: s === "default" ? null : s }),
        [updateUrl],
    );

    const togglePanels = useCallback(() => {
        if (panelsCollapsed) {
            setExpandToken((t) => t + 1);
            setPanelsCollapsed(false);
        } else {
            setCollapseToken((t) => t + 1);
            setPanelsCollapsed(true);
        }
    }, [panelsCollapsed]);

    // Camera command — bump token to move the camera. Starts at "default".
    const [cameraCmd, setCameraCmd] = useState<CameraCommand>({ type: "default", token: 0 });
    const issue = useCallback((type: CameraCommand["type"]) => {
        setCameraCmd((c) => ({ type, token: c.token + 1 }));
    }, []);
    const issueFocus = useCallback((pos: Vec3) => {
        setCameraCmd((c) => ({ type: "focus", token: c.token + 1, focusPos: pos }));
    }, []);

    // Focused card state — ID from URL, model object derived from models array.
    const focusedModel = useMemo(
        () => (focusedId ? (models.find((m) => m.id === focusedId) ?? null) : null),
        [focusedId, models],
    );

    const preFocusPaused = useRef(false);
    const pausedRef = useRef(false);
    pausedRef.current = paused;

    const focusCard = useCallback(
        (model: UniverseModel, pos: Vec3) => {
            preFocusPaused.current = pausedRef.current;
            updateUrl({ focus: model.id });
            setPaused(true);
            issueFocus(pos);
        },
        [issueFocus, updateUrl],
    );

    const handleFocus = useCallback(
        (model: UniverseModel, pos: Vec3) => {
            if (focusedId === model.id) {
                router.push(`/models/${model.id}`);
                return;
            }
            focusCard(model, pos);
        },
        [focusedId, router, focusCard],
    );

    const handleDismiss = useCallback(() => {
        updateUrl({ focus: null });
        setPaused(preFocusPaused.current);
        issue("fit");
    }, [issue, updateUrl]);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const { modelsSnap: modelsP, dossierSnap: dossierP } = getArchivePromises();
                const [modelsSnap, dossierSnap] = await Promise.all([modelsP, dossierP]);
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

    // Suggestion strings for search autocomplete.
    const allSuggestions = useMemo(() => {
        const set = new Set<string>();
        for (const m of models) {
            if (m.architect) set.add(m.architect);
            if (m.title) set.add(m.title);
            if (m.location) set.add(m.location);
            if (m.buildingType) set.add(m.buildingType);
            if (m.leadMaker) set.add(m.leadMaker);
            if (m.modelType) set.add(m.modelType);
            if (m.buildingStatus) set.add(m.buildingStatus);
            if (m.scale) set.add(m.scale);
            if (m.year) set.add(String(m.year));
            m.materials?.forEach((mat) => { if (mat) set.add(mat); });
        }
        return Array.from(set).sort();
    }, [models]);

    // Sort + filter pipeline (grid only; explore ignores sort/filter).
    const sortedModels = useMemo(() => sortModels(models, sort), [models, sort]);
    const filtered = useMemo(() => applyFilters(sortedModels, filters), [sortedModels, filters]);
    const scales = useMemo(() => distinctScales(models), [models]);

    // Whether any filter is currently active in grid mode
    const hasFilter = useMemo(
        () =>
            view === "grid" &&
            (filters.pinnedTerms.length > 0 ||
                !!filters.text.trim() ||
                !!filters.modelType ||
                !!filters.buildingType ||
                !!filters.buildingStatus ||
                !!filters.leadMaker ||
                !!filters.material ||
                !!filters.decade ||
                filters.scales.length > 0),
        [view, filters],
    );

    // Layout computation — expensive, only re-runs when layout-related deps change.
    const { baseTargets, clusters } = useMemo(() => {
        const map = new Map<string, Target>();
        let cl: Cluster[] = [];

        if (view === "grid") {
            // Full grid: all sorted models (used for dim mode and as fallback positions).
            const { positions: fullPos } = gridLayout(sortedModels, sort);
            const filteredIds = new Set(filtered.map((m) => m.id));

            if (hideFiltered && hasFilter) {
                // Compact grid: only filtered models, sorted — they animate to new positions.
                const { positions: compactPos } = gridLayout(filtered, sort);
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
            const uni = universeLayout(models, layoutSeed);
            for (const m of models) map.set(m.id, { pos: uni.get(m.id)!, visible: true });
        } else {
            const sortMode = GROUP_ATTRS.find((a) => a.key === group)?.sortMode ?? "alpha";
            const { positions, clusters: c } = clusteredLayout(models, makeKeyOf(group, dossierMap), sortMode);
            cl = c;
            for (const m of models) map.set(m.id, { pos: positions.get(m.id)!, visible: true });
        }
        return { baseTargets: map, clusters: cl };
    }, [view, group, sort, sortedModels, filtered, models, dossierMap, hasFilter, hideFiltered, layoutSeed]);

    // Apply focus dim-override cheaply without recomputing layouts.
    // The focused model is always fully lit+visible regardless of active filters.
    const targets = useMemo(() => {
        if (!focusedModel) return baseTargets;
        const map = new Map(baseTargets);
        map.forEach((t, id) => {
            if (id !== focusedModel.id) {
                map.set(id, { ...t, dimmed: true });
            } else {
                // Override: focused card is always visible and undimmed
                map.set(id, { ...t, dimmed: false, visible: true });
            }
        });
        return map;
    }, [baseTargets, focusedModel]);

    // Prev/next navigation.
    // Grid: walk the sorted/filtered list by index.
    // Explore: find the spatially nearest models (left / right by X) to avoid jarring jumps.
    const { prevModel, nextModel } = useMemo(() => {
        if (!focusedModel) return { prevModel: null, nextModel: null };

        if (view === "grid") {
            const list = hasFilter ? filtered : sortedModels;
            const idx = list.findIndex((m) => m.id === focusedModel.id);
            return {
                prevModel: idx > 0 ? list[idx - 1] : null,
                nextModel: idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null,
            };
        }

        // Explore mode — sort by spatial distance; prev = nearest to the left, next = nearest to the right.
        const focusPos = targets.get(focusedModel.id)?.pos;
        if (!focusPos) return { prevModel: null, nextModel: null };
        const [fx, fy, fz] = focusPos;

        let prevCandidate: UniverseModel | null = null;
        let prevDist = Infinity;
        let nextCandidate: UniverseModel | null = null;
        let nextDist = Infinity;

        for (const m of models) {
            if (m.id === focusedModel.id) continue;
            const pos = targets.get(m.id)?.pos;
            if (!pos) continue;
            const [px, py, pz] = pos;
            const dx = px - fx, dy = py - fy, dz = pz - fz;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (px < fx && dist < prevDist) { prevDist = dist; prevCandidate = m; }
            if (px >= fx && dist < nextDist) { nextDist = dist; nextCandidate = m; }
        }
        return { prevModel: prevCandidate, nextModel: nextCandidate };
    }, [view, sortedModels, filtered, models, focusedModel, targets, hasFilter]);

    const handlePrev = useCallback(() => {
        if (!prevModel) return;
        const pos = targets.get(prevModel.id)?.pos;
        if (pos) focusCard(prevModel, pos);
    }, [prevModel, targets, focusCard]);

    const handleNext = useCallback(() => {
        if (!nextModel) return;
        const pos = targets.get(nextModel.id)?.pos;
        if (pos) focusCard(nextModel, pos);
    }, [nextModel, targets, focusCard]);

    // Reset all grid state (filters, search, sort, scale).
    const handleResetAll = useCallback(() => {
        updateUrl({ q: null, pin: null, type: null, building: null, status: null, maker: null, material: null, decade: null, scale: null, sort: null });
        setHideFiltered(false);
    }, [updateUrl]);

    // Jump to a random model in explore view.
    const handleRandom = useCallback(() => {
        if (models.length === 0) return;
        const m = models[Math.floor(Math.random() * models.length)];
        const pos = targets.get(m.id)?.pos;
        if (pos) focusCard(m, pos);
    }, [models, targets, focusCard]);

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

    // Dismiss focus when view changes.
    useEffect(() => {
        const params = new URLSearchParams(searchParamsRef.current.toString());
        if (params.has("focus")) {
            params.delete("focus");
            const qs = params.toString();
            router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view]);

    // Dismiss focus on scroll/pinch zoom-out.
    useEffect(() => {
        if (!focusedId) return;
        const handler = (e: WheelEvent) => {
            const isZoomOut = e.ctrlKey ? e.deltaY > 0 : e.deltaX === 0 && e.deltaY >= 40;
            if (isZoomOut) {
                e.preventDefault();
                handleDismiss();
            }
        };
        window.addEventListener("wheel", handler, { capture: true, passive: false });
        return () => window.removeEventListener("wheel", handler, { capture: true } as AddEventListenerOptions);
    }, [focusedId, handleDismiss]);

    // Arrow key navigation + Escape to dismiss when a card is focused.
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (!focusedId) return;
            if (e.key === "ArrowLeft")  { e.preventDefault(); handlePrev(); }
            if (e.key === "ArrowRight") { e.preventDefault(); handleNext(); }
            if (e.key === "Escape")     { e.preventDefault(); handleDismiss(); }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [focusedId, handlePrev, handleNext, handleDismiss]);

    // Section labels for the sorted grid (shown above first card of each group).
    const sectionLabels = useMemo(() => {
        if (view !== "grid" || sort === "default" || hideFiltered) return [];
        const { positions, cols } = gridLayout(sortedModels, sort);
        return computeSections(sortedModels, sort, cols).map(({ id, label }) => {
            const p = positions.get(id);
            if (!p) return null;
            // Left edge of card, just above its top edge
            return { id, label, pos: [p[0] - 1.35, p[1] + 1.1, 0.05] as Vec3 };
        }).filter((x): x is { id: string; label: string; pos: Vec3 } => x !== null);
    }, [view, sort, sortedModels, hideFiltered]);

    const isFocused = focusedModel !== null;

    return (
        <div className="fixed inset-0 bg-white">
            {/* Loading overlay — canvas renders immediately, models animate in */}
            {loading && (
                <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-20">
                    <div className="space-y-3 text-center">
                        <div className="w-12 h-px bg-stone-300 mx-auto animate-pulse" />
                        <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-300">Loading archive</p>
                    </div>
                </div>
            )}
            {!loading && models.length === 0 && (
                <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-20">
                    <p className="text-[10px] uppercase tracking-[0.5em] font-bold text-stone-300">No models published yet</p>
                </div>
            )}
            <Canvas
                camera={{ position: [0, 0, 16], fov: 62, near: 0.1, far: 300 }}
                gl={{ antialias: true, alpha: false }}
                dpr={[1, 2]}
                onPointerMissed={() => { if (focusedModel) handleDismiss(); }}
            >
                <Scene
                    models={models}
                    targets={targets}
                    mode={view}
                    group={group}
                    clusters={clusters}
                    cameraCmd={cameraCmd}
                    paused={paused}
                    focusedId={focusedModel?.id ?? null}
                    onFocus={handleFocus}
                />
                {/* Section labels — rendered in 3D space above first card of each sort group */}
                {!isFocused && sectionLabels.map(({ id, label, pos }) => (
                    <Html key={id} position={pos} distanceFactor={22} zIndexRange={[5, 0]}>
                        <div className="pointer-events-none" style={{ transform: "translateY(-100%)" }}>
                            <div className="flex items-end gap-1">
                                <div className="w-px bg-stone-300/70 flex-shrink-0" style={{ height: "14px" }} />
                                <span className="text-[7px] uppercase tracking-[0.35em] font-bold text-stone-400/90 whitespace-nowrap pb-px">
                                    {label}
                                </span>
                            </div>
                        </div>
                    </Html>
                ))}
            </Canvas>

            {/* Controls — hidden while loading */}
            {!loading && models.length > 0 && <>

            {/* Prev / next arrows — shown when a card is focused */}
            {isFocused && prevModel && (
                <button
                    onClick={handlePrev}
                    aria-label="Previous model"
                    className="fixed left-4 top-1/2 -translate-y-1/2 z-50 flex items-center justify-center w-[34px] h-[34px] bg-white/50 backdrop-blur-xl hover:backdrop-blur-none border border-stone-200 rounded-md hover:bg-stone-900 hover:border-stone-900 hover:text-white transition-colors text-stone-400"
                >
                    <ChevronLeft size={15} />
                </button>
            )}
            {isFocused && nextModel && (
                <button
                    onClick={handleNext}
                    aria-label="Next model"
                    className="fixed right-4 top-1/2 -translate-y-1/2 z-50 flex items-center justify-center w-[34px] h-[34px] bg-white/50 backdrop-blur-xl hover:backdrop-blur-none border border-stone-200 rounded-md hover:bg-stone-900 hover:border-stone-900 hover:text-white transition-colors text-stone-400"
                >
                    <ChevronRight size={15} />
                </button>
            )}

            {/* Search bar — grid only, hidden when focused */}
            {view === "grid" && !isFocused && (
                <Suspense fallback={null}>
                    <SearchBar
                        allSuggestions={allSuggestions}
                        collapseToken={collapseToken}
                        expandToken={expandToken}
                    />
                </Suspense>
            )}

            {view === "grid" && !isFocused && (
                <GridControls
                    models={models}
                    filters={filters}
                    onChange={(f) => {
                        setFilters(f);
                        const anyActive =
                            f.pinnedTerms.length > 0 ||
                            !!f.text.trim() ||
                            !!f.modelType ||
                            !!f.buildingType ||
                            !!f.buildingStatus ||
                            !!f.leadMaker ||
                            !!f.material ||
                            !!f.decade ||
                            f.scales.length > 0;
                        if (!anyActive) setHideFiltered(false);
                    }}
                    collapseToken={collapseToken}
                    expandToken={expandToken}
                />
            )}
            {view === "grid" && !isFocused && <SortControls sort={sort} onChange={setSort} collapseToken={collapseToken} expandToken={expandToken} />}
            {view === "explore" && !isFocused && <ClusterControls groupBy={group} onChange={setGroup} collapseToken={collapseToken} expandToken={expandToken} />}

            {/* Bottom scale filter (grid only, hidden when focused) */}
            {view === "grid" && !isFocused && (
                <ScaleDock
                    scales={scales}
                    selected={filters.scales}
                    onChange={(next) => {
                        setFilters({ ...filters, scales: next });
                        if (next.length === 0) setHideFiltered(false);
                    }}
                    collapseToken={collapseToken}
                    expandToken={expandToken}
                />
            )}

            {/* Controls help (bottom-left) */}
            {!isFocused && <ControlsHelp mode={view} />}

            {/* Bottom-right action bar — hidden when a card is focused */}
            {!isFocused && (
                <div className="fixed bottom-4 right-4 z-40 flex items-end gap-2">
                    {view === "grid" && hasFilter && (
                        <TooltipButton
                            icon={hideFiltered ? <Eye size={13} /> : <EyeOff size={13} />}
                            label={hideFiltered ? "Show all" : "Hide filtered"}
                            onClick={() => setHideFiltered((h) => !h)}
                            active={hideFiltered}
                        />
                    )}
                    {view === "grid" && (
                        <TooltipButton
                            icon={<FilterX size={13} />}
                            label="Reset all"
                            onClick={handleResetAll}
                        />
                    )}
                    {view === "explore" && (
                        <>
                            <TooltipButton
                                icon={<Shuffle size={13} />}
                                label="Random model"
                                onClick={handleRandom}
                            />
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
                                label={paused ? "Resume animation" : "Pause animation"}
                                onClick={() => setPaused((p) => !p)}
                                active={paused}
                            />
                        </>
                    )}
                    <TooltipButton
                        icon={<Maximize size={13} />}
                        label="Fit all"
                        onClick={() => issue("fit")}
                    />
                    <TooltipButton
                        icon={panelsCollapsed ? <Columns size={13} /> : <Minimize2 size={13} />}
                        label={panelsCollapsed ? "Expand panels" : "Collapse panels"}
                        onClick={togglePanels}
                        tooltipAlign="right"
                    />
                </div>
            )}

            </> /* end controls guard */}

            {/* Card focus overlay — always rendered for smooth slide animation */}
            <CardFocusOverlay
                model={focusedModel}
                onClose={handleDismiss}
                onNavigate={(id) => router.push(`/models/${id}`)}
            />
        </div>
    );
}
