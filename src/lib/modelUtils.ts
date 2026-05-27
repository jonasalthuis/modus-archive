/**
 * Returns null for empty strings and "x" / "X" placeholders
 * left over from the Google Sheets sync.
 */
export function clean(value: string | null | undefined): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (trimmed === '' || trimmed.toLowerCase() === 'x') return null;
    return trimmed;
}

/**
 * Extracts the starred/hero image URL from a model's images array.
 * Falls back to the first image if none is starred.
 */
export function getHeroImage(
    images: { url: string; isStarred?: boolean }[] | null | undefined
): string | null {
    if (!images || images.length === 0) return null;
    return (images.find((img) => img.isStarred) ?? images[0]).url;
}
