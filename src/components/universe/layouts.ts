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

// ── Clustered: grouped floating clouds ──────────────────────────────────────

export function clusteredLayout(
    models: UniverseModel[],
    keyOf: (m: UniverseModel) => string,
): { positions: Map<string, Vec3>; clusters: Cluster[] } {
    const groups = new Map<string, UniverseModel[]>();
    for (const m of models) {
        const k = keyOf(m);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(m);
    }

    // Largest groups first, so the busiest clusters land near the centre.
    const keys = [...groups.keys()].sort(
        (a, b) => groups.get(b)!.length - groups.get(a)!.length,
    );
    const G = keys.length;
    const cols = Math.max(1, Math.ceil(Math.sqrt(G)));
    const rowsG = Math.ceil(G / cols);
    const spacing = 17;

    const positions = new Map<string, Vec3>();
    const clusters: Cluster[] = [];

    keys.forEach((k, gi) => {
        const col = gi % cols;
        const row = Math.floor(gi / cols);
        const cx = (col - (cols - 1) / 2) * spacing;
        const cy = ((rowsG - 1) / 2 - row) * spacing * 0.72;
        const cz = 0;

        const members = groups.get(k)!;
        const radius = 2 + Math.min(5, Math.sqrt(members.length));

        members.forEach((m) => {
            const r = seededRand(m.id + "::" + k);
            positions.set(m.id, [
                cx + (r() - 0.5) * radius * 2,
                cy + (r() - 0.5) * radius * 1.6,
                cz + (r() - 0.5) * radius * 1.4,
            ]);
        });

        clusters.push({
            key: k,
            label: k,
            center: [cx, cy + radius * 1.1 + 1.4, cz],
            count: members.length,
        });
    });

    return { positions, clusters };
}

// ── Grouping key functions ──────────────────────────────────────────────────

export function makeKeyOf(
    attr: GroupAttr,
    dossierMap?: Map<string, string[]>,
): (m: UniverseModel) => string {
    switch (attr) {
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

export const GROUP_ATTRS: { key: GroupAttr; label: string }[] = [
    { key: "architect", label: "Architect" },
    { key: "leadMaker", label: "Lead maker" },
    { key: "modelType", label: "Model type" },
    { key: "buildingType", label: "Building type" },
    { key: "buildingStatus", label: "Building status" },
    { key: "decade", label: "Decade" },
    { key: "scale", label: "Scale" },
    { key: "material", label: "Material" },
    { key: "location", label: "Location" },
    { key: "dossier", label: "Dossier" },
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
