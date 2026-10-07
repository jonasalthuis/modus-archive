import { getDocs, query, collection, where, type QuerySnapshot, type DocumentData } from "firebase/firestore";
import { auth, db } from "./firebase";

// Module-level cache — starts the query the moment this module is imported.
// page.tsx imports this early (before the dynamic ArchiveExperience chunk loads),
// so the Firestore round-trip is already in-flight by the time the component mounts.
let modelsSnap: Promise<QuerySnapshot<DocumentData>> | null = null;
let dossierSnap: Promise<QuerySnapshot<DocumentData> | null> | null = null;

export function prefetchArchive() {
    // Content reads require a signed-in session (incl. anonymous invite guests). Querying
    // before auth has restored would be denied, and a cached rejection would stick for the
    // whole page life — so skip until there is a user; the component calls this again.
    if (!auth.currentUser) return;
    if (!modelsSnap) {
        const p = getDocs(query(collection(db, "ma_models"), where("isVisible", "==", true)));
        p.catch(() => { if (modelsSnap === p) modelsSnap = null; });
        modelsSnap = p;
    }
    if (!dossierSnap) {
        dossierSnap = getDocs(query(collection(db, "ma_dossiers"), where("isVisible", "==", true))).catch(() => null);
    }
}

export function getArchivePromises() {
    prefetchArchive();
    return {
        modelsSnap: modelsSnap ?? Promise.reject(new Error("Not signed in")),
        dossierSnap: dossierSnap ?? Promise.resolve(null),
    };
}
