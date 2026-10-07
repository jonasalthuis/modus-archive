// Route Firebase Storage images through the Next.js image optimizer so the
// browser downloads a small, resized WebP instead of the multi-MB original.
// Widths must be in Next's default `imageSizes` / `deviceSizes` lists.
export function optimizedImageUrl(url: string, width = 384, quality = 70): string {
    if (!url.startsWith("https://firebasestorage.googleapis.com/")) return url;
    return `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=${quality}`;
}
