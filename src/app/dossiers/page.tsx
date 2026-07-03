import React from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DossiersListClient, type Dossier } from "./DossiersListClient";

async function getDossiers(): Promise<Dossier[]> {
    try {
        const snap = await getDocs(query(collection(db, "ma_dossiers"), where("isVisible", "==", true)));
        return snap.docs.map((d) => JSON.parse(JSON.stringify({ id: d.id, ...d.data() })) as Dossier);
    } catch {
        return [];
    }
}

export default async function DossiersPage() {
    const dossiers = await getDossiers();
    return <DossiersListClient dossiers={dossiers} />;
}
