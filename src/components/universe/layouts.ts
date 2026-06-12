// Pure layout + grouping/filtering helpers for the archive universe.
// No React, no three — just math over model data → target positions.

import type {
    UniverseModel,
    Vec3,
    GroupAttr,
    Cluster,
    Filters,
} from "./types";

// ── Deterministic RNG ───────────────────────────────────────────────────────
// Seeded so a model's scattered position is stable across re-renders (a card
// shouldn't jump when an unrelated piece of state changes).

function seededRand(seed: string): () => number {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
        h ^= seed.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return () => {
        h += 0x6d2b79f5;
        let t = h;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const norm = (s?: string): string => (s && s.trim() ? s.trim() : "Unknown");

// ── Universe: loose floating scatter ────────────────────────────────────────

export function universeLayout(models: UniverseModel[]): Map<string, Vec3> {
    const out = new Map<string, Vec3>();
    for (const m of models) {
        const r = seededRand(m.id);
        out.set(m.id, [
            (r() - 0.5) * 38,
            (r() - 0.5) * 24,
            (r() - 0.5) * 20,
        ]);
    }
    return out;
}

// ── Grid: orthogonal flat grid on z = 0, row-major, centered ────────────────

export function gridLayout(models: UniverseModel[]): {
    positions: Map<string, Vec3>;
    cols: number;
    rows: number;
    width: number;
    height: number;
} {
    const n = models.length;
    const cols = Math.max(1, Math.ceil(Math.sqrt(n * 1.6)));
    const rows = Math.max(1, Math.ceil(n / cols));
    const gapX = 3.4;
    const gapY = 2.8;
    const width = (cols - 1) * gapX;
    const height = (rows - 1) * gapY;
    const positions = new Map<string, Vec3>();
    models.forEach((m, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        positions.set(m.id, [col * gapX - width / 2, height / 2 - row * gapY, 0]);
    });
    return { positions, cols, rows, width, height };
}

// ── Clustered: organic grouped clouds ───────────────────────────────────────
// "spiral" (name-based): golden-angle spiral, sorted alphabetically.
// "numeric" (scale/decade): flat grid, sorted by numeric value, left→right top→bottom.
// Clusters are well-separated in x/y and compressed toward z=0.

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ≈ 2.39996 rad
const CARD_SPACING = 1.95; // tighter packing — dense clusters, minimal visual gap
const CARD_HALF_W = 1.35; // half of card width (2.7)
const CARD_HALF_H = 1.0;  // half of card height (2.0)
const BOUNDS_PAD = 0.8;    // extra padding around cluster bounds

export type ClusterSortMode = "alpha" | "numeric";

function parseNumericKey(k: string): number {
    // Scale strings like "1:200" → 200
    const scaleMatch = k.match(/1\s*[:/]\s*(\d+(?:\.\d+)?)/);
    if (scaleMatch) return parseFloat(scaleMatch[1]);
    // Decade strings like "1980s" → 1980; plain numbers
    const n = parseFloat(k.replace(/[^\d.]/g, ""));
    return isNaN(n) ? 999999 : n;
}

export function clusteredLayout(
    models: UniverseModel[],
    keyOf: (m: UniverseModel) => string,
    sortMode: ClusterSortMode = "alpha",
): { positions: Map<string, Vec3>; clusters: Cluster[] } {
    const groups = new Map<string, UniverseModel[]>();
    for (const m of models) {
        const k = keyOf(m);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(m);
    }

    // Sort keys: "Unknown" always last, then by mode
    const keys = [...groups.keys()].sort((a, b) => {
        if (a === "Unknown") return 1;
        if (b === "Unknown") return -1;
        if (sortMode === "numeric") return parseNumericKey(a) - parseNumericKey(b);
        return a.localeCompare(b); // alpha
    });
    const G = keys.length;

    // Compute max cluster radius for dynamic spacing
    const maxN = Math.max(...keys.map((k) => groups.get(k)!.length));
    const maxR = CARD_SPACING * Math.sqrt(maxN) + 2;

    const positions = new Map<string, Vec3>();
    const clusters: Cluster[] = [];

    if (sortMode === "numeric") {
        // Grid layout: left→right, top→bottom, flat (z≈0)
        const numCols = Math.max(2, Math.ceil(Math.sqrt(G * 1.4)));
        const gx = Math.max(maxR * 1.8, 10); // gap between cluster centres
        const gy = Math.max(maxR * 1.6, 9);
        const totalRows = Math.ceil(G / numCols);

        keys.forEach((k, gi) => {
            const members = groups.get(k)!;
            const col = gi % numCols;
            const row = Math.floor(gi / numCols);
            const cx = (col - (numCols - 1) / 2) * gx;
            const cy = -(row - (totalRows - 1) / 2) * gy;
            const cz = 0;

            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            members.forEach((m, j) => {
                const r = CARD_SPACING * Math.sqrt(j + 0.5);
                const a = j * GOLDEN_ANGLE;
                const px = cx + Math.cos(a) * r;
                const py = cy + Math.sin(a) * r;
                positions.set(m.id, [px, py, cz]);
                minX = Math.min(minX, px); maxX = Math.max(maxX, px);
                minY = Math.min(minY, py); maxY = Math.max(maxY, py);
            });

            const clusterRadius = CARD_SPACING * Math.sqrt(members.length) + 1.6;
            const bounds = {
                x1: minX - CARD_HALF_W - BOUNDS_PAD,
                y1: minY - CARD_HALF_H - BOUNDS_PAD,
                x2: maxX + CARD_HALF_W + BOUNDS_PAD,
                y2: maxY + CARD_HALF_H + BOUNDS_PAD,
                z: cz,
            };
            clusters.push({ key: k, label: k, center: [cx, cy + clusterRadius, cz], count: members.length, modelIds: members.map((m) => m.id), bounds });
        });
    } else {
        // Spiral layout: golden-angle, wide x/y, compressed z
        const spread = 5.5 + Math.sqrt(G) * 1.0;

        keys.forEach((k, gi) => {
            const members = groups.get(k)!;
            const jr = seededRand("center::" + k);
            const angle = gi * GOLDEN_ANGLE;
            const radius = spread * Math.sqrt(gi + 0.55);
            const cx = Math.cos(angle) * radius + (jr() - 0.5) * 2.0;
            const cy = Math.sin(angle) * radius * 0.82 + (jr() - 0.5) * 2.0;
            const cz = (jr() - 0.5) * 1.5; // much less depth variation

            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            members.forEach((m, j) => {
                const jz = seededRand(m.id + "::" + k);
                const r = CARD_SPACING * Math.sqrt(j + 0.5);
                const a = j * GOLDEN_ANGLE;
                const px = cx + Math.cos(a) * r;
                const py = cy + Math.sin(a) * r;
                positions.set(m.id, [px, py, cz + (jz() - 0.5) * 0.8]);
                minX = Math.min(minX, px); maxX = Math.max(maxX, px);
                minY = Math.min(minY, py); maxY = Math.max(maxY, py);
            });

            const clusterRadius = CARD_SPACING * Math.sqrt(members.length) + 1.6;
            const bounds = {
                x1: minX - CARD_HALF_W - BOUNDS_PAD,
                y1: minY - CARD_HALF_H - BOUNDS_PAD,
                x2: maxX + CARD_HALF_W + BOUNDS_PAD,
                y2: maxY + CARD_HALF_H + BOUNDS_PAD,
                z: cz,
            };
            clusters.push({ key: k, label: k, center: [cx, cy + clusterRadius, cz], count: members.length, modelIds: members.map((m) => m.id), bounds });
        });
    }

    return { positions, clusters };
}

// ── Grouping key functions ──────────────────────────────────────────────────

export function makeKeyOf(
    attr: GroupAttr,
    dossierMap?: Map<string, string[]>,
): (m: UniverseModel) => string {
    switch (attr) {
        case "none":
            return () => "All";
        case "architect":
            return (m) => norm(m.architect);
        case "leadMaker":
            return (m) => norm(m.leadMaker);
        case "modelType":
            return (m) => norm(m.modelType);
        case "buildingType":
            return (m) => norm(m.buildingType);
        case "buildingStatus":
            return (m) => norm(m.buildingStatus);
        case "location":
            return (m) => norm(m.location);
        case "scale":
            return (m) => (m.scale?.trim() ? m.scale.trim() : "Unknown");
        case "decade":
            return (m) => (m.year ? `${Math.floor(m.year / 10) * 10}s` : "Unknown");
        case "material":
            return (m) => norm(m.materials?.[0]);
        case "dossier":
            return (m) => dossierMap?.get(m.id)?.[0] ?? "Unassigned";
    }
}

// "none" is intentionally excluded — it's the default ungrouped state,
// represented by a "Clear" button in the UI rather than a list entry.
export const GROUP_ATTRS: { key: GroupAttr; label: string; sortMode: ClusterSortMode }[] = [
    { key: "architect", label: "Architect", sortMode: "alpha" },
    { key: "leadMaker", label: "Lead maker", sortMode: "alpha" },
    { key: "modelType", label: "Model type", sortMode: "alpha" },
    { key: "buildingType", label: "Building type", sortMode: "alpha" },
    { key: "buildingStatus", label: "Building status", sortMode: "alpha" },
    { key: "decade", label: "Decade", sortMode: "numeric" },
    { key: "scale", label: "Scale", sortMode: "numeric" },
    { key: "material", label: "Material", sortMode: "alpha" },
    { key: "location", label: "Location", sortMode: "alpha" },
    { key: "dossier", label: "Dossier", sortMode: "alpha" },
];

// ── Scale parsing + distinct values ─────────────────────────────────────────

export function parseScale(scale?: string): number | null {
    if (!scale) return null;
    const m = scale.match(/1\s*[:/]\s*(\d+(?:\.\d+)?)/);
    if (m) return parseFloat(m[1]);
    const n = parseFloat(scale.replace(/[^\d.]/g, ""));
    return isNaN(n) ? null : n;
}

export function distinctScales(models: UniverseModel[]): string[] {
    const set = new Set<string>();
    for (const m of models) {
        const s = m.scale?.trim();
        if (s && parseScale(s) != null) set.add(s);
    }
    return [...set].sort((a, b) => (parseScale(a) ?? 0) - (parseScale(b) ?? 0));
}

export function distinctValues(
    models: UniverseModel[],
    pick: (m: UniverseModel) => string | undefined,
): string[] {
    const set = new Set<string>();
    for (const m of models) {
        const v = pick(m)?.trim();
        if (v) set.add(v);
    }
    return [...set].sort();
}

// ── Sorting ─────────────────────────────────────────────────────────────────

export type SortAttr = "default" | "scale" | "year" | "architect" | "leadMaker";

export const SORT_ATTRS: { key: SortAttr; label: string }[] = [
    { key: "default", label: "Model no." },
    { key: "year", label: "Year" },
    { key: "scale", label: "Scale" },
    { key: "architect", label: "Architect" },
    { key: "leadMaker", label: "Lead maker" },
];

export function sortModels(models: UniverseModel[], sort: SortAttr): UniverseModel[] {
    if (sort === "default") return [...models];
    return [...models].sort((a, b) => {
        switch (sort) {
            case "scale": {
                const pa = parseScale(a.scale) ?? Infinity;
                const pb = parseScale(b.scale) ?? Infinity;
                return pa !== pb ? pa - pb : (a.modelNumber ?? "").localeCompare(b.modelNumber ?? "");
            }
            case "year":
                return (a.year ?? 9999) !== (b.year ?? 9999)
                    ? (a.year ?? 9999) - (b.year ?? 9999)
                    : (a.modelNumber ?? "").localeCompare(b.modelNumber ?? "");
            case "architect":
                return (a.architect ?? "").localeCompare(b.architect ?? "") ||
                    (a.modelNumber ?? "").localeCompare(b.modelNumber ?? "");
            case "leadMaker":
                return (a.leadMaker ?? "").localeCompare(b.leadMaker ?? "") ||
                    (a.modelNumber ?? "").localeCompare(b.modelNumber ?? "");
            default:
                return 0;
        }
    });
}

// ── Filtering ───────────────────────────────────────────────────────────────

export function applyFilters(models: UniverseModel[], f: Filters): UniverseModel[] {
    const q = f.text.trim().toLowerCase();
    return models.filter((m) => {
        if (f.modelType && norm(m.modelType) !== f.modelType) return false;
        if (f.buildingType && norm(m.buildingType) !== f.buildingType) return false;
        if (f.buildingStatus && norm(m.buildingStatus) !== f.buildingStatus) return false;
        if (f.scales.length && !(m.scale && f.scales.includes(m.scale.trim()))) return false;
        if (q) {
            const hay = `${m.title ?? ""} ${m.architect ?? ""} ${m.modelNumber ?? ""}`.toLowerCase();
            if (!hay.includes(q)) return false;
        }
        return true;
    });
}
