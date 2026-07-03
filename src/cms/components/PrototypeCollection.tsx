"use client";

import React, { useState, useEffect, useCallback } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { GenericEditor } from "./GenericEditor";
import { Edit, Eye, EyeOff, Image as ImageIcon } from "lucide-react";

interface ModelDoc {
    id: string;
    modelNumber?: string;
    title?: string;
    architect?: string;
    year?: number;
    isVisible?: boolean;
    inPrototype?: boolean;
    images?: unknown[];
    [key: string]: unknown;
}

interface Schema {
    name: string;
    path: string;
    properties: Record<
        string,
        {
            name: string;
            dataType: string;
            validation?: { required?: boolean };
            config?: { enumValues?: string[] };
            defaultValue?: unknown;
            multiline?: boolean;
            markdown?: boolean;
            of?: { dataType: string };
        }
    >;
}

export const PrototypeCollection = ({ schema }: { schema: Schema }) => {
    const [models, setModels] = useState<ModelDoc[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingDoc, setEditingDoc] = useState<ModelDoc | null>(null);
    const [search, setSearch] = useState("");

    const fetchModels = useCallback(async () => {
        setLoading(true);
        try {
            const snapshot = await getDocs(collection(db, "ma_models"));
            const all = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ModelDoc);
            const prototype = all
                .filter((m) => m.inPrototype === true)
                .sort((a, b) => (a.modelNumber || "").localeCompare(b.modelNumber || ""));
            setModels(prototype);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchModels();
    }, [fetchModels]);

    const toggleVisibility = async (model: ModelDoc) => {
        const next = !model.isVisible;
        await updateDoc(doc(db, "ma_models", model.id), { isVisible: next });
        setModels((prev) => prev.map((m) => (m.id === model.id ? { ...m, isVisible: next } : m)));
    };

    const handleSave = () => {
        setEditingDoc(null);
        fetchModels();
    };

    if (editingDoc) {
        return (
            <GenericEditor
                schema={schema}
                existingDoc={editingDoc as Record<string, unknown>}
                onCancel={() => setEditingDoc(null)}
                onSave={handleSave}
            />
        );
    }

    const filtered = models.filter((m) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            (m.modelNumber || "").includes(q) ||
            (m.title || "").toLowerCase().includes(q) ||
            (m.architect || "").toLowerCase().includes(q)
        );
    });

    const visible = models.filter((m) => m.isVisible).length;
    const withImages = models.filter((m) => Array.isArray(m.images) && m.images.length > 0).length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-start pb-6 border-b border-black">
                <div>
                    <h2 className="text-2xl font-light uppercase tracking-widest">Prototype</h2>
                    <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-gray-500 mt-1">
                        {models.length} models selected · {visible} visible · {withImages} with images
                    </p>
                </div>
                <input
                    type="text"
                    placeholder="Search…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-white border border-gray-400 focus:border-black px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-bold outline-none transition-colors w-48"
                />
            </div>

            {loading ? (
                <div className="text-gray-500 italic py-12 text-center">Loading prototype models…</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-black text-[9px] uppercase tracking-widest text-gray-600">
                                <th className="py-3 px-3 font-bold w-16">Ref #</th>
                                <th className="py-3 px-3 font-bold">Title</th>
                                <th className="py-3 px-3 font-bold">Architect</th>
                                <th className="py-3 px-3 font-bold w-16">Year</th>
                                <th className="py-3 px-3 font-bold text-center w-20">Images</th>
                                <th className="py-3 px-3 font-bold text-center w-20">Visible</th>
                                <th className="py-3 px-3 text-right w-16">Edit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((m) => {
                                const imgCount = Array.isArray(m.images) ? m.images.length : 0;
                                return (
                                    <tr
                                        key={m.id}
                                        className="border-b border-gray-400 hover:bg-gray-100 transition-colors"
                                    >
                                        <td className="py-3 px-3 font-mono text-[11px] text-gray-600">
                                            {m.modelNumber || m.id}
                                        </td>
                                        <td className="py-3 px-3 text-sm font-light">{m.title || "—"}</td>
                                        <td className="py-3 px-3 text-[11px] text-gray-600">{m.architect || "—"}</td>
                                        <td className="py-3 px-3 font-mono text-[11px] text-gray-500">
                                            {m.year || "—"}
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            <span
                                                className={`inline-flex items-center gap-1 text-[10px] font-mono ${
                                                    imgCount > 0 ? "text-gray-900" : "text-gray-300"
                                                }`}
                                            >
                                                <ImageIcon size={10} />
                                                {imgCount}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            <button
                                                type="button"
                                                onClick={() => toggleVisibility(m)}
                                                title={
                                                    m.isVisible
                                                        ? "Published — click to hide"
                                                        : "Hidden — click to publish"
                                                }
                                                className={`transition-colors ${
                                                    m.isVisible
                                                        ? "text-gray-900 hover:text-gray-500"
                                                        : "text-gray-300 hover:text-gray-600"
                                                }`}
                                            >
                                                {m.isVisible ? <Eye size={15} /> : <EyeOff size={15} />}
                                            </button>
                                        </td>
                                        <td className="py-3 px-3 text-right">
                                            <button
                                                onClick={() => setEditingDoc(m)}
                                                className="p-1 text-gray-500 hover:text-gray-900 transition-colors"
                                            >
                                                <Edit size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {filtered.length === 0 && (
                        <div className="py-12 text-center text-gray-400 text-[10px] uppercase tracking-widest">
                            No models match &ldquo;{search}&rdquo;
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
