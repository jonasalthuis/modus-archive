"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, RotateCcw, Pin, PinOff, ChevronLeft, ChevronRight, Play, Pause, Square, Maximize } from "lucide-react";
import { clean } from "@/lib/modelUtils";
import type { CanvasItemLayout, ImageGroup, ModelData } from "@/types/model";
import { AudioControllerContext, type AudioController } from "./audioContext";
import { CanvasBackground } from "./CanvasBackground";
import { TitleCard } from "./cards/TitleCard";
import { MetaCard } from "./cards/MetaCard";
import { NotesCard } from "./cards/NotesCard";
import { PhotoCard } from "./cards/PhotoCard";
import { GalleryCard } from "./cards/GalleryCard";
import { StripCard } from "./cards/StripCard";
import { AudioCard } from "./cards/AudioCard";
import { FeaturedCard } from "./cards/FeaturedCard";

// ─── Constants ────────────────────────────────────────────────────────────────

const SCALE_MIN = 0.2;
const SCALE_MAX = 1.8;
const DRAG_THRESHOLD_PX = 5;
const INITIAL_TRANSFORM = { x: 80, y: 80, scale: 1 };

// Zoom feel: lower sensitivity = slower zoom; lower ease = longer, softer glide.
const ZOOM_SENSITIVITY = 0.0019;
const ZOOM_EASE = 0.22;
const ZOOM_SETTLE = 0.0005;

type Slot = { x: number; y: number; jx: number; jy: number; rot: number };

// Base positions in canvas-space, with jitter range
const BASE_POSITIONS: Record<string, Slot> = {
    title: { x: 40, y: 40, jx: 20, jy: 15, rot: 1.5 },
    meta: { x: 820, y: 40, jx: 25, jy: 20, rot: 1.2 },
    "featured-main": { x: 380, y: 70, jx: 15, jy: 15, rot: 1.0 },
    "featured-secondary": { x: 430, y: 410, jx: 15, jy: 15, rot: 1.5 },
    notes: { x: 40, y: 400, jx: 20, jy: 25, rot: 2.0 },
    audio: { x: 840, y: 390, jx: 20, jy: 20, rot: 1.5 },
};
// Image groups get distributed across these slots (canvas-space)
const IMAGE_SLOTS: Slot[] = [
    { x: 400, y: 38, jx: 30, jy: 25, rot: 3.0 },
    { x: 40, y: 420, jx: 25, jy: 25, rot: 2.5 },
    { x: 430, y: 390, jx: 30, jy: 25, rot: 3.0 },
    { x: 820, y: 420, jx: 25, jy: 20, rot: 2.0 },
    { x: 700, y: 650, jx: 30, jy: 25, rot: 3.0 },
    { x: 150, y: 700, jx: 25, jy: 25, rot: 2.5 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jitter(range: number) {
    return (Math.random() - 0.5) * 2 * range;
}

function clamp(v: number, min: number, max: number) {
    return Math.min(max, Math.max(min, v));
}

function getImageGroups(model: ModelData): ImageGroup[] {
    if (model.imageGroups?.length) return model.imageGroups;
    if (model.images?.length) {
        return model.images.map((img, i) => ({
            id: `img-${i}`,
            mode: "single" as const,
            images: [img],
        }));
    }
    return [];
}

function generateLayout(model: ModelData): CanvasItemLayout[] {
    const items: CanvasItemLayout[] = [];
    let z = 1;

    const place = (id: string, slot: Slot) => {
        items.push({
            id,
            x: slot.x + jitter(slot.jx),
            y: slot.y + jitter(slot.jy),
            rotation: 0,
            zIndex: z++,
            pinned: false,
        });
    };

    place("title", BASE_POSITIONS.title);
    place("meta", BASE_POSITIONS.meta);
    if (model.featured?.main?.url) place("featured-main", BASE_POSITIONS["featured-main"]);
    if (model.featured?.secondary?.url) place("featured-secondary", BASE_POSITIONS["featured-secondary"]);
    if (clean(model.notes)) place("notes", BASE_POSITIONS.notes);
    if (model.voiceNarrative) place("audio", BASE_POSITIONS.audio);

    const groups = getImageGroups(model);
    groups.forEach((group, i) => {
        const slot = IMAGE_SLOTS[i % IMAGE_SLOTS.length];
        place(`image-${group.id}`, slot);
    });

    return items;
}

function storageKey(modelId: string) {
    return `nma-canvas-${modelId}`;
}

// ─── Drag state ref (mutable, never triggers re-render) ───────────────────────

interface DragState {
    active: boolean;
    mode: "pan" | "item" | null;
    startScreenX: number;
    startScreenY: number;
    startOriginX: number;
    startOriginY: number;
    itemId: string;
    moved: boolean;
}

// ─── Memoized item layer ──────────────────────────────────────────────────────
// Split out so panning / zooming (which only change the canvas transform) never
// re-render the cards — only changes to `items` do.

interface CanvasItemsProps {
    items: CanvasItemLayout[];
    draggingItemId: string | null;
    renderCard: (id: string) => React.ReactNode;
    onTogglePin: (id: string) => void;
}

const CanvasItems = React.memo(function CanvasItems({
    items,
    draggingItemId,
    renderCard,
    onTogglePin,
}: CanvasItemsProps) {
    return (
        <>
            {items.map((item) => {
                const card = renderCard(item.id);
                if (!card) return null;
                const isDraggingThis = draggingItemId === item.id;
                return (
                    <div
                        key={item.id}
                        data-canvas-item-id={item.id}
                        className="group absolute top-0 left-0"
                        style={{
                            transform: `translate(${item.x}px, ${item.y}px)`,
                            zIndex: item.zIndex,
                            cursor: item.pinned ? "grab" : isDraggingThis ? "grabbing" : "move",
                        }}
                    >
                        {card}
                        {/* Pin / unpin toggle */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onTogglePin(item.id);
                            }}
                            title={item.pinned ? "Unpin (allow moving)" : "Pin in place"}
                            aria-label={item.pinned ? "Unpin item" : "Pin item"}
                            className={`absolute -top-2.5 -right-2.5 w-6 h-6 flex items-center justify-center border rounded-md bg-white transition-all duration-200 ${
                                item.pinned
                                    ? "opacity-100 border-stone-900 text-stone-900"
                                    : "opacity-0 group-hover:opacity-100 border-stone-200 text-stone-400 hover:border-stone-900 hover:text-stone-900"
                            }`}
                        >
                            {item.pinned ? <Pin size={11} fill="currentColor" /> : <PinOff size={11} />}
                        </button>
                    </div>
                );
            })}
        </>
    );
});

// ─── Canvas ───────────────────────────────────────────────────────────────────

export function ModelCanvas({
    model,
    prevId,
    nextId,
}: {
    model: ModelData;
    prevId?: string | null;
    nextId?: string | null;
}) {
    const router = useRouter();
    const viewportRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<DragState>({
        active: false,
        mode: null,
        startScreenX: 0,
        startScreenY: 0,
        startOriginX: 0,
        startOriginY: 0,
        itemId: "",
        moved: false,
    });

    // Multi-touch: track active pointers + pinch-zoom gesture state
    const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
    const pinchRef = useRef({ active: false, startDist: 1, startScale: 1, ax: 0, ay: 0 });

    // Keep transform and items in both state (for renders) and ref (for handlers)
    const [transform, _setTransform] = useState(INITIAL_TRANSFORM);
    const transformRef = useRef(INITIAL_TRANSFORM);
    const setTransform = useCallback(
        (
            updater:
                | typeof INITIAL_TRANSFORM
                | ((prev: typeof INITIAL_TRANSFORM) => typeof INITIAL_TRANSFORM),
        ) => {
            const next = typeof updater === "function" ? updater(transformRef.current) : updater;
            transformRef.current = next;
            _setTransform(next);
        },
        [],
    );

    const [items, _setItems] = useState<CanvasItemLayout[]>([]);
    const itemsRef = useRef<CanvasItemLayout[]>([]);
    const setItems = useCallback((fn: (prev: CanvasItemLayout[]) => CanvasItemLayout[]) => {
        const next = fn(itemsRef.current);
        itemsRef.current = next;
        _setItems(next);
    }, []);

    const maxZRef = useRef(10);
    const [dragging, setDragging] = useState(false);
    const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
    const [savedFeedback, setSavedFeedback] = useState(false);

    // ── Shared audio controller (one <audio> element; controlled from the
    //    on-canvas card and the bottom bar) ──────────────────────────────────
    const audioElRef = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);
    const [audioTime, setAudioTime] = useState(0);
    const [audioDuration, setAudioDuration] = useState(0);
    const hasAudio = !!model.voiceNarrative;

    const audioToggle = useCallback(() => {
        const el = audioElRef.current;
        if (!el) return;
        if (el.paused) el.play();
        else el.pause();
    }, []);

    const audioStop = useCallback(() => {
        const el = audioElRef.current;
        if (!el) return;
        el.pause();
        el.currentTime = 0;
        setAudioTime(0);
    }, []);

    const audioController = useMemo<AudioController>(
        () => ({
            hasAudio,
            playing,
            active: playing || audioTime > 0,
            currentTime: audioTime,
            duration: audioDuration,
            toggle: audioToggle,
            stop: audioStop,
        }),
        [hasAudio, playing, audioTime, audioDuration, audioToggle, audioStop],
    );

    // ── Init: load saved layout or generate fresh ────────────────────────────
    useEffect(() => {
        const key = storageKey(model.id);
        try {
            const raw = localStorage.getItem(key);
            if (raw) {
                const { items: saved } = JSON.parse(raw) as { items: CanvasItemLayout[] };
                if (Array.isArray(saved) && saved.length > 0) {
                    itemsRef.current = saved;
                    _setItems(saved);
                    maxZRef.current = Math.max(10, ...saved.map((i) => i.zIndex || 0));
                    return;
                }
            }
        } catch {}
        const fresh = generateLayout(model);
        itemsRef.current = fresh;
        _setItems(fresh);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [model.id]);

    // ── Eased wheel zoom ──────────────────────────────────────────────────────
    const zoomRef = useRef({ target: INITIAL_TRANSFORM.scale, anchorX: 0, anchorY: 0 });
    const rafRef = useRef<number | null>(null);

    const stopZoomAnim = useCallback(() => {
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
    }, []);

    // Generic eased tween of the whole transform (used by "fit to all")
    const fitRafRef = useRef<number | null>(null);
    const stopFitAnim = useCallback(() => {
        if (fitRafRef.current !== null) {
            cancelAnimationFrame(fitRafRef.current);
            fitRafRef.current = null;
        }
    }, []);
    const animateTo = useCallback(
        (target: { x: number; y: number; scale: number }) => {
            stopZoomAnim();
            stopFitAnim();
            zoomRef.current.target = target.scale; // keep wheel zoom base in sync
            const stepFit = () => {
                const cur = transformRef.current;
                const dx = target.x - cur.x;
                const dy = target.y - cur.y;
                const ds = target.scale - cur.scale;
                if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(ds) < 0.001) {
                    setTransform(target);
                    fitRafRef.current = null;
                    return;
                }
                setTransform({ x: cur.x + dx * 0.22, y: cur.y + dy * 0.22, scale: cur.scale + ds * 0.22 });
                fitRafRef.current = requestAnimationFrame(stepFit);
            };
            fitRafRef.current = requestAnimationFrame(stepFit);
        },
        [setTransform, stopZoomAnim, stopFitAnim],
    );

    // Cancel any in-flight fit tween when the canvas unmounts
    useEffect(() => stopFitAnim, [stopFitAnim]);

    // Fit every card into the viewport with padding
    const zoomEverything = useCallback(() => {
        const el = viewportRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const nodes = el.querySelectorAll<HTMLElement>("[data-canvas-item-id]");
        if (!nodes.length) return;

        let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;
        nodes.forEach((n) => {
            const item = itemsRef.current.find((i) => i.id === n.dataset.canvasItemId);
            if (!item) return;
            minX = Math.min(minX, item.x);
            minY = Math.min(minY, item.y);
            maxX = Math.max(maxX, item.x + n.offsetWidth);
            maxY = Math.max(maxY, item.y + n.offsetHeight);
        });
        if (!isFinite(minX)) return;

        const pad = 90;
        const s = clamp(
            Math.min((rect.width - pad * 2) / (maxX - minX), (rect.height - pad * 2) / (maxY - minY)),
            SCALE_MIN,
            SCALE_MAX,
        );
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        animateTo({ x: rect.width / 2 - cx * s, y: rect.height / 2 - cy * s, scale: s });
    }, [animateTo]);

    // On phones, open already zoomed to fit everything (desktop keeps the
    // top-left "drawer" entry point).
    const didMobileFitRef = useRef(false);
    useEffect(() => {
        if (didMobileFitRef.current) return;
        if (typeof window === "undefined" || window.innerWidth >= 768) return;
        if (items.length === 0) return;
        didMobileFitRef.current = true;
        const r = requestAnimationFrame(() => requestAnimationFrame(() => zoomEverything()));
        return () => cancelAnimationFrame(r);
    }, [items, zoomEverything]);

    useEffect(() => {
        const el = viewportRef.current;
        if (!el) return;

        const step = () => {
            const cur = transformRef.current;
            const { target, anchorX, anchorY } = zoomRef.current;
            const diff = target - cur.scale;
            // Canvas-space point under the cursor — kept fixed as scale changes
            const cx = (anchorX - cur.x) / cur.scale;
            const cy = (anchorY - cur.y) / cur.scale;
            if (Math.abs(diff) < ZOOM_SETTLE) {
                setTransform({ x: anchorX - cx * target, y: anchorY - cy * target, scale: target });
                rafRef.current = null;
                return;
            }
            const newScale = cur.scale + diff * ZOOM_EASE;
            setTransform({ x: anchorX - cx * newScale, y: anchorY - cy * newScale, scale: newScale });
            rafRef.current = requestAnimationFrame(step);
        };

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const rect = el.getBoundingClientRect();
            zoomRef.current.anchorX = e.clientX - rect.left;
            zoomRef.current.anchorY = e.clientY - rect.top;
            // Compound, frame-rate independent: exp() keeps zoom steps proportional
            const base = zoomRef.current.target || transformRef.current.scale;
            zoomRef.current.target = clamp(
                base * Math.exp(-e.deltaY * ZOOM_SENSITIVITY),
                SCALE_MIN,
                SCALE_MAX,
            );
            if (rafRef.current === null) rafRef.current = requestAnimationFrame(step);
        };

        el.addEventListener("wheel", handleWheel, { passive: false });
        return () => {
            el.removeEventListener("wheel", handleWheel);
            stopZoomAnim();
        };
    }, [setTransform, stopZoomAnim]);

    // ── Pointer events ────────────────────────────────────────────────────────
    const handlePointerDown = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            if (e.button !== 0) return;

            const path = e.nativeEvent.composedPath();

            // Let interactive elements (buttons, links, audio) handle their own events
            const isInteractive = path.some(
                (el) =>
                    el instanceof HTMLElement &&
                    ["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA", "AUDIO"].includes(el.tagName),
            );
            if (isInteractive) return;

            // Any new touch interrupts an in-flight zoom glide or fit animation
            zoomRef.current.target = transformRef.current.scale;
            stopZoomAnim();
            stopFitAnim();

            const rect = e.currentTarget.getBoundingClientRect();
            pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

            // Two fingers → start a pinch-zoom (cancels any single-finger drag)
            if (pointersRef.current.size === 2) {
                dragRef.current.active = false;
                setDraggingItemId(null);
                const [p1, p2] = [...pointersRef.current.values()];
                const cur = transformRef.current;
                const midX = (p1.x + p2.x) / 2 - rect.left;
                const midY = (p1.y + p2.y) / 2 - rect.top;
                pinchRef.current = {
                    active: true,
                    startDist: Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1,
                    startScale: cur.scale,
                    ax: (midX - cur.x) / cur.scale,
                    ay: (midY - cur.y) / cur.scale,
                };
                setDragging(true);
                return;
            }
            if (pointersRef.current.size > 2) return;

            const itemEl = path.find(
                (el) => el instanceof HTMLElement && (el as HTMLElement).dataset.canvasItemId,
            ) as HTMLElement | undefined;

            e.currentTarget.setPointerCapture(e.pointerId);
            setDragging(true);

            const item = itemEl
                ? itemsRef.current.find((i) => i.id === itemEl.dataset.canvasItemId)
                : undefined;

            // Drag a *movable* item; pinned items (or empty space) pan the canvas
            if (item && !item.pinned) {
                const newZ = ++maxZRef.current;
                setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, zIndex: newZ } : i)));
                setDraggingItemId(item.id);
                dragRef.current = {
                    active: true,
                    mode: "item",
                    startScreenX: e.clientX,
                    startScreenY: e.clientY,
                    startOriginX: item.x,
                    startOriginY: item.y,
                    itemId: item.id,
                    moved: false,
                };
            } else {
                setDraggingItemId(null);
                dragRef.current = {
                    active: true,
                    mode: "pan",
                    startScreenX: e.clientX,
                    startScreenY: e.clientY,
                    startOriginX: transformRef.current.x,
                    startOriginY: transformRef.current.y,
                    itemId: "",
                    moved: false,
                };
            }
        },
        [setItems, stopZoomAnim, stopFitAnim],
    );

    const handlePointerMove = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            // Keep tracked pointer positions current (for pinch)
            if (pointersRef.current.has(e.pointerId)) {
                pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            }

            // Pinch-zoom: scale around the moving midpoint of the two fingers
            if (pinchRef.current.active && pointersRef.current.size >= 2) {
                const rect = viewportRef.current?.getBoundingClientRect();
                if (!rect) return;
                const [p1, p2] = [...pointersRef.current.values()];
                const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
                const midX = (p1.x + p2.x) / 2 - rect.left;
                const midY = (p1.y + p2.y) / 2 - rect.top;
                const { startDist, startScale, ax, ay } = pinchRef.current;
                const newScale = clamp((startScale * dist) / startDist, SCALE_MIN, SCALE_MAX);
                setTransform({ x: midX - ax * newScale, y: midY - ay * newScale, scale: newScale });
                zoomRef.current.target = newScale;
                return;
            }

            const drag = dragRef.current;
            if (!drag.active) return;

            const dx = e.clientX - drag.startScreenX;
            const dy = e.clientY - drag.startScreenY;

            if (!drag.moved) {
                if (Math.abs(dx) < DRAG_THRESHOLD_PX && Math.abs(dy) < DRAG_THRESHOLD_PX) return;
                drag.moved = true;
            }

            if (drag.mode === "pan") {
                setTransform((t) => ({ ...t, x: drag.startOriginX + dx, y: drag.startOriginY + dy }));
            } else if (drag.mode === "item") {
                const scale = transformRef.current.scale;
                const newX = drag.startOriginX + dx / scale;
                const newY = drag.startOriginY + dy / scale;
                setItems((prev) =>
                    prev.map((item) => (item.id === drag.itemId ? { ...item, x: newX, y: newY } : item)),
                );
            }
        },
        [setTransform, setItems],
    );

    const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        pointersRef.current.delete(e.pointerId);

        // End the pinch once fewer than two fingers remain
        if (pinchRef.current.active && pointersRef.current.size < 2) {
            pinchRef.current.active = false;
            zoomRef.current.target = transformRef.current.scale;
        }

        // Fully reset only when all fingers are up
        if (pointersRef.current.size === 0) {
            dragRef.current.active = false;
            dragRef.current.mode = null;
            setDragging(false);
            setDraggingItemId(null);
        }
    }, []);

    const togglePin = useCallback(
        (id: string) => {
            setItems((prev) => prev.map((i) => (i.id === id ? { ...i, pinned: !i.pinned } : i)));
        },
        [setItems],
    );

    // ── Save / reset ──────────────────────────────────────────────────────────
    const saveLayout = useCallback(() => {
        localStorage.setItem(storageKey(model.id), JSON.stringify({ items: itemsRef.current }));
        setSavedFeedback(true);
        setTimeout(() => setSavedFeedback(false), 1500);
    }, [model.id]);

    const resetLayout = useCallback(() => {
        localStorage.removeItem(storageKey(model.id));
        const fresh = generateLayout(model);
        itemsRef.current = fresh;
        _setItems(fresh);
        maxZRef.current = 10;
    }, [model]);

    // ── Card renderer (stable so CanvasItems memo holds during pan/zoom) ──────
    const imageGroups = useMemo(() => getImageGroups(model), [model]);
    const notes = useMemo(() => clean(model.notes), [model]);

    const renderCard = useCallback(
        (itemId: string): React.ReactNode => {
            if (itemId === "title") return <TitleCard model={model} />;
            if (itemId === "meta") return <MetaCard model={model} />;
            if (itemId === "featured-main" && model.featured?.main)
                return <FeaturedCard image={model.featured.main} role="main" />;
            if (itemId === "featured-secondary" && model.featured?.secondary)
                return <FeaturedCard image={model.featured.secondary} role="secondary" />;
            if (itemId === "notes" && notes) return <NotesCard notes={notes} />;
            if (itemId === "audio" && model.voiceNarrative) return <AudioCard />;
            if (itemId.startsWith("image-")) {
                const groupId = itemId.replace("image-", "");
                const group = imageGroups.find((g) => g.id === groupId);
                if (!group || group.images.length === 0) return null;
                if (group.mode === "gallery") return <GalleryCard group={group} />;
                if (group.mode === "strip") return <StripCard group={group} />;
                return <PhotoCard group={group} />;
            }
            return null;
        },
        [model, notes, imageGroups],
    );

    const iconBtn =
        "w-9 h-9 flex items-center justify-center border border-stone-200 rounded-md bg-white text-stone-600 hover:border-stone-900 hover:text-stone-900 transition-colors disabled:opacity-30 disabled:pointer-events-none";
    const divider = <span className="w-px h-5 bg-stone-200 mx-1" aria-hidden />;
    const fmt = (s: number) => {
        if (!isFinite(s)) return "0:00";
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, "0")}`;
    };

    return (
        <AudioControllerContext.Provider value={audioController}>
            <div
                ref={viewportRef}
                className="fixed inset-0 bg-stone-50 overflow-hidden touch-none"
                style={{ cursor: dragging ? "grabbing" : "default" }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
                {/* Parallax dotted depth background */}
                <CanvasBackground x={transform.x} y={transform.y} scale={transform.scale} />

                {/* Canvas layer — all items live inside here */}
                <div
                    className="absolute top-0 left-0"
                    style={{
                        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                        transformOrigin: "0 0",
                    }}
                >
                    <CanvasItems
                        items={items}
                        draggingItemId={draggingItemId}
                        renderCard={renderCard}
                        onTogglePin={togglePin}
                    />
                </div>

                {/* Shared, single audio element for the whole canvas */}
                {hasAudio && (
                    <audio
                        ref={audioElRef}
                        src={model.voiceNarrative}
                        className="sr-only"
                        onPlay={() => setPlaying(true)}
                        onPause={() => setPlaying(false)}
                        onEnded={() => setPlaying(false)}
                        onTimeUpdate={() => setAudioTime(audioElRef.current?.currentTime ?? 0)}
                        onLoadedMetadata={() => setAudioDuration(audioElRef.current?.duration ?? 0)}
                    />
                )}

                {/* ── Model number — top right, prominent ── */}
                <div className="fixed top-6 right-8 z-50 select-none">
                    <span className="inline-block border border-stone-300 rounded-md bg-white px-3 py-2 text-[11px] font-bold tracking-[0.35em] text-stone-800 font-mono">
                        {model.modelNumber ?? "—"}
                    </span>
                </div>

                {/* ── Bottom control row (icons only, no visible bar) ── */}
                <div className="fixed bottom-6 right-8 z-50 flex items-center gap-2">
                    {/* Prev / next published model */}
                    <button
                        onClick={() => prevId && router.push(`/models/${prevId}`)}
                        disabled={!prevId}
                        title="Previous model"
                        aria-label="Previous model"
                        className={iconBtn}
                    >
                        <ChevronLeft size={15} />
                    </button>
                    <button
                        onClick={() => nextId && router.push(`/models/${nextId}`)}
                        disabled={!nextId}
                        title="Next model"
                        aria-label="Next model"
                        className={iconBtn}
                    >
                        <ChevronRight size={15} />
                    </button>

                    {divider}

                    {/* Save / reset view */}
                    <button
                        onClick={saveLayout}
                        title={savedFeedback ? "View saved" : "Save this arrangement"}
                        aria-label="Save view"
                        className={
                            savedFeedback
                                ? "w-9 h-9 flex items-center justify-center border border-stone-900 rounded-md bg-white text-stone-900"
                                : iconBtn
                        }
                    >
                        <Save size={13} />
                    </button>
                    <button
                        onClick={resetLayout}
                        title="Reset arrangement"
                        aria-label="Reset view"
                        className={iconBtn}
                    >
                        <RotateCcw size={13} />
                    </button>
                    <button
                        onClick={zoomEverything}
                        title="Fit everything in view"
                        aria-label="Zoom to fit everything"
                        className={iconBtn}
                    >
                        <Maximize size={13} />
                    </button>

                    {/* Audio transport — only once playback has started */}
                    {hasAudio && audioController.active && (
                        <>
                            {divider}
                            <button
                                onClick={audioToggle}
                                title={playing ? "Pause" : "Play"}
                                aria-label={playing ? "Pause" : "Play"}
                                className={iconBtn}
                            >
                                {playing ? (
                                    <Pause size={13} fill="currentColor" />
                                ) : (
                                    <Play size={13} fill="currentColor" />
                                )}
                            </button>
                            <button
                                onClick={audioStop}
                                title="Stop"
                                aria-label="Stop"
                                className={iconBtn}
                            >
                                <Square size={12} fill="currentColor" />
                            </button>
                            <span className="hidden sm:inline text-[10px] font-mono text-stone-600 ml-1 tabular-nums select-none">
                                {fmt(audioTime)}
                                {audioDuration > 0 && ` / ${fmt(audioDuration)}`}
                            </span>
                        </>
                    )}
                </div>
            </div>
        </AudioControllerContext.Provider>
    );
}
