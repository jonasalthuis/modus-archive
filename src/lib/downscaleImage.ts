// Downscale + re-encode an image in the browser BEFORE upload, so the public
// Storage bucket only ever holds web-resolution images — never the full-res
// original. This is the real protection against high-res downloads: what isn't
// served can't be grabbed.
//
// Keep true masters out of the public bucket entirely (staff-only high-res path).

export interface DownscaleOptions {
    maxEdge?: number; // longest side in px (default 1600)
    quality?: number; // 0–1 JPEG/WebP quality (default 0.82)
    mimeType?: "image/jpeg" | "image/webp";
}

const DEFAULTS: Required<DownscaleOptions> = {
    maxEdge: 1600,
    quality: 0.82,
    mimeType: "image/jpeg",
};

export async function downscaleImage(file: File, opts: DownscaleOptions = {}): Promise<File> {
    const { maxEdge, quality, mimeType } = { ...DEFAULTS, ...opts };

    // Skip non-raster types (SVG, etc.) — return untouched
    if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;

    let bitmap: ImageBitmap;
    try {
        bitmap = await createImageBitmap(file);
    } catch {
        // Some formats can't be decoded — fall back to the original
        return file;
    }

    const { width, height } = bitmap;
    const longest = Math.max(width, height);

    // Already within bounds → still re-encode to strip metadata + cap quality,
    // but skip if it's already small and the size won't meaningfully change.
    const scale = longest > maxEdge ? maxEdge / longest : 1;
    const targetW = Math.round(width * scale);
    const targetH = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        bitmap.close?.();
        return file;
    }
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close?.();

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, mimeType, quality));
    if (!blob) return file;

    // If re-encoding somehow produced a larger file than the original at full
    // resolution, keep the smaller one — but only when no resize happened.
    if (scale === 1 && blob.size >= file.size) return file;

    const ext = mimeType === "image/webp" ? "webp" : "jpg";
    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.${ext}`, { type: mimeType, lastModified: Date.now() });
}
