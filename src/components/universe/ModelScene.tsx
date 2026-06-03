"use client";

import React, {
    Suspense,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { useRouter } from "next/navigation";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import * as THREE from "three";
import { Save, RotateCcw, ChevronLeft, ChevronRight, Maximize, Play, Pause, Square } from "lucide-react";
import type { ModelData, ImageGroup, ModelImage } from "@/types/model";
import { clean } from "@/lib/modelUtils";

// Re-use the existing card components inside the Html overlays
import { TitleCard } from "@/components/canvas/cards/TitleCard";
import { MetaCard } from "@/components/canvas/cards/MetaCard";
import { NotesCard } from "@/components/canvas/cards/NotesCard";

// ── Data fetching ──────────────────────────────────────────────────────────────

function str(v: unknown): string | undefined {
    if (typeof v === "string") { const t = v.trim(); return t.length ? t : undefined; }
    if (typeof v === "number") return String(v);
}
function num(v: unknown): number | undefined {
    if (typeof v === "number") return v;
    if (typeof v === "string" && !isNaN(Number(v))) return Number(v);
}
function strArr(v: unknown): string[] | undefined {
    if (!Array.isArray(v)) return undefined;
    const out = v.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
    return out.length ? out : undefined;
}

function sanitize(id: string, data: Record<string, unknown>): ModelData {
    return {
        id,
        isVisible: data.isVisible === true,
        modelNumber: str(data.modelNumber) ?? id,
        title: str(data.title),
        architect: str(data.architect),
        year: num(data.year),
        scale: str(data.scale),
        modelSize: str(data.modelSize) ?? str(data.size),
        materials: strArr(data.materials),
        photographer: str(data.photographer),
        notes: str(data.notes),
        buildingStatus: str(data.buildingStatus),
        buildingType: str(data.buildingType),
        modelType: str(data.modelType),
        location: str(data.location),
        leadMaker: str(data.leadMaker),
        provenance: str(data.provenance),
        voiceNarrative: str(data.voiceNarrative),
        images: Array.isArray(data.images) ? (data.images as ModelImage[]) : undefined,
        imageGroups: Array.isArray(data.imageGroups) ? (data.imageGroups as ImageGroup[]) : undefined,
    };
}

async function fetchModel(id: string): Promise<ModelData | null> {
    const snap = await getDoc(doc(db, "ma_models", id));
    if (!snap.exists()) return null;
    const data = snap.data();
    if (data.isVisible === false) return null;
    return sanitize(snap.id, data);
}

async function fetchNeighbors(id: string): Promise<{ prevId: string | null; nextId: string | null }> {
    try {
        const snap = await getDocs(query(collection(db, "ma_models"), where("isVisible", "==", true)));
        const ids = snap.docs.map(d => d.id).sort();
        const i = ids.indexOf(id);
        return { prevId: i > 0 ? ids[i - 1] : null, nextId: i < ids.length - 1 ? ids[i + 1] : null };
    } catch {
        return { prevId: null, nextId: null };
    }
}

// ── Shaders ────────────────────────────────────────────────────────────────────

const VERT = /* glsl */ `
  varying vec2 vUv;
  varying float vEyeZ;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vEyeZ = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;
const FRAG = /* glsl */ `
  uniform sampler2D uMap;
  varying vec2 vUv;
  varying float vEyeZ;
  void main() {
    vec4 c = texture2D(uMap, vUv);
    float fog = 1.0 - smoothstep(14.0, 24.0, vEyeZ);
    gl_FragColor = vec4(c.rgb, c.a * fog);
  }
`;

// ── Floating image plane ───────────────────────────────────────────────────────

function ImagePlane({
    url,
    pos,
    size = [2.6, 2.0],
}: {
    url: string;
    pos: [number, number, number];
    size?: [number, number];
}) {
    const mesh = useRef<THREE.Mesh>(null);
    const phase = useMemo(() => Math.random() * Math.PI * 2, []);
    const baseY = useRef(pos[1]);
    const texture = useMemo(() => new THREE.TextureLoader().load(url), [url]);
    const uniforms = useMemo(() => ({ uMap: { value: texture } }), [texture]);

    useFrame(({ clock }) => {
        if (!mesh.current) return;
        mesh.current.position.y = baseY.current + Math.sin(clock.elapsedTime * 0.13 + phase) * 0.18;
    });

    return (
        <mesh ref={mesh} position={pos}>
            <planeGeometry args={size} />
            <shaderMaterial
                vertexShader={VERT}
                fragmentShader={FRAG}
                uniforms={uniforms}
                transparent
                depthWrite={false}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}

// ── HTML info card positioned in 3D space ──────────────────────────────────────

function InfoCard3D({
    pos,
    children,
    phase = 0,
    driftAmp = 0.18,
}: {
    pos: [number, number, number];
    children: React.ReactNode;
    phase?: number;
    driftAmp?: number;
}) {
    const group = useRef<THREE.Group>(null);
    const baseY = useRef(pos[1]);

    useFrame(({ clock }) => {
        if (!group.current) return;
        group.current.position.y = baseY.current + Math.sin(clock.elapsedTime * 0.11 + phase) * driftAmp;
    });

    return (
        <group ref={group} position={pos}>
            <Html
                transform
                occlude="raycast"
                distanceFactor={5}
                style={{ pointerEvents: "none" }}
            >
                {children}
            </Html>
        </group>
    );
}

// ── Camera reset helper ────────────────────────────────────────────────────────

const INITIAL_CAM = new THREE.Vector3(0, 0, 10);

function CameraController({
    onReady,
}: {
    onReady: (reset: () => void, fit: () => void) => void;
}) {
    const { camera } = useThree();
    const controlsRef = useRef<{ reset: () => void; target: THREE.Vector3 } | null>(null);

    const reset = useCallback(() => {
        camera.position.copy(INITIAL_CAM);
        camera.lookAt(0, 0, 0);
        controlsRef.current?.reset();
    }, [camera]);

    const fit = useCallback(() => {
        camera.position.set(0, 0, 14);
        camera.lookAt(0, 0, 0);
    }, [camera]);

    useEffect(() => {
        onReady(reset, fit);
    }, [onReady, reset, fit]);

    return (
        <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.055}
            enablePan={false}
            minDistance={3}
            maxDistance={22}
            rotateSpeed={0.45}
            zoomSpeed={0.8}
        />
    );
}

// ── Scene inner ────────────────────────────────────────────────────────────────

function SceneContent({
    model,
    onCameraReady,
}: {
    model: ModelData;
    onCameraReady: (reset: () => void, fit: () => void) => void;
}) {
    const heroUrl = useMemo(() => {
        if (model.images?.length) {
            return (model.images.find(i => i.isStarred) ?? model.images[0]).url;
        }
        return null;
    }, [model]);

    const extraImages = useMemo(() =>
        model.images?.slice(1, 4) ?? [],
        [model],
    );

    const notes = clean(model.notes);

    return (
        <>
            <color attach="background" args={["#f7f6f4"]} />
            <fog attach="fog" args={["#f7f6f4", 16, 32]} />

            <CameraController onReady={onCameraReady} />

            {/* Hero image */}
            {heroUrl && (
                <ImagePlane url={heroUrl} pos={[0, 0.3, 0]} size={[3.6, 2.7]} />
            )}

            {/* Additional images, scattered around */}
            {extraImages.map((img, i) => (
                <ImagePlane
                    key={img.url}
                    url={img.url}
                    pos={[(i % 2 === 0 ? -1 : 1) * (3.2 + i * 0.4), (Math.random() - 0.5) * 1.5, -1.5 - i * 0.8]}
                    size={[1.8, 1.4]}
                />
            ))}

            {/* Info cards as HTML in 3D */}
            <InfoCard3D pos={[-4.8, 1.4, 0]} phase={0.0}>
                <div style={{ transform: "scale(0.55)", transformOrigin: "top left" }}>
                    <TitleCard model={model} />
                </div>
            </InfoCard3D>

            <InfoCard3D pos={[4.0, 1.2, -1]} phase={1.1}>
                <div style={{ transform: "scale(0.48)", transformOrigin: "top left" }}>
                    <MetaCard model={model} />
                </div>
            </InfoCard3D>

            {notes && (
                <InfoCard3D pos={[-4.8, -1.8, -0.5]} phase={2.0}>
                    <div style={{ transform: "scale(0.5)", transformOrigin: "top left" }}>
                        <NotesCard notes={notes} />
                    </div>
                </InfoCard3D>
            )}
        </>
    );
}

// ── Loading screen ─────────────────────────────────────────────────────────────

function LoadingScreen() {
    return (
        <div className="fixed inset-0 bg-stone-50 flex items-center justify-center">
            <div className="space-y-3 text-center">
                <div className="w-12 h-px bg-stone-300 mx-auto animate-pulse" />
                <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-300">
                    Opening model…
                </p>
            </div>
        </div>
    );
}

// ── Bottom nav bar (same controls as the old canvas) ──────────────────────────

interface BottomBarProps {
    model: ModelData;
    prevId: string | null;
    nextId: string | null;
    onSave: () => void;
    onReset: () => void;
    onFit: () => void;
    savedFeedback: boolean;
}

function BottomBar({ model, prevId, nextId, onSave, onReset, onFit, savedFeedback }: BottomBarProps) {
    const router = useRouter();
    const btn = "w-9 h-9 flex items-center justify-center border border-stone-200 rounded-md bg-white text-stone-600 hover:border-stone-900 hover:text-stone-900 transition-colors disabled:opacity-30 disabled:pointer-events-none";

    return (
        <div className="fixed bottom-6 right-8 z-50 flex items-center gap-2">
            <button onClick={() => prevId && router.push(`/models/${prevId}`)} disabled={!prevId} className={btn} aria-label="Previous model"><ChevronLeft size={15} /></button>
            <button onClick={() => nextId && router.push(`/models/${nextId}`)} disabled={!nextId} className={btn} aria-label="Next model"><ChevronRight size={15} /></button>
            <span className="w-px h-5 bg-stone-200 mx-1" />
            <button onClick={onSave} className={savedFeedback ? "w-9 h-9 flex items-center justify-center border border-stone-900 rounded-md bg-white text-stone-900" : btn} aria-label="Save view"><Save size={13} /></button>
            <button onClick={onReset} className={btn} aria-label="Reset view"><RotateCcw size={13} /></button>
            <button onClick={onFit} className={btn} aria-label="Fit view"><Maximize size={13} /></button>
        </div>
    );
}

// ── Main export ────────────────────────────────────────────────────────────────

export function ModelScene({ modelId }: { modelId: string }) {
    const [model, setModel] = useState<ModelData | null>(null);
    const [loading, setLoading] = useState(true);
    const [prevId, setPrevId] = useState<string | null>(null);
    const [nextId, setNextId] = useState<string | null>(null);
    const [savedFeedback, setSavedFeedback] = useState(false);
    const cameraResetRef = useRef<() => void>(() => { });
    const cameraFitRef = useRef<() => void>(() => { });

    useEffect(() => {
        setLoading(true);
        Promise.all([fetchModel(modelId), fetchNeighbors(modelId)]).then(([m, n]) => {
            setModel(m);
            setPrevId(n.prevId);
            setNextId(n.nextId);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [modelId]);

    const handleCameraReady = useCallback((reset: () => void, fit: () => void) => {
        cameraResetRef.current = reset;
        cameraFitRef.current = fit;
    }, []);

    const saveView = useCallback(() => {
        setSavedFeedback(true);
        setTimeout(() => setSavedFeedback(false), 1500);
        // Camera orientation save could be added here if needed
    }, []);

    if (loading) return <LoadingScreen />;
    if (!model) {
        return (
            <div className="fixed inset-0 bg-stone-50 flex items-center justify-center">
                <p className="text-sm text-stone-400">Model not found</p>
            </div>
        );
    }

    return (
        <>
            <div className="fixed inset-0 bg-stone-50">
                <Canvas
                    camera={{ position: [0, 0, 10], fov: 58, near: 0.1, far: 60 }}
                    gl={{ antialias: true, alpha: false }}
                    dpr={[1, 2]}
                >
                    <Suspense fallback={null}>
                        <SceneContent model={model} onCameraReady={handleCameraReady} />
                    </Suspense>
                </Canvas>
            </div>

            {/* Model number chip — top right */}
            <div className="fixed top-6 right-8 z-50 select-none">
                <span className="inline-block border border-stone-300 rounded-md bg-white px-3 py-2 text-[11px] font-bold tracking-[0.35em] text-stone-800 font-mono">
                    {model.modelNumber ?? "—"}
                </span>
            </div>

            {/* Bottom control bar */}
            <BottomBar
                model={model}
                prevId={prevId}
                nextId={nextId}
                onSave={saveView}
                onReset={() => cameraResetRef.current()}
                onFit={() => cameraFitRef.current()}
                savedFeedback={savedFeedback}
            />
        </>
    );
}
