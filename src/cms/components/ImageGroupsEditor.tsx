"use client";

import React from "react";
import { nanoid } from "nanoid";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { ImageGalleryEditor } from "./ImageGalleryEditor";
import type { ImageGroup, ImageGroupMode, ModelImage, StripOrientation } from "@/types/model";

const MODE_LABELS: Record<ImageGroupMode, string> = {
    single: "Single photo",
    gallery: "Gallery (click-through lightbox)",
    strip: "Side by side (2–3 images)",
};

const MODE_HINTS: Record<ImageGroupMode, string> = {
    single: "Displays as one standalone photo card.",
    gallery: "One card; click it to open a full-screen click-through lightbox. Add as many images as you like.",
    strip: "Two or three images shown together — choose row (next to) or column (above/below).",
};

interface Props {
    modelId: string;
    groups: ImageGroup[];
    onChange: (groups: ImageGroup[]) => void;
}

export function ImageGroupsEditor({ modelId, groups, onChange }: Props) {
    const addGroup = () => {
        const group: ImageGroup = { id: nanoid(8), mode: "single", images: [] };
        onChange([...groups, group]);
    };

    const updateGroup = (id: string, patch: Partial<ImageGroup>) => {
        onChange(groups.map((g) => (g.id === id ? { ...g, ...patch } : g)));
    };

    const removeGroup = (id: string) => {
        if (!confirm("Remove this image group?")) return;
        onChange(groups.filter((g) => g.id !== id));
    };

    return (
        <div className="space-y-4">
            {groups.length === 0 && (
                <p className="text-stone-300 text-[10px] uppercase tracking-widest text-center py-3">
                    No image groups yet — add one below
                </p>
            )}

            {groups.map((group, i) => (
                <div key={group.id} className="border border-stone-300 bg-stone-50">
                    {/* Group header */}
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-stone-200 bg-white">
                        <GripVertical size={13} className="text-stone-300 flex-shrink-0" />
                        <span className="text-[9px] uppercase tracking-[0.4em] font-bold text-stone-400 flex-shrink-0">
                            Group {i + 1}
                        </span>
                        <select
                            value={group.mode}
                            onChange={(e) => updateGroup(group.id, { mode: e.target.value as ImageGroupMode })}
                            className="flex-1 text-[10px] border border-stone-300 bg-white px-2 py-1.5 font-mono focus:outline-none focus:border-stone-900"
                        >
                            {(Object.keys(MODE_LABELS) as ImageGroupMode[]).map((mode) => (
                                <option key={mode} value={mode}>
                                    {MODE_LABELS[mode]}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={() => removeGroup(group.id)}
                            className="text-stone-300 hover:text-red-500 transition-colors flex-shrink-0 p-1"
                            title="Remove group"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>

                    {/* Mode hint */}
                    <p className="text-[9px] text-stone-400 px-4 pt-3 pb-0">{MODE_HINTS[group.mode]}</p>

                    {/* Orientation toggle — strip only */}
                    {group.mode === "strip" && (
                        <div className="flex items-center gap-2 px-4 pt-3">
                            <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-stone-400">
                                Layout
                            </span>
                            {(["horizontal", "vertical"] as StripOrientation[]).map((o) => {
                                const active = (group.orientation ?? "horizontal") === o;
                                return (
                                    <button
                                        key={o}
                                        type="button"
                                        onClick={() => updateGroup(group.id, { orientation: o })}
                                        className={`text-[9px] uppercase tracking-[0.2em] font-bold px-2.5 py-1 border transition-colors ${
                                            active
                                                ? "bg-stone-900 text-white border-stone-900"
                                                : "border-stone-300 text-stone-500 hover:border-stone-900"
                                        }`}
                                    >
                                        {o === "horizontal" ? "Next to" : "Above / below"}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Image uploader */}
                    <div className="p-4">
                        <ImageGalleryEditor
                            modelId={modelId}
                            images={group.images}
                            onChange={(imgs: ModelImage[]) => updateGroup(group.id, { images: imgs })}
                        />
                    </div>
                </div>
            ))}

            <button
                type="button"
                onClick={addGroup}
                className="flex items-center gap-2 border border-dashed border-stone-300 hover:border-stone-900 text-stone-400 hover:text-stone-900 transition-colors px-4 py-3 text-[10px] uppercase tracking-widest font-bold w-full justify-center"
            >
                <Plus size={13} />
                Add image group
            </button>
        </div>
    );
}
