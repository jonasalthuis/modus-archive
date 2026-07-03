"use client";

import React, { useState } from "react";
import { nanoid } from "nanoid";
import { Plus, Trash2, GripVertical, X } from "lucide-react";
import Image from "next/image";
import type { ImageGroup, ImageGroupMode, ModelImage, StripOrientation } from "@/types/model";
import { PoolPickerModal } from "./PoolPickerModal";

const MODE_META: Record<"strip" | "cluster" | "lightbox", { label: string; hint: string }> = {
    strip: {
        label: "Strip — side by side",
        hint: "Images laid out in a row (or column). Use the orientation toggle to choose direction.",
    },
    cluster: {
        label: "Cluster — loose grouping",
        hint: "Images displayed in an unordered, irregular grouping — similar to the explore canvas layout.",
    },
    lightbox: {
        label: "Lightbox — click-through",
        hint: "Images shown inside one frame. Click to cycle through; the viewer can browse at their own pace.",
    },
};

const NEW_MODES = ["strip", "cluster", "lightbox"] as const;

interface Props {
    groups: ImageGroup[];
    poolImages: ModelImage[];
    onChange: (groups: ImageGroup[]) => void;
}

export function ImageGroupsEditor({ groups, poolImages, onChange }: Props) {
    const [openPicker, setOpenPicker] = useState<string | null>(null);

    const addGroup = () => {
        const group: ImageGroup = { id: nanoid(8), mode: "strip", images: [] };
        onChange([...groups, group]);
    };

    const updateGroup = (id: string, patch: Partial<ImageGroup>) => {
        onChange(groups.map((g) => (g.id === id ? { ...g, ...patch } : g)));
    };

    const removeGroup = (id: string) => {
        if (!confirm("Remove this image group?")) return;
        onChange(groups.filter((g) => g.id !== id));
        if (openPicker === id) setOpenPicker(null);
    };

    const toggleImage = (groupId: string, url: string) => {
        const group = groups.find((g) => g.id === groupId);
        if (!group) return;
        const existing = group.images.find((i) => i.url === url);
        const next = existing
            ? group.images.filter((i) => i.url !== url)
            : [...group.images, poolImages.find((p) => p.url === url)!];
        updateGroup(groupId, { images: next.filter(Boolean) });
    };

    const removeImage = (groupId: string, url: string) => {
        const group = groups.find((g) => g.id === groupId);
        if (!group) return;
        updateGroup(groupId, { images: group.images.filter((i) => i.url !== url) });
    };

    const activeGroup = openPicker ? groups.find((g) => g.id === openPicker) : null;

    return (
        <div className="space-y-4">
            {/* Modal — rendered at top level so it overlays everything */}
            {openPicker && activeGroup && (
                <PoolPickerModal
                    pool={poolImages}
                    selected={activeGroup.images.map((i) => i.url)}
                    multiSelect
                    title={`Select images — Group ${groups.findIndex((g) => g.id === openPicker) + 1}`}
                    onToggle={(url) => toggleImage(openPicker, url)}
                    onClose={() => setOpenPicker(null)}
                />
            )}

            {groups.length === 0 && (
                <p className="text-stone-400 text-[10px] uppercase tracking-widest text-center py-3">
                    No image groups yet — add one below
                </p>
            )}

            {groups.map((group, i) => {
                const mode = (NEW_MODES.includes(group.mode as typeof NEW_MODES[number]) ? group.mode : "strip") as typeof NEW_MODES[number];
                const meta = MODE_META[mode];
                const pickerOpen = openPicker === group.id;

                return (
                    <div key={group.id} className="border border-stone-200 rounded-lg overflow-hidden">
                        {/* Group header */}
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-stone-100 bg-stone-50">
                            <GripVertical size={13} className="text-stone-400 flex-shrink-0" />
                            <span className="text-[9px] uppercase tracking-[0.4em] font-bold text-stone-500 flex-shrink-0">
                                Group {i + 1}
                            </span>
                            <select
                                value={mode}
                                onChange={(e) => updateGroup(group.id, { mode: e.target.value as ImageGroupMode })}
                                className="flex-1 text-[10px] border border-stone-200 rounded-md bg-white px-2 py-1.5 font-mono focus:outline-none focus:border-stone-900 text-stone-700"
                            >
                                {NEW_MODES.map((m) => (
                                    <option key={m} value={m}>{MODE_META[m].label}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => removeGroup(group.id)}
                                className="text-stone-400 hover:text-red-500 transition-colors flex-shrink-0 p-1"
                                title="Remove group"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>

                        <div className="p-4 space-y-3">
                            {/* Mode hint */}
                            <p className="text-[10px] text-stone-500">{meta.hint}</p>

                            {/* Orientation toggle — strip only */}
                            {mode === "strip" && (
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-stone-500">Layout</span>
                                    {(["horizontal", "vertical"] as StripOrientation[]).map((o) => {
                                        const active = (group.orientation ?? "horizontal") === o;
                                        return (
                                            <button
                                                key={o}
                                                type="button"
                                                onClick={() => updateGroup(group.id, { orientation: o })}
                                                className={`text-[9px] uppercase tracking-[0.2em] font-bold px-2.5 py-1 border rounded-md transition-colors ${active ? "bg-stone-900 text-white border-stone-900" : "border-stone-300 text-stone-600 hover:border-stone-900"}`}
                                            >
                                                {o === "horizontal" ? "Side by side" : "Above / below"}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Selected images preview */}
                            {group.images.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {group.images.map((img) => (
                                        <div key={img.url} className="relative w-16 h-12 rounded-md overflow-hidden group/img">
                                            <Image src={img.url} alt={img.caption || ""} fill className="object-cover" sizes="64px" unoptimized />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(group.id, img.url)}
                                                className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/img:bg-black/40 transition-colors"
                                            >
                                                <X size={14} className="text-white opacity-0 group-hover/img:opacity-100 transition-opacity" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Open pool picker */}
                            <button
                                type="button"
                                onClick={() => setOpenPicker(group.id)}
                                className="text-[9px] uppercase tracking-[0.3em] font-bold px-3 py-2 border border-stone-300 rounded-md text-stone-500 hover:border-stone-900 hover:text-stone-900 transition-colors"
                            >
                                {group.images.length === 0 ? "Select images from pool" : `Edit selection (${group.images.length})`}
                            </button>
                        </div>
                    </div>
                );
            })}

            <button
                type="button"
                onClick={addGroup}
                className="flex items-center gap-2 border border-dashed border-stone-300 hover:border-stone-900 text-stone-500 hover:text-stone-900 transition-colors px-4 py-3 text-[10px] uppercase tracking-widest font-bold w-full justify-center rounded-lg"
            >
                <Plus size={13} />
                Add image group
            </button>
        </div>
    );
}
