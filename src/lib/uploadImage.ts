import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "@/lib/firebase";

// Upload one image file for a model and return its download URL.
// Stored under models/images/{modelId}/ to keep everything keyed by model number.
export async function uploadModelImage(modelId: string, file: File): Promise<string> {
    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const storageRef = ref(storage, `models/images/${modelId}/${filename}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
}

// Best-effort delete of a Storage object given its download URL.
export async function deleteImageByUrl(url: string): Promise<void> {
    try {
        const u = new URL(url);
        const encoded = u.pathname.split("/o/")[1]?.split("?")[0];
        if (encoded) await deleteObject(ref(storage, decodeURIComponent(encoded)));
    } catch {
        /* non-fatal — URL may not map to a storage path */
    }
}
