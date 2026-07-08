import React from "react";
import { notFound } from "next/navigation";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DossierPageClient, type DossierData, type RelatedDossier } from "./DossierPageClient";

async function getDossier(slug: string): Promise<DossierData | null> {
    try {
        const snap = await getDoc(doc(db, "ma_dossiers", slug));
        if (!snap.exists()) return null;
        const data = snap.data();
        if (data.isVisible === false) return null;
        return JSON.parse(JSON.stringify({ id: snap.id, ...data })) as DossierData;
    } catch {
        return null;
    }
}

async function getAllDossiers(): Promise<{ id: string; tags?: string[]; coverImage?: string; title?: string; intro?: string }[]> {
    try {
        const snap = await getDocs(
            query(collection(db, "ma_dossiers"), where("isVisible", "==", true)),
        );
        return snap.docs.map((d) => JSON.parse(JSON.stringify({ id: d.id, ...d.data() })));
    } catch {
        return [];
    }
}

export default async function DossierPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;

    const [dossier, allDossiers] = await Promise.all([
        getDossier(slug),
        getAllDossiers(),
    ]);

    if (!dossier) notFound();

    // Related: scored by tag overlap
    const related: RelatedDossier[] = allDossiers
        .filter((d) => d.id !== dossier.id)
        .map((d) => ({ d, score: (d.tags ?? []).filter((t) => (dossier.tags ?? []).includes(t)).length }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
        .map(({ d }) => d as RelatedDossier);

    // Prev / next in document order
    const idx = allDossiers.findIndex((d) => d.id === dossier.id);
    const prevSlug = idx > 0 ? allDossiers[idx - 1].id : null;
    const nextSlug = idx >= 0 && idx < allDossiers.length - 1 ? allDossiers[idx + 1].id : null;

    return <DossierPageClient dossier={dossier} related={related} prevSlug={prevSlug} nextSlug={nextSlug} />;
}
