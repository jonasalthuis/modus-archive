import { notFound } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ModelCanvas } from "@/components/canvas/ModelCanvas";
import type { FeaturedImages, ImageGroup, ModelData, ModelImage } from "@/types/model";

// Coerce an unknown Firestore value to a trimmed string, or undefined.
function str(v: unknown): string | undefined {
    if (typeof v === "string") {
        const t = v.trim();
        return t.length ? t : undefined;
    }
    if (typeof v === "number") return String(v);
    return undefined;
}

function strArray(v: unknown): string[] | undefined {
    if (!Array.isArray(v)) return undefined;
    const out = v.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
    return out.length ? out : undefined;
}

function num(v: unknown): number | undefined {
    if (typeof v === "number") return v;
    if (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))) return Number(v);
    return undefined;
}

// Build a clean, fully-serializable ModelData containing only the fields the
// public canvas needs. This (1) strips the Firestore Timestamp on `updatedAt`
// which cannot cross the server→client boundary, and (2) keeps private
// sheet-sync columns (fees, invoices, job numbers) out of the public bundle.
function sanitizeModel(id: string, data: Record<string, unknown>): ModelData {
    return {
        id,
        isVisible: data.isVisible === true,
        modelNumber: str(data.modelNumber) ?? id,
        title: str(data.title),
        architect: str(data.architect),
        year: num(data.year),
        scale: str(data.scale),
        modelSize: str(data.modelSize) ?? str(data.size),
        materials: strArray(data.materials),
        tags: strArray(data.tags),
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
        featured:
            data.featured && typeof data.featured === "object"
                ? (data.featured as FeaturedImages)
                : undefined,
    };
}

async function getModel(id: string): Promise<ModelData | null> {
    try {
        const snap = await getDoc(doc(db, "ma_models", id));
        if (!snap.exists()) return null;
        const data = snap.data();
        if (data.isVisible === false) return null;
        return sanitizeModel(snap.id, data);
    } catch (error) {
        console.error("Error fetching model:", error);
        return null;
    }
}

export default async function ModelPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const model = await getModel(id);
    if (!model) notFound();
    return <ModelCanvas model={model} />;
}
