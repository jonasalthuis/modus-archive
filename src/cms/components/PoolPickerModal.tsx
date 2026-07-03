"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { X, Check } from "lucide-react";
import type { ModelImage } from "@/types/model";

interface Props {
    pool: ModelImage[];
    selected: string[];
    multiSelect?: boolean;
    title?: string;
    onToggle: (url: string) => void;
    onClose: () => void;
}

export function PoolPickerModal({ pool, selected, multiSelect = true, title = "Select from pool", onToggle, onClose }: Props) {
    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white rounded-xl shadow-[0_24px_80px_rgba(0,0,0,0.25)] w-full max-w-4xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 flex-shrink-0">
                    <div>
                        <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-500">{title}</p>
                        {multiSelect && selected.length > 0 && (
                            <p className="text-[11px] text-stone-400 mt-0.5">{selected.length} selected</p>
                        )}
                    </div>
                    <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-md text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors">
                        <X size={15} />
                    </button>
                </div>

                {/* Grid */}
                <div className="overflow-y-auto flex-1 p-4">
                    {pool.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-stone-400">
                                No images in pool
                            </p>
                            <p className="text-[11px] text-stone-400">Upload images in the Images section first</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                            {pool.map((img) => {
                                const isSelected = selected.includes(img.url);
                                return (
                                    <button
                                        key={img.url}
                                        type="button"
                                        onClick={() => {
                                            onToggle(img.url);
                                            if (!multiSelect) onClose();
                                        }}
                                        className={`group relative aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all duration-150 ${
                                            isSelected
                                                ? "border-stone-900 ring-2 ring-stone-900 ring-offset-2"
                                                : "border-transparent hover:border-stone-400"
                                        }`}
                                    >
                                        <Image
                                            src={img.url}
                                            alt={img.caption || ""}
                                            fill
                                            className="object-cover"
                                            sizes="200px"
                                            unoptimized
                                        />
                                        {/* Hover / selected overlay */}
                                        <div className={`absolute inset-0 transition-colors duration-150 ${isSelected ? "bg-stone-900/25" : "bg-black/0 group-hover:bg-black/10"}`} />
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-stone-900 flex items-center justify-center shadow-sm">
                                                <Check size={12} className="text-white" />
                                            </div>
                                        )}
                                        {img.caption && (
                                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <p className="text-[9px] text-white truncate">{img.caption}</p>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {multiSelect && (
                    <div className="px-6 py-4 border-t border-stone-100 flex items-center justify-between flex-shrink-0 bg-stone-50">
                        <span className="text-[10px] text-stone-500">
                            {selected.length === 0 ? "Click images to select" : `${selected.length} image${selected.length !== 1 ? "s" : ""} selected`}
                        </span>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2 bg-stone-900 text-white text-[9px] uppercase tracking-[0.3em] font-bold rounded-md hover:bg-stone-700 transition-colors"
                        >
                            Done
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
