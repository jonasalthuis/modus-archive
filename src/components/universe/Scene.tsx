"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { FloatingCard } from "./FloatingCard";
import type { UniverseModel, Vec3, ViewMode, GroupAttr, Cluster } from "./types";

export interface Target {
    pos: Vec3;
    visible: boolean;
    dimmed?: boolean; // greyed-out (filtered but still shown)
}

// A camera command — bump `token` to trigger a move.
// "default" returns to explore framing; "fit" frames all visible cards;
// "focus" zooms to a specific card position.
export interface CameraCommand {
    type: "default" | "fit" | "focus";
    token: number;
    focusPos?: Vec3; // used when type === "focus"
}

interface OrbitLike {
    target: THREE.Vector3;
    enabled: boolean;
    enableRotate: boolean;
    enableZoom: boolean;
    enablePan: boolean;
    autoRotate: boolean;
    autoRotateSpeed: number;
    mouseButtons: { LEFT: number; MIDDLE: number; RIGHT: number };
    update?: () => void;
}

// ── Controls config — depends on mode + grouping ────────────────────────────
// Grid: rotate off, left-drag pans. Explore: rotate on, hold Shift to pan,
// auto-rotate only when there's no active grouping (pure universe) and not paused.

function ControlsConfig({ mode, group, paused, locked }: { mode: ViewMode; group: GroupAttr; paused: boolean; locked: boolean }) {
    const { controls } = useThree();
    useEffect(() => {
        const c = controls as unknown as OrbitLike | null;
        if (!c?.mouseButtons) return;

        // When a card is focused, disable all orbit interaction.
        if (locked) {
            c.enableRotate = false;
            c.enableZoom = false;
            c.enablePan = false;
            c.autoRotate = false;
            c.update?.();
            return () => {
                c.enableRotate = true;
                c.enableZoom = false; // TrackpadControls handles zoom
                c.enablePan = true;
            };
        }

        if (mode === "grid") {
            c.enableRotate = false;
            c.autoRotate = false;
            c.enableZoom = false; // wheel/pinch handled by TrackpadControls
            c.mouseButtons.LEFT = THREE.MOUSE.PAN; // plain drag pans
            c.update?.();
            return;
        }

        // explore
        c.enableRotate = true;
        c.enableZoom = false; // wheel/pinch handled by TrackpadControls
        c.autoRotate = group === "none" && !paused;
        c.autoRotateSpeed = 0.18;
        c.mouseButtons.LEFT = THREE.MOUSE.ROTATE;

        // Hold Shift to pan: just disable orbit while held — ShiftDragPan does
        // the actual panning, so it can't fight OrbitControls' own rotate/pan.
        const down = (e: KeyboardEvent) => {
            if (e.key === "Shift") c.enableRotate = false;
        };
        const up = (e: KeyboardEvent) => {
            if (e.key === "Shift") c.enableRotate = true;
        };
        window.addEventListener("keydown", down);
        window.addEventListener("keyup", up);
        return () => {
            window.removeEventListener("keydown", down);
            window.removeEventListener("keyup", up);
            c.enableRotate = true;
        };
    }, [controls, mode, group, paused, locked]);
    return null;
}

// ── Trackpad controls — scroll pans any direction, pinch zooms ──────────────
// cosmos.so feel, in both modes: two-finger scroll pans (with momentum — it
// accelerates as you scroll and glides to a stop); pinch (ctrl+wheel) zooms.
// A mouse wheel (large vertical-only steps) is treated as zoom so mouse users
// can still zoom. Scroll direction is the natural / page-scroll direction.

const PAN_RESPONSE = 0.16; // lower = heavier / more glide
const ZOOM_RESPONSE = 0.22;

function TrackpadControls() {
    const { camera, controls, gl, size } = useThree();
    const panRem = useRef(new THREE.Vector3()); // remaining world-space pan
    const zoomRem = useRef(0); // remaining log-scale dolly

    useEffect(() => {
        const el = gl.domElement;
        const cam = camera as THREE.PerspectiveCamera;

        // Heuristic: a mouse wheel is a large, vertical-only step. Trackpad
        // scrolls are smaller and/or carry a horizontal component.
        const isMouseWheelZoom = (e: WheelEvent) =>
            !e.ctrlKey && e.deltaX === 0 && (e.deltaMode !== 0 || Math.abs(e.deltaY) >= 50);

        const onWheel = (e: WheelEvent) => {
            const c = controls as unknown as OrbitLike | null;
            if (!c) return;
            e.preventDefault();

            if (e.ctrlKey || isMouseWheelZoom(e)) {
                zoomRem.current += e.deltaY * 0.01; // accumulate, applied smoothly
                return;
            }

            // Two-finger scroll → momentum pan, natural (page-scroll) direction.
            const dist = cam.position.distanceTo(c.target);
            const fov = (cam.fov * Math.PI) / 180;
            const worldPerPixel = (2 * dist * Math.tan(fov / 2)) / size.height;
            const right = new THREE.Vector3().setFromMatrixColumn(cam.matrix, 0);
            const up = new THREE.Vector3().setFromMatrixColumn(cam.matrix, 1);
            panRem.current
                .addScaledVector(right, e.deltaX * worldPerPixel)
                .addScaledVector(up, -e.deltaY * worldPerPixel);
        };

        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
    }, [camera, controls, gl, size]);

    useFrame(() => {
        const c = controls as unknown as OrbitLike | null;
        if (!c) return;
        const cam = camera as THREE.PerspectiveCamera;
        let moved = false;

        // Pan momentum: drain a fraction of the remaining offset each frame.
        const pr = panRem.current;
        if (pr.lengthSq() > 1e-7) {
            const step = pr.clone().multiplyScalar(PAN_RESPONSE);
            cam.position.add(step);
            c.target.add(step);
            pr.sub(step);
            if (pr.lengthSq() < 1e-7) pr.set(0, 0, 0);
            moved = true;
        }

        // Zoom momentum.
        if (Math.abs(zoomRem.current) > 1e-4) {
            const z = zoomRem.current * ZOOM_RESPONSE;
            zoomRem.current -= z;
            const dist = cam.position.distanceTo(c.target);
            const newDist = THREE.MathUtils.clamp(dist * Math.exp(z), 4, 120);
            const dir = new THREE.Vector3().subVectors(cam.position, c.target).normalize();
            cam.position.copy(c.target).addScaledVector(dir, newDist);
            if (Math.abs(zoomRem.current) < 1e-4) zoomRem.current = 0;
            moved = true;
        }

        if (moved) c.update?.();
    });

    return null;
}

// ── Shift-drag pan (explore) — manual, so it can't fight OrbitControls ───────
// In grid, any drag already pans (OrbitControls), so this is explore-only to
// avoid double-panning.

function ShiftDragPan({ mode }: { mode: ViewMode }) {
    const { camera, controls, gl, size } = useThree();
    const modeRef = useRef(mode);
    modeRef.current = mode;

    useEffect(() => {
        const el = gl.domElement;
        const cam = camera as THREE.PerspectiveCamera;
        let active = false;
        let lastX = 0;
        let lastY = 0;

        const onDown = (e: PointerEvent) => {
            if (modeRef.current !== "explore" || !e.shiftKey || e.button !== 0) return;
            active = true;
            lastX = e.clientX;
            lastY = e.clientY;
        };
        const onMove = (e: PointerEvent) => {
            if (!active) return;
            const c = controls as unknown as OrbitLike | null;
            if (!c) return;
            const dx = e.clientX - lastX;
            const dy = e.clientY - lastY;
            lastX = e.clientX;
            lastY = e.clientY;
            const dist = cam.position.distanceTo(c.target);
            const fov = (cam.fov * Math.PI) / 180;
            const wpp = (2 * dist * Math.tan(fov / 2)) / size.height;
            const right = new THREE.Vector3().setFromMatrixColumn(cam.matrix, 0);
            const up = new THREE.Vector3().setFromMatrixColumn(cam.matrix, 1);
            const move = new THREE.Vector3()
                .addScaledVector(right, -dx * wpp)
                .addScaledVector(up, dy * wpp);
            cam.position.add(move);
            c.target.add(move);
            c.update?.();
        };
        const onUp = () => {
            active = false;
        };

        el.addEventListener("pointerdown", onDown);
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        return () => {
            el.removeEventListener("pointerdown", onDown);
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
        };
    }, [camera, controls, gl, size]);

    return null;
}

// ── Camera rig — animated framing on command ────────────────────────────────

function fitToBox(
    targets: Map<string, Target>,
    camera: THREE.PerspectiveCamera,
    aspect: number,
    pad: number,
): { center: THREE.Vector3; pos: THREE.Vector3 } | null {
    const box = new THREE.Box3();
    let any = false;
    targets.forEach((t) => {
        if (t.visible) {
            box.expandByPoint(new THREE.Vector3(t.pos[0], t.pos[1], t.pos[2]));
            any = true;
        }
    });
    if (!any) return null;
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const fov = (camera.fov * Math.PI) / 180;
    const distV = size.y / 2 / Math.tan(fov / 2);
    const distH = size.x / 2 / (Math.tan(fov / 2) * aspect);
    const dist = Math.max(distV, distH) + size.z / 2 + pad;
    return { center, pos: new THREE.Vector3(center.x, center.y, center.z + Math.min(dist, 110)) };
}

function CameraRig({
    targets,
    cameraCmd,
    locked,
}: {
    targets: Map<string, Target>;
    cameraCmd: CameraCommand;
    locked: boolean;
}) {
    const { camera, controls, size } = useThree();
    const lockedRef = useRef(locked);
    lockedRef.current = locked;
    const anim = useRef<{
        active: boolean;
        t: number;
        fromPos: THREE.Vector3;
        toPos: THREE.Vector3;
        fromTar: THREE.Vector3;
        toTar: THREE.Vector3;
        duration: number;
        easing: "inout" | "out";
    } | null>(null);

    useEffect(() => {
        const cam = camera as THREE.PerspectiveCamera;
        const c = controls as unknown as OrbitLike | null;
        const aspect = size.width / Math.max(1, size.height);

        let toTar = new THREE.Vector3(0, 0, 0);
        let toPos = new THREE.Vector3(0, 0, 16);
        let duration = 0.7;
        let easing: "inout" | "out" = "inout";

        if (cameraCmd.type === "fit") {
            const fit = fitToBox(targets, cam, aspect, 6);
            if (fit) {
                toTar = fit.center;
                toPos = fit.pos;
            }
        } else if (cameraCmd.type === "focus" && cameraCmd.focusPos) {
            const [fx, fy, fz] = cameraCmd.focusPos;
            toTar = new THREE.Vector3(fx, fy, fz);
            toPos = new THREE.Vector3(fx, fy, fz + 3.8);
            duration = 0.45;
            easing = "out";
        }

        anim.current = {
            active: true,
            t: 0,
            fromPos: camera.position.clone(),
            toPos,
            fromTar: c?.target ? c.target.clone() : new THREE.Vector3(),
            toTar,
            duration,
            easing,
        };
        if (c) c.enabled = false;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cameraCmd.token]);

    useFrame((_, delta) => {
        const c = controls as unknown as OrbitLike | null;
        const a = anim.current;
        if (!a?.active) return;
        a.t = Math.min(1, a.t + delta / a.duration);
        const e = a.easing === "out"
            ? 1 - Math.pow(1 - a.t, 3)
            : a.t < 0.5 ? 2 * a.t * a.t : 1 - Math.pow(-2 * a.t + 2, 2) / 2;
        camera.position.lerpVectors(a.fromPos, a.toPos, e);
        if (c?.target) c.target.lerpVectors(a.fromTar, a.toTar, e);
        camera.lookAt(c?.target ?? a.toTar);
        if (a.t >= 1) {
            a.active = false;
            // Only re-enable orbit controls when not in focus-lock mode.
            // If locked=true (card is focused), controls stay disabled so damping
            // doesn't fire residual velocity between back-to-back focus animations.
            if (c && !lockedRef.current) {
                c.enabled = true;
                c.update?.();
            }
        }
    });

    return null;
}

// ── Cluster hover outline ────────────────────────────────────────────────────
// A faint rounded-rectangle line loop drawn around the card bounds of a cluster
// when its label is hovered.

const CLUSTER_RADIUS = 2.2;

type ClusterBounds = { x1: number; y1: number; x2: number; y2: number; z: number };

function buildRoundedRectPoints(b: ClusterBounds, r: number, segs: number): THREE.Vector3[] {
    const { x1, y1, x2, y2, z } = b;
    const cr = Math.min(r, (x2 - x1) / 2, (y2 - y1) / 2);
    const pts: THREE.Vector3[] = [];
    const arc = (cx: number, cy: number, a0: number, a1: number) => {
        for (let i = 0; i <= segs; i++) {
            const a = a0 + ((a1 - a0) * i) / segs;
            pts.push(new THREE.Vector3(cx + cr * Math.cos(a), cy + cr * Math.sin(a), z));
        }
    };
    arc(x1 + cr, y2 - cr, Math.PI, Math.PI / 2);   // top-left
    arc(x2 - cr, y2 - cr, Math.PI / 2, 0);          // top-right
    arc(x2 - cr, y1 + cr, 0, -Math.PI / 2);         // bottom-right
    arc(x1 + cr, y1 + cr, -Math.PI / 2, -Math.PI);  // bottom-left
    pts.push(pts[0].clone()); // close
    return pts;
}

// Invisible plane covering cluster bounds — acts as hover hit area for the whole group.
function ClusterHitArea({ bounds, clusterKey, hovered, onHover }: {
    bounds: ClusterBounds;
    clusterKey: string;
    hovered: boolean;
    onHover: (key: string | null) => void;
}) {
    const { z } = bounds;
    // Same rounded rectangle as ClusterOutline so the fill and the line match.
    const geo = useMemo(() => {
        const pts = buildRoundedRectPoints(bounds, CLUSTER_RADIUS, 12);
        const shape = new THREE.Shape(pts.slice(0, -1).map((p) => new THREE.Vector2(p.x, p.y)));
        return new THREE.ShapeGeometry(shape);
    }, [bounds]);
    return (
        <mesh
            position={[0, 0, z - 0.05]}
            geometry={geo}
            onPointerEnter={() => onHover(clusterKey)}
            onPointerLeave={() => onHover(null)}
        >
            <meshBasicMaterial color="#e7e5e4" transparent opacity={hovered ? 0.35 : 0} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
    );
}

function ClusterOutline({ bounds, hovered }: { bounds: ClusterBounds; hovered: boolean }) {
    const geo = useMemo(() => {
        const pts = buildRoundedRectPoints(bounds, CLUSTER_RADIUS, 12);
        return new THREE.BufferGeometry().setFromPoints(pts);
    }, [bounds]);

    return (
        // @ts-expect-error – R3F lowercase JSX element
        <line geometry={geo}>
            <lineBasicMaterial
                color={hovered ? "#57534e" : "#a8a29e"}
                transparent
                opacity={hovered ? 0.75 : 0.5}
            />
        </line>
    );
}

// ── Scene ────────────────────────────────────────────────────────────────────

export interface SceneProps {
    models: UniverseModel[];
    targets: Map<string, Target>;
    mode: ViewMode;
    group: GroupAttr;
    clusters: Cluster[];
    cameraCmd: CameraCommand;
    paused: boolean;
    focusedId: string | null;
    onFocus: (model: UniverseModel, pos: Vec3) => void;
}

export function Scene({ models, targets, mode, group, clusters, cameraCmd, paused, focusedId, onFocus }: SceneProps) {
    const showLabels = mode === "explore" && group !== "none";
    // Depth fog is only the open-universe aesthetic (explore + no grouping).
    const depthFog = mode === "explore" && group === "none";
    const [hoveredCluster, setHoveredCluster] = useState<string | null>(null);

    // Reverse map: modelId → clusterKey (rebuilt when clusters change)
    const modelClusterMap = useMemo(() => {
        const map = new Map<string, string>();
        for (const c of clusters) {
            for (const id of c.modelIds) map.set(id, c.key);
        }
        return map;
    }, [clusters]);

    return (
        <>
            <color attach="background" args={["#ffffff"]} />

            <OrbitControls
                makeDefault
                enablePan
                screenSpacePanning
                enableDamping
                dampingFactor={0.055}
                minDistance={4}
                maxDistance={120}
                rotateSpeed={0.45}
                zoomSpeed={0.8}
                panSpeed={0.9}
            />

            <ControlsConfig mode={mode} group={group} paused={paused} locked={focusedId !== null} />
            <TrackpadControls />
            <ShiftDragPan mode={mode} />
            <CameraRig targets={targets} cameraCmd={cameraCmd} locked={focusedId !== null} />

            {models.map((m) => {
                const t = targets.get(m.id);
                if (!t) return null;
                // In grid mode cards face front; in explore they float.
                return (
                    <FloatingCard
                        key={m.id}
                        model={m}
                        target={t.pos}
                        visible={t.visible}
                        dimmed={t.dimmed ?? false}
                        focused={m.id === focusedId}
                        mode={mode === "grid" ? "grid" : "float"}
                        depthFog={depthFog}
                        clusterKey={modelClusterMap.get(m.id)}
                        onClusterHover={setHoveredCluster}
                        onFocus={onFocus}
                    />
                );
            })}

            {showLabels &&
                clusters.map((c) => (
                    <React.Fragment key={c.key}>
                        <Html
                            position={c.center}
                            center
                            distanceFactor={26}
                            zIndexRange={[10, 0]}
                        >
                            <div
                                onMouseEnter={() => setHoveredCluster(c.key)}
                                onMouseLeave={() => setHoveredCluster(null)}
                                className="flex items-center gap-1.5 whitespace-nowrap select-none cursor-default bg-white/90 backdrop-blur-sm border border-stone-300 rounded px-2 py-0.5"
                            >
                                <span className="text-[13px] font-medium tracking-tight text-stone-900">
                                    {c.label}
                                </span>
                                <span className="font-mono text-[10px] text-stone-400">{c.count}</span>
                            </div>
                        </Html>
                        <ClusterOutline bounds={c.bounds} hovered={hoveredCluster === c.key} />
                        <ClusterHitArea bounds={c.bounds} clusterKey={c.key} hovered={hoveredCluster === c.key} onHover={setHoveredCluster} />
                    </React.Fragment>
                ))}
        </>
    );
}
