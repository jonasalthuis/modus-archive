import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage, ensureFreshAuthToken } from "@/lib/firebase";
import { downscaleImage } from "@/lib/downscaleImage";

// Upload one image file for a model and return its download URL.
// Stored under models/images/{modelId}/ to keep everything keyed by model number.
// The image is downscaled to web resolution first — the public bucket never holds
// the full-res original.
export async function uploadModelImage(modelId: string, file: File): Promise<string> {
    await ensureFreshAuthToken();
    const web = await downscaleImage(file);
    const filename = `${Date.now()}-${web.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const storageRef = ref(storage, `models/images/${modelId}/${filename}`);
    await uploadBytes(storageRef, web);
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
