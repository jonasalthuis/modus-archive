"use client";

import React, { useLayoutEffect, useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import type { UniverseModel, Vec3 } from "./types";

// "grid" = locked flat (no bob, no depth fog); "float" = drifting in space.
type CardMode = "grid" | "float";

// ── Shaders: distance fog + visibility fade ─────────────────────────────────

const VERT = /* glsl */ `
  varying vec2 vUv;
  varying float vEyeZ;
  void main() {
    vUv = uv;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vEyeZ = -mvPos.z;
    gl_Position = projectionMatrix * mvPos;
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uFade;     // 0 = visible, 1 = fully faded out
  uniform float uDim;      // 0 = full colour, 1 = greyed/dimmed (filtered but shown)
  uniform float uFogNear;  // eye-space depth where the fade begins
  uniform float uFogFar;   // …and where it's fully gone
  varying vec2 vUv;
  varying float vEyeZ;
  void main() {
    vec4 tex = texture2D(uMap, vUv);
    float fog = 1.0 - smoothstep(uFogNear, uFogFar, vEyeZ);
    // Desaturate + reduce opacity when dimmed
    float lum = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
    vec3 grey = vec3(lum);
    vec3 rgb = mix(tex.rgb, grey, uDim * 0.85);
    float a = tex.a * fog * (1.0 - uFade) * mix(1.0, 0.22, uDim);
    gl_FragColor = vec4(rgb, a);
  }
`;

// ── Fallback card texture (drawn when a model has no image) ──────────────────

function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxW: number,
    lineH: number,
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
    const W = 600;
    const H = 440;
    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext("2d")!;

    ctx.fillStyle = "#eceae6";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#cbc7c2";
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

const GEOM = new THREE.PlaneGeometry(2.7, 2.0);

// ── Soft drop shadow (grid only) ────────────────────────────────────────────
// A larger, blurred dark quad sits just behind each card; the card covers the
// centre so only the soft margin reads as a drop shadow.

const SHADOW_GEOM = new THREE.PlaneGeometry(2.7 * 1.3, 2.0 * 1.42);

let SHADOW_TEX: THREE.CanvasTexture | null = null;
function shadowTexture(): THREE.CanvasTexture {
    if (SHADOW_TEX) return SHADOW_TEX;
    const W = 256;
    const H = 192;
    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 30;
    const m = 50;
    const r = 5;
    ctx.beginPath();
    ctx.moveTo(m + r, m);
    ctx.arcTo(W - m, m, W - m, H - m, r);
    ctx.arcTo(W - m, H - m, m, H - m, r);
    ctx.arcTo(m, H - m, m, m, r);
    ctx.arcTo(m, m, W - m, m, r);
    ctx.closePath();
    ctx.fill();
    SHADOW_TEX = new THREE.CanvasTexture(cv);
    SHADOW_TEX.needsUpdate = true;
    return SHADOW_TEX;
}

// ── Card ────────────────────────────────────────────────────────────────────

interface FloatingCardProps {
    model: UniverseModel;
    target: Vec3;
    visible: boolean;
    dimmed: boolean; // greyed-out (filtered but still shown in grid)
    mode: CardMode;
    depthFog: boolean;
    clusterKey?: string;
    onClusterHover?: (key: string | null) => void;
}

export function FloatingCard({ model, target, visible, dimmed, mode, depthFog, clusterKey, onClusterHover }: FloatingCardProps) {
    const mesh = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.ShaderMaterial>(null);
    const shadowMat = useRef<THREE.MeshBasicMaterial>(null);
    const router = useRouter();
    const [hovered, setHovered] = useState(false);

    const shadowTex = useMemo(() => shadowTexture(), []);

    const texture = useMemo<THREE.Texture>(() => {
        const url = model.images?.find((i) => i.isStarred)?.url ?? model.images?.[0]?.url;
        if (url) {
            const loader = new THREE.TextureLoader();
            loader.crossOrigin = 'anonymous';
            return loader.load(url);
        }
        return makeCardTexture(model);
    }, [model]);

    const uniforms = useMemo(
        () => ({
            uMap: { value: texture },
            uFade: { value: 0 },
            uDim: { value: 0 },
            uFogNear: { value: 55 },
            uFogFar: { value: 130 },
        }),
        [texture],
    );

    const phase = useMemo(() => Math.random() * Math.PI * 2, []);
    const speed = useMemo(() => 0.09 + Math.random() * 0.08, []);

    // Keep latest target/visible/dimmed in refs so the frame loop reads fresh values.
    const targetRef = useRef(target);
    targetRef.current = target;
    const visibleRef = useRef(visible);
    visibleRef.current = visible;
    const dimmedRef = useRef(dimmed);
    dimmedRef.current = dimmed;

    // Set initial mesh position synchronously before first paint so cards
    // don't flash from [0,0,0] on mount. useFrame eases all subsequent moves.
    const initialTarget = useRef(target);
    useLayoutEffect(() => {
        if (mesh.current) {
            mesh.current.position.set(...initialTarget.current);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useFrame(({ clock }) => {
        const m = mesh.current;
        if (!m) return;

        const [tx, ty, tz] = targetRef.current;
        const bob = mode === "grid" ? 0 : Math.sin(clock.elapsedTime * speed + phase) * 0.22;

        // Ease position toward target (+ bob on Y for floating modes).
        m.position.x += (tx - m.position.x) * 0.08;
        m.position.y += (ty + bob - m.position.y) * 0.08;
        m.position.z += (tz - m.position.z) * 0.08;

        // Hover scale — don't scale up dimmed cards.
        const targetScale = hovered && visibleRef.current && !dimmedRef.current ? 1.07 : 1.0;
        const cur = m.scale.x;
        m.scale.setScalar(cur + (targetScale - cur) * 0.1);

        if (matRef.current) {
            // Visibility fade — drop out of raycasting once nearly gone.
            const uFade = matRef.current.uniforms.uFade;
            const targetFade = visibleRef.current ? 0 : 1;
            uFade.value += (targetFade - uFade.value) * 0.12;
            m.visible = uFade.value < 0.97;

            // Dim (greyscale + transparent) for filtered-but-shown cards.
            const uDim = matRef.current.uniforms.uDim;
            const targetDim = dimmedRef.current ? 1 : 0;
            uDim.value += (targetDim - uDim.value) * 0.10;

            // Depth fade only in the open universe; off elsewhere so pulling the
            // camera back (clustered / grid) doesn't fade everything out.
            const near = matRef.current.uniforms.uFogNear;
            const far = matRef.current.uniforms.uFogFar;
            if (depthFog) {
                near.value = 55;
                far.value = 130;
            } else {
                near.value = 1e5;
                far.value = 2e5;
            }
        }

        // Drop shadow only in grid view (and only for visible, non-dimmed cards).
        if (shadowMat.current) {
            const targetOp = mode === "grid" && visibleRef.current && !dimmedRef.current ? 0.5 : 0;
            shadowMat.current.opacity += (targetOp - shadowMat.current.opacity) * 0.12;
            shadowMat.current.visible = shadowMat.current.opacity > 0.01;
        }
    });

    const onClick = (e: { stopPropagation: () => void }) => {
        if (!visible) return;
        e.stopPropagation();
        router.push(`/models/${model.id}`);
    };
    const onOver = (e: { stopPropagation: () => void }) => {
        if (!visible) return;
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
        onClusterHover?.(clusterKey ?? null);
    };
    const onOut = () => {
        setHovered(false);
        document.body.style.cursor = "";
        onClusterHover?.(null);
    };

    return (
        <mesh
            ref={mesh}
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

            {/* soft drop shadow, just behind the card (grid only) */}
            <mesh geometry={SHADOW_GEOM} position={[0.04, -0.12, -0.06]} raycast={() => null}>
                <meshBasicMaterial
                    ref={shadowMat}
                    map={shadowTex}
                    transparent
                    opacity={0}
                    depthWrite={false}
                    toneMapped={false}
                />
            </mesh>
        </mesh>
    );
}
