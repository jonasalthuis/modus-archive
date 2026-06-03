"use client";

import React, { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { FloatingCard } from "./FloatingCard";
import type { UniverseModel, Vec3, ViewMode, GroupAttr, Cluster } from "./types";

export interface Target {
    pos: Vec3;
    visible: boolean;
}

// A camera command — bump `token` to trigger a move. "default" returns to the
// explore framing; "fit" frames the bounding box of all visible cards.
export interface CameraCommand {
    type: "default" | "fit";
    token: number;
}

interface OrbitLike {
    target: THREE.Vector3;
    enabled: boolean;
    enableRotate: boolean;
    enableZoom: boolean;
    autoRotate: boolean;
    autoRotateSpeed: number;
    mouseButtons: { LEFT: number; MIDDLE: number; RIGHT: number };
    update?: () => void;
}

// ── Controls config — depends on mode + grouping ────────────────────────────
// Grid: rotate off, left-drag pans. Explore: rotate on, hold Shift to pan,
// auto-rotate only when there's no active grouping (pure universe).

function ControlsConfig({ mode, group }: { mode: ViewMode; group: GroupAttr }) {
    const { controls } = useThree();
    useEffect(() => {
        const c = controls as unknown as OrbitLike | null;
        if (!c?.mouseButtons) return;

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
        c.enableZoom = true;
        c.autoRotate = group === "none";
        c.autoRotateSpeed = 0.35;
        c.mouseButtons.LEFT = THREE.MOUSE.ROTATE;

        // Hold Shift to pan: disable rotation AND switch the left button to pan,
        // so a Shift-drag clearly pans instead of orbiting.
        const down = (e: KeyboardEvent) => {
            if (e.key === "Shift") {
                c.enableRotate = false;
                c.mouseButtons.LEFT = THREE.MOUSE.PAN;
            }
        };
        const up = (e: KeyboardEvent) => {
            if (e.key === "Shift") {
                c.enableRotate = true;
                c.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
            }
        };
        window.addEventListener("keydown", down);
        window.addEventListener("keyup", up);
        return () => {
            window.removeEventListener("keydown", down);
            window.removeEventListener("keyup", up);
            c.enableRotate = true;
            c.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
        };
    }, [controls, mode, group]);
    return null;
}

// ── Trackpad controls (grid) — scroll pans any direction, pinch zooms ───────
// Mirrors the cosmos.so feel: two-finger scroll translates the canvas in any
// direction (incl. diagonal); pinch (ctrl+wheel) dollies the camera.

function TrackpadControls({ mode }: { mode: ViewMode }) {
    const { camera, controls, gl, size } = useThree();
    const modeRef = useRef(mode);
    modeRef.current = mode;

    useEffect(() => {
        const el = gl.domElement;
        const cam = camera as THREE.PerspectiveCamera;

        const onWheel = (e: WheelEvent) => {
            if (modeRef.current !== "grid") return; // explore: OrbitControls zoom
            const c = controls as unknown as OrbitLike | null;
            if (!c) return;
            e.preventDefault();

            const target = c.target;
            const dist = cam.position.distanceTo(target);

            if (e.ctrlKey) {
                // Pinch → dolly the camera along its view direction.
                const scale = Math.exp(e.deltaY * 0.01);
                const newDist = THREE.MathUtils.clamp(dist * scale, 4, 120);
                const dir = new THREE.Vector3().subVectors(cam.position, target).normalize();
                cam.position.copy(target).addScaledVector(dir, newDist);
            } else {
                // Two-finger scroll → screen-space pan (grab feel, any direction).
                const fov = (cam.fov * Math.PI) / 180;
                const worldPerPixel = (2 * dist * Math.tan(fov / 2)) / size.height;
                const right = new THREE.Vector3().setFromMatrixColumn(cam.matrix, 0);
                const up = new THREE.Vector3().setFromMatrixColumn(cam.matrix, 1);
                const move = new THREE.Vector3()
                    .addScaledVector(right, -e.deltaX * worldPerPixel)
                    .addScaledVector(up, e.deltaY * worldPerPixel);
                cam.position.add(move);
                target.add(move);
            }
            c.update?.();
        };

        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
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
}: {
    targets: Map<string, Target>;
    cameraCmd: CameraCommand;
}) {
    const { camera, controls, size } = useThree();
    const anim = useRef<{
        active: boolean;
        t: number;
        fromPos: THREE.Vector3;
        toPos: THREE.Vector3;
        fromTar: THREE.Vector3;
        toTar: THREE.Vector3;
    } | null>(null);

    useEffect(() => {
        const cam = camera as THREE.PerspectiveCamera;
        const c = controls as unknown as OrbitLike | null;
        const aspect = size.width / Math.max(1, size.height);

        let toTar = new THREE.Vector3(0, 0, 0);
        let toPos = new THREE.Vector3(0, 0, 16);

        if (cameraCmd.type === "fit") {
            const fit = fitToBox(targets, cam, aspect, 6);
            if (fit) {
                toTar = fit.center;
                toPos = fit.pos;
            }
        }

        anim.current = {
            active: true,
            t: 0,
            fromPos: camera.position.clone(),
            toPos,
            fromTar: c?.target ? c.target.clone() : new THREE.Vector3(),
            toTar,
        };
        if (c) c.enabled = false;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cameraCmd.token]);

    useFrame((_, delta) => {
        const c = controls as unknown as OrbitLike | null;
        const a = anim.current;
        if (!a?.active) return;
        a.t = Math.min(1, a.t + delta / 0.7);
        const e = a.t < 0.5 ? 2 * a.t * a.t : 1 - Math.pow(-2 * a.t + 2, 2) / 2;
        camera.position.lerpVectors(a.fromPos, a.toPos, e);
        if (c?.target) c.target.lerpVectors(a.fromTar, a.toTar, e);
        camera.lookAt(c?.target ?? a.toTar);
        if (a.t >= 1) {
            a.active = false;
            if (c) {
                c.enabled = true;
                c.update?.();
            }
        }
    });

    return null;
}

// ── Scene ────────────────────────────────────────────────────────────────────

export interface SceneProps {
    models: UniverseModel[];
    targets: Map<string, Target>;
    mode: ViewMode;
    group: GroupAttr;
    clusters: Cluster[];
    cameraCmd: CameraCommand;
}

export function Scene({ models, targets, mode, group, clusters, cameraCmd }: SceneProps) {
    const showLabels = mode === "explore" && group !== "none";
    // Depth fog is only the open-universe aesthetic (explore + no grouping).
    const depthFog = mode === "explore" && group === "none";

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

            <ControlsConfig mode={mode} group={group} />
            <TrackpadControls mode={mode} />
            <CameraRig targets={targets} cameraCmd={cameraCmd} />

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
                        mode={mode === "grid" ? "grid" : "float"}
                        depthFog={depthFog}
                    />
                );
            })}

            {showLabels &&
                clusters.map((c) => (
                    <Html
                        key={c.key}
                        position={c.center}
                        center
                        distanceFactor={26}
                        style={{ pointerEvents: "none" }}
                        zIndexRange={[10, 0]}
                    >
                        <div className="flex items-center gap-2 whitespace-nowrap select-none">
                            <span className="text-[15px] font-light tracking-tight text-stone-800">
                                {c.label}
                            </span>
                            <span className="font-mono text-[11px] text-stone-400">{c.count}</span>
                        </div>
                    </Html>
                ))}
        </>
    );
}
