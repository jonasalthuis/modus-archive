"use client";

import React, { useRef, useMemo, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useRouter } from "next/navigation";
import * as THREE from "three";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UniverseModel {
    id: string;
    modelNumber?: string;
    title?: string;
    architect?: string;
    year?: number;
    images?: { url: string; isStarred?: boolean; importance?: number }[];
}

// ── Shaders (the reference technique: distance-based depth effect) ─────────────
// The vertex shader passes the eye-space Z to the fragment so we can compute
// a smooth opacity fade — same principle as the reference's gl_PointSize trick
// but adapted for plane meshes (which handle aspect ratio and click detection).

const VERT = /* glsl */ `
  varying vec2 vUv;
  varying float vEyeZ;

  void main() {
    vUv = uv;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vEyeZ = -mvPos.z;                     // positive camera distance
    gl_Position = projectionMatrix * mvPos;
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uFade;    // 0 = sharp, 1 = invisible
  varying vec2 vUv;
  varying float vEyeZ;

  void main() {
    vec4 tex  = texture2D(uMap, vUv);
    // Distance fog: starts fading at 20 units, gone by 38
    float fog = 1.0 - smoothstep(20.0, 38.0, vEyeZ);
    gl_FragColor = vec4(tex.rgb, tex.a * fog * (1.0 - uFade));
  }
`;

// ── Card texture factory ───────────────────────────────────────────────────────

function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number, y: number,
    maxW: number, lineH: number,
    maxLines = 3,
): void {
    const words = text.split(" ");
    let line = "";
    let drawn = 0;
    for (const word of words) {
        const test = line + word + " ";
        if (ctx.measureText(test).width > maxW && line) {
            ctx.fillText(line.trim(), x, y + drawn * lineH);
            line = word + " ";
            drawn++;
            if (drawn >= maxLines) {
                ctx.fillText(line.trim() + "…", x, y + drawn * lineH);
                return;
            }
        } else {
            line = test;
        }
    }
    if (line.trim()) ctx.fillText(line.trim(), x, y + drawn * lineH);
}

function makeCardTexture(model: UniverseModel): THREE.CanvasTexture {
    const W = 600, H = 440;
    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext("2d")!;

    ctx.fillStyle = "#faf9f7";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "#ddd9d5";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0.75, 0.75, W - 1.5, H - 1.5);

    ctx.fillStyle = "#78716c";
    ctx.font = "400 18px system-ui, sans-serif";
    ctx.fillText(model.modelNumber ?? "—", 32, 52);

    ctx.fillStyle = "#1c1917";
    ctx.font = "300 32px system-ui, sans-serif";
    wrapText(ctx, model.title ?? "Untitled", 32, 112, W - 64, 46, 3);

    ctx.fillStyle = "#1c1917";
    ctx.fillRect(32, 262, 44, 2);

    if (model.architect) {
        ctx.fillStyle = "#44403c";
        ctx.font = "600 15px system-ui, sans-serif";
        const a = model.architect.length > 38 ? model.architect.slice(0, 38) + "…" : model.architect;
        ctx.fillText(a.toUpperCase(), 32, 312);
    }

    if (model.year) {
        ctx.fillStyle = "#a8a29e";
        ctx.font = "400 15px system-ui, sans-serif";
        ctx.fillText(String(model.year), 32, 346);
    }

    const t = new THREE.CanvasTexture(cv);
    t.needsUpdate = true;
    return t;
}

// ── Scatter positions ──────────────────────────────────────────────────────────
// Distribute in a loose cloud, biased toward the XY plane with some Z depth,
// matching the visual depth layers seen in the reference.

function scatter(n: number): [number, number, number][] {
    return Array.from({ length: n }, () => [
        (Math.random() - 0.5) * 38,
        (Math.random() - 0.5) * 24,
        (Math.random() - 0.5) * 20,
    ] as [number, number, number]);
}

// ── Individual card ────────────────────────────────────────────────────────────

const GEOM = new THREE.PlaneGeometry(2.7, 2.0);

function FloatingCard({ model, pos }: { model: UniverseModel; pos: [number, number, number] }) {
    const mesh = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.ShaderMaterial>(null);
    const router = useRouter();
    const [hovered, setHovered] = useState(false);

    const texture = useMemo<THREE.Texture>(() => {
        const url = model.images?.find(i => i.isStarred)?.url ?? model.images?.[0]?.url;
        if (url) return new THREE.TextureLoader().load(url);
        return makeCardTexture(model);
    }, [model]);

    const uniforms = useMemo(() => ({
        uMap: { value: texture },
        uFade: { value: 0 },
    }), [texture]);

    const phase = useMemo(() => Math.random() * Math.PI * 2, []);
    const speed = useMemo(() => 0.09 + Math.random() * 0.08, []);
    const baseY = useRef(pos[1]);

    useFrame(({ clock }) => {
        if (!mesh.current) return;
        // Gentle vertical drift — each card has its own phase/speed
        mesh.current.position.y = baseY.current + Math.sin(clock.elapsedTime * speed + phase) * 0.22;
        // Hover scale
        const target = hovered ? 1.07 : 1.0;
        const cur = mesh.current.scale.x;
        mesh.current.scale.setScalar(cur + (target - cur) * 0.1);
    });

    const onClick = (e: { stopPropagation: () => void }) => {
        e.stopPropagation();
        router.push(`/models/${model.id}`);
    };

    const onOver = (e: { stopPropagation: () => void }) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
    };

    const onOut = () => {
        setHovered(false);
        document.body.style.cursor = "";
    };

    return (
        <mesh
            ref={mesh}
            position={pos}
            geometry={GEOM}
            onClick={onClick}
            onPointerOver={onOver}
            onPointerOut={onOut}
        >
            <shaderMaterial
                ref={matRef}
                vertexShader={VERT}
                fragmentShader={FRAG}
                uniforms={uniforms}
                transparent
                side={THREE.DoubleSide}
                depthWrite={false}
            />
        </mesh>
    );
}


// ── Loading overlay ────────────────────────────────────────────────────────────

function LoadingFallback() {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-stone-50">
            <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-px bg-stone-300 animate-pulse" />
                <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-300">
                    Loading universe…
                </p>
            </div>
        </div>
    );
}

// ── Main export ────────────────────────────────────────────────────────────────

export function ArchiveUniverse({ models }: { models: UniverseModel[] }) {
    const positions = useMemo(() => scatter(models.length), [models.length]);

    return (
        <div className="fixed inset-0 bg-stone-50">
            <Canvas
                camera={{ position: [0, 0, 14], fov: 62, near: 0.1, far: 80 }}
                gl={{ antialias: true, alpha: false }}
                dpr={[1, 2]}
            >
                <Suspense fallback={null}>
                    {/* Background + depth fog matching the stone-50 background */}
                    <color attach="background" args={["#faf9f7"]} />
                    <fog attach="fog" args={["#faf9f7", 22, 44]} />

                    <OrbitControls
                        enablePan={false}
                        enableDamping
                        dampingFactor={0.055}
                        minDistance={4}
                        maxDistance={30}
                        rotateSpeed={0.45}
                        zoomSpeed={0.8}
                        autoRotate
                        autoRotateSpeed={0.35}
                    />

                    {models.map((model, i) => (
                        <FloatingCard key={model.id} model={model} pos={positions[i]} />
                    ))}
                </Suspense>
            </Canvas>

            {/* Hint overlay */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
                <p className="text-[9px] uppercase tracking-[0.4em] font-bold text-stone-400 select-none">
                    Drag to explore · Scroll to zoom · Click to open
                </p>
            </div>
        </div>
    );
}
