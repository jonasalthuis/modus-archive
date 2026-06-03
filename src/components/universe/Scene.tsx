"use client";

import React, { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { FloatingCard } from "./FloatingCard";
import type { UniverseModel, Vec3, ViewMode, Cluster } from "./types";

export interface Target {
    pos: Vec3;
    visible: boolean;
}

// ── Camera rig: animates between modes, fits grid/cluster bounds ─────────────

interface OrbitLike {
    target: THREE.Vector3;
    enabled: boolean;
    enableRotate: boolean;
    autoRotate: boolean;
    autoRotateSpeed: number;
    update?: () => void;
}

function fitDistance(
    box: THREE.Box3,
    camera: THREE.PerspectiveCamera,
    aspect: number,
    pad: number,
): { center: THREE.Vector3; dist: number } {
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const fov = (camera.fov * Math.PI) / 180;
    const distV = size.y / 2 / Math.tan(fov / 2);
    const distH = size.x / 2 / (Math.tan(fov / 2) * aspect);
    return { center, dist: Math.max(distV, distH) + pad };
}

// Hold Shift to pan with a left-click drag (otherwise left drag rotates).
function ShiftPan() {
    const { controls } = useThree();
    useEffect(() => {
        const c = controls as unknown as { mouseButtons?: { LEFT: number } } | null;
        if (!c?.mouseButtons) return;
        const setPan = (on: boolean) => (e: KeyboardEvent) => {
            if (e.key === "Shift") c.mouseButtons!.LEFT = on ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
        };
        const down = setPan(true);
        const up = setPan(false);
        window.addEventListener("keydown", down);
        window.addEventListener("keyup", up);
        return () => {
            window.removeEventListener("keydown", down);
            window.removeEventListener("keyup", up);
            if (c.mouseButtons) c.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
        };
    }, [controls]);
    return null;
}

function CameraRig({
    mode,
    targets,
    fitKey,
}: {
    mode: ViewMode;
    targets: Map<string, Target>;
    fitKey: string;
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
        let toPos = new THREE.Vector3(0, 0, 15);

        if (mode === "grid" || mode === "clustered") {
            const box = new THREE.Box3();
            let any = false;
            targets.forEach((t) => {
                if (t.visible) {
                    box.expandByPoint(new THREE.Vector3(t.pos[0], t.pos[1], t.pos[2]));
                    any = true;
                }
            });
            if (any) {
                const pad = mode === "grid" ? 4 : 7;
                const { center, dist } = fitDistance(box, cam, aspect, pad);
                toTar = center;
                toPos = new THREE.Vector3(center.x, center.y, Math.min(dist, 60));
            } else {
                toPos = new THREE.Vector3(0, 0, mode === "grid" ? 15 : 30);
            }
        }

        const fromPos = camera.position.clone();
        const fromTar = c?.target ? c.target.clone() : new THREE.Vector3(0, 0, 0);
        anim.current = { active: true, t: 0, fromPos, toPos, fromTar, toTar };
        if (c) c.enabled = false;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fitKey]);

    useFrame((_, delta) => {
        const c = controls as unknown as OrbitLike | null;
        const a = anim.current;
        if (a?.active) {
            a.t = Math.min(1, a.t + delta / 0.7);
            const e = a.t < 0.5 ? 2 * a.t * a.t : 1 - Math.pow(-2 * a.t + 2, 2) / 2;
            camera.position.lerpVectors(a.fromPos, a.toPos, e);
            if (c?.target) c.target.lerpVectors(a.fromTar, a.toTar, e);
            camera.lookAt(c?.target ?? a.toTar);
            if (a.t >= 1) {
                a.active = false;
                if (c) {
                    c.enabled = true;
                    c.enableRotate = mode !== "grid";
                    c.autoRotate = mode === "universe";
                    c.autoRotateSpeed = 0.35;
                    c.update?.();
                }
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
    clusters: Cluster[];
    fitKey: string;
}

export function Scene({ models, targets, mode, clusters, fitKey }: SceneProps) {
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
                maxDistance={64}
                rotateSpeed={0.45}
                zoomSpeed={0.8}
                panSpeed={0.8}
            />

            <CameraRig mode={mode} targets={targets} fitKey={fitKey} />
            <ShiftPan />

            {models.map((m) => {
                const t = targets.get(m.id);
                if (!t) return null;
                return (
                    <FloatingCard
                        key={m.id}
                        model={m}
                        target={t.pos}
                        visible={t.visible}
                        mode={mode}
                    />
                );
            })}

            {mode === "clustered" &&
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
                            <span className="font-mono text-[11px] text-stone-400">
                                {c.count}
                            </span>
                        </div>
                    </Html>
                ))}
        </>
    );
}
