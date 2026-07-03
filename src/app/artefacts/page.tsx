import React from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArtefactsListClient, type Artefact } from "./ArtefactsListClient";

export const dynamic = "force-dynamic";

async function getArtefacts(): Promise<Artefact[]> {
    try {
        const snap = await getDocs(
            query(collection(db, "ma_artefacts"), where("isVisible", "==", true)),
        );
        return snap.docs.map((d) => JSON.parse(JSON.stringify({ id: d.id, ...d.data() })) as Artefact);
    } catch (err) {
        console.error("[artefacts] Firestore query failed:", err);
        return [];
    }
}

export default async function ArtefactsPage() {
    const artefacts = await getArtefacts();
    return <ArtefactsListClient artefacts={artefacts} />;
}
