"use client";

import React, { useRef, useState } from "react";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { Star, Trash2, Upload } from "lucide-react";
import Image from "next/image";

export interface ModelImage {
    url: string;
    importance: 1 | 2 | 3;
    isStarred: boolean;
    caption?: string;
}

interface Props {
    modelId: string; // used as storage path: models/images/{modelId}/
    images: ModelImage[];
    onChange: (images: ModelImage[]) => void;
}

export function ImageGalleryEditor({ modelId, images, onChange }: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        if (!modelId) {
            setError("Save the model number first before uploading images.");
            return;
        }

        setUploading(true);
        setError(null);

        const newImages: ModelImage[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
            const storageRef = ref(storage, `models/images/${modelId}/${filename}`);
            const uploadTask = uploadBytesResumable(storageRef, file);

            await new Promise<void>((resolve, reject) => {
                uploadTask.on(
                    "state_changed",
                    (snapshot) => {
                        const progress = Math.round(
                            ((i + snapshot.bytesTransferred / snapshot.totalBytes) / files.length) * 100
                        );
                        setUploadProgress(progress);
                    },
                    (err) => {
                        setError(`Upload failed: ${err.message}`);
                        reject(err);
                    },
                    async () => {
                        const url = await getDownloadURL(uploadTask.snapshot.ref);
                        newImages.push({
                            url,
                            importance: 2,
                            isStarred: images.length === 0 && newImages.length === 0,
                        });
                        resolve();
                    }
                );
            });
        }

        onChange([...images, ...newImages]);
        setUploading(false);
        setUploadProgress(0);
        // Reset input so same file can be re-selected
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    function setImportance(index: number, importance: 1 | 2 | 3) {
        const updated = images.map((img, i) =>
            i === index ? { ...img, importance } : img
        );
        onChange(updated);
    }

    function setStar(index: number) {
        const updated = images.map((img, i) => ({
            ...img,
            isStarred: i === index,
        }));
        onChange(updated);
    }

    async function removeImage(index: number) {
        if (!confirm("Remove this image?")) return;
        const img = images[index];

        // Try to delete from Storage (best-effort — may fail if path moved)
        try {
            const url = new URL(img.url);
            const pathEncoded = url.pathname.split("/o/")[1]?.split("?")[0];
            if (pathEncoded) {
                const path = decodeURIComponent(pathEncoded);
                await deleteObject(ref(storage, path));
            }
        } catch {
            // Non-fatal — URL may not be a direct storage path
        }

        const updated = images.filter((_, i) => i !== index);
        // If we removed the starred one, star the first remaining
        if (img.isStarred && updated.length > 0) {
            updated[0] = { ...updated[0], isStarred: true };
        }
        onChange(updated);
    }

    function updateCaption(index: number, caption: string) {
        const updated = images.map((img, i) =>
            i === index ? { ...img, caption } : img
        );
        onChange(updated);
    }

    return (
        <div className="space-y-4">
            {/* Existing images */}
            {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {images.map((img, i) => (
                        <div
                            key={img.url}
                            className={`relative border group ${img.isStarred ? "border-stone-900" : "border-stone-200"}`}
                        >
                            {/* Thumbnail */}
                            <div className="aspect-[4/3] relative overflow-hidden bg-stone-100">
                                <Image
                                    src={img.url}
                                    alt={img.caption || `Image ${i + 1}`}
                                    fill
                                    className="object-cover"
                                    sizes="200px"
                                    unoptimized
                                />
                            </div>

                            {/* Controls overlay */}
                            <div className="p-2 bg-white space-y-2">
                                {/* Importance */}
                                <div className="flex items-center gap-1">
                                    <span className="text-[9px] uppercase tracking-widest text-stone-400 mr-1">Imp.</span>
                                    {([1, 2, 3] as const).map((level) => (
                                        <button
                                            key={level}
                                            type="button"
                                            onClick={() => setImportance(i, level)}
                                            className={`w-6 h-6 text-[10px] font-bold border transition-colors ${
                                                img.importance === level
                                                    ? "bg-stone-900 text-white border-stone-900"
                                                    : "text-stone-400 border-stone-200 hover:border-stone-900"
                                            }`}
                                        >
                                            {level}
                                        </button>
                                    ))}
                                </div>

                                {/* Caption */}
                                <input
                                    type="text"
                                    placeholder="Caption..."
                                    value={img.caption || ""}
                                    onChange={(e) => updateCaption(i, e.target.value)}
                                    className="w-full text-[10px] px-2 py-1 border border-stone-100 focus:border-stone-900 outline-none font-mono"
                                />

                                {/* Star + Delete */}
                                <div className="flex justify-between">
                                    <button
                                        type="button"
                                        onClick={() => setStar(i)}
                                        title="Set as hero photo"
                                        className={`flex items-center gap-1 text-[9px] uppercase tracking-widest font-bold transition-colors ${
                                            img.isStarred ? "text-stone-900" : "text-stone-300 hover:text-stone-900"
                                        }`}
                                    >
                                        <Star size={11} fill={img.isStarred ? "currentColor" : "none"} />
                                        {img.isStarred ? "Hero" : "Set hero"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeImage(i)}
                                        className="text-stone-300 hover:text-red-500 transition-colors"
                                        title="Remove image"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>

                            {/* Starred indicator */}
                            {img.isStarred && (
                                <div className="absolute top-2 left-2 bg-stone-900 text-white text-[8px] uppercase tracking-widest px-1.5 py-0.5 font-bold">
                                    Hero
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Upload button */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
            />

            {uploading ? (
                <div className="border border-stone-200 p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 bg-stone-900 animate-pulse" />
                        <span className="text-[10px] uppercase tracking-widest font-bold text-stone-500">
                            Uploading... {uploadProgress}%
                        </span>
                    </div>
                    <div className="w-full bg-stone-100 h-px">
                        <div
                            className="bg-stone-900 h-px transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                        />
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => {
                        if (!modelId) {
                            setError("Enter a model number first before uploading images.");
                            return;
                        }
                        fileInputRef.current?.click();
                    }}
                    className="flex items-center gap-2 border border-dashed border-stone-300 hover:border-stone-900 text-stone-400 hover:text-stone-900 transition-colors px-4 py-3 text-[10px] uppercase tracking-widest font-bold w-full justify-center"
                >
                    <Upload size={13} />
                    Add Images
                </button>
            )}

            {error && (
                <p className="text-red-500 text-[10px] uppercase tracking-widest font-bold">{error}</p>
            )}

            {images.length === 0 && !uploading && (
                <p className="text-stone-300 text-[10px] uppercase tracking-widest text-center py-2">
                    No images yet — upload to link photos to this model
                </p>
            )}
        </div>
    );
}
