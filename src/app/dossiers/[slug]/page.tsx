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

async function getRelatedDossiers(currentId: string, tags: string[]): Promise<RelatedDossier[]> {
    if (tags.length === 0) return [];
    try {
        const snap = await getDocs(
            query(collection(db, "ma_dossiers"), where("isVisible", "==", true)),
        );
        const all = snap.docs
            .filter((d) => d.id !== currentId)
            .map((d) => JSON.parse(JSON.stringify({ id: d.id, ...d.data() })) as RelatedDossier & { tags?: string[] });

        // Score by tag overlap, keep top 4.
        return all
            .map((d) => ({ d, score: (d.tags ?? []).filter((t) => tags.includes(t)).length }))
            .filter(({ score }) => score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 4)
            .map(({ d }) => d);
    } catch {
        return [];
    }
}

export default async function DossierPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const dossier = await getDossier(slug);
    if (!dossier) notFound();

    const related = await getRelatedDossiers(dossier.id, dossier.tags ?? []);

    return <DossierPageClient dossier={dossier} related={related} />;
}
