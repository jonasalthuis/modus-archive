import { getDocs, query, collection, where, type QuerySnapshot, type DocumentData } from "firebase/firestore";
import { db } from "./firebase";

// Module-level cache — starts the query the moment this module is imported.
// page.tsx imports this early (before the dynamic ArchiveExperience chunk loads),
// so the Firestore round-trip is already in-flight by the time the component mounts.
let modelsSnap: Promise<QuerySnapshot<DocumentData>> | null = null;
let dossierSnap: Promise<QuerySnapshot<DocumentData> | null> | null = null;

export function prefetchArchive() {
    if (!modelsSnap) {
        modelsSnap = getDocs(query(collection(db, "ma_models"), where("isVisible", "==", true)));
    }
    if (!dossierSnap) {
        dossierSnap = getDocs(query(collection(db, "ma_dossiers"), where("isVisible", "==", true))).catch(() => null);
    }
}

export function getArchivePromises() {
    prefetchArchive();
    return { modelsSnap: modelsSnap!, dossierSnap: dossierSnap! };
}
