"use client";

import React, { useState, useEffect } from 'react';
import { doc, setDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { X, Save } from 'lucide-react';
import { ImageGalleryEditor, type ModelImage } from './ImageGalleryEditor';
import { AudioUploader } from './AudioUploader';

interface SchemaProperty {
    name: string;
    dataType: string;
    validation?: { required?: boolean; email?: boolean };
    config?: { enumValues?: string[] };
    defaultValue?: unknown;
    multiline?: boolean;
    markdown?: boolean;
    of?: { dataType: string };
}

interface Schema {
    name: string;
    path: string;
    properties: Record<string, SchemaProperty>;
}

export const GenericEditor = ({
    schema,
    existingDoc,
    onCancel,
    onSave,
    hideHeader = false,
}: {
    schema: Schema;
    existingDoc?: Record<string, unknown>;
    onCancel: () => void;
    onSave: () => void;
    hideHeader?: boolean;
}) => {
    const [formData, setFormData] = useState<Record<string, unknown>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (existingDoc) {
            setFormData({ ...existingDoc });
        } else {
            const defaults: Record<string, unknown> = {};
            Object.entries(schema.properties).forEach(([key, prop]) => {
                if (prop.defaultValue !== undefined) defaults[key] = prop.defaultValue;
                if (prop.dataType === 'boolean' && prop.defaultValue === undefined) defaults[key] = false;
                if (prop.dataType === 'imageGallery') defaults[key] = [];
            });
            setFormData(defaults);
        }
    }, [existingDoc, schema]);

    const handleChange = (key: string, value: unknown) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (existingDoc) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { id, ...data } = formData;
                await updateDoc(doc(db, schema.path, existingDoc.id as string), data);
            } else {
                if (formData.modelNumber && typeof formData.modelNumber === 'string') {
                    await setDoc(doc(db, schema.path, formData.modelNumber), formData);
                } else if (formData.slug && typeof formData.slug === 'string') {
                    await setDoc(doc(db, schema.path, formData.slug), formData);
                } else {
                    await addDoc(collection(db, schema.path), formData);
                }
            }
            onSave();
        } catch (error) {
            console.error("Save failed", error);
            alert("Failed to save record.");
        }
        setSaving(false);
    };

    // The model ID for Storage path — use existing doc ID, or the entered modelNumber
    const modelId = (existingDoc?.id as string) ||
        (formData.modelNumber as string) || '';

    return (
        <div className="bg-white p-8">
            {!hideHeader && (
                <div className="flex justify-between items-center mb-8 border-b border-stone-200 pb-4">
                    <div>
                        <h3 className="text-xl font-light uppercase tracking-widest">
                            {existingDoc ? `Edit: ${existingDoc.title as string || existingDoc.id as string}` : `New ${schema.name}`}
                        </h3>
                        {existingDoc && (
                            <span className="text-[10px] font-mono text-stone-400">ID: {existingDoc.id as string}</span>
                        )}
                    </div>
                    <button
                        onClick={onCancel}
                        className="bg-white border border-stone-300 p-2 hover:bg-stone-100 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
                {Object.entries(schema.properties).map(([key, prop]) => (
                    <div
                        key={key}
                        className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-stone-100 pb-6 last:border-0"
                    >
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold uppercase tracking-widest mb-1 text-stone-500">
                                {prop.name}
                                {prop.validation?.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            <span className="text-[10px] font-mono text-stone-300">{prop.dataType}</span>
                        </div>

                        <div className="md:col-span-2">
                            {/* Boolean toggle */}
                            {prop.dataType === 'boolean' && (
                                <div className="flex items-center space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => handleChange(key, !formData[key])}
                                        className={`w-12 h-6 flex items-center p-1 border transition-colors ${
                                            formData[key]
                                                ? 'bg-stone-900 border-stone-900 justify-end'
                                                : 'bg-white border-stone-300 justify-start'
                                        }`}
                                    >
                                        <div className={`w-4 h-4 ${formData[key] ? 'bg-white' : 'bg-stone-400'}`} />
                                    </button>
                                    <span className="text-xs uppercase font-bold">
                                        {formData[key] ? 'Yes' : 'No'}
                                    </span>
                                </div>
                            )}

                            {/* Multiline / markdown */}
                            {prop.dataType === 'string' && (prop.multiline || prop.markdown) && (
                                <textarea
                                    value={(formData[key] as string) || ''}
                                    onChange={(e) => handleChange(key, e.target.value)}
                                    rows={6}
                                    className="w-full bg-white border border-stone-200 p-3 font-mono text-sm focus:outline-none focus:border-black transition-colors"
                                    placeholder={`${prop.name}...`}
                                />
                            )}

                            {/* Enum select */}
                            {prop.config?.enumValues && (
                                <select
                                    value={(formData[key] as string) || ''}
                                    onChange={(e) => handleChange(key, e.target.value)}
                                    className="w-full bg-white border border-stone-200 p-3 font-mono text-sm focus:outline-none focus:border-black"
                                >
                                    <option value="">— select —</option>
                                    {prop.config.enumValues.map((val) => (
                                        <option key={val} value={val}>{val}</option>
                                    ))}
                                </select>
                            )}

                            {/* String array (comma separated) */}
                            {prop.dataType === 'array' && (
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        placeholder="Comma separated (e.g. Wood, Steel)"
                                        value={
                                            Array.isArray(formData[key])
                                                ? (formData[key] as string[]).join(', ')
                                                : ((formData[key] as string) || '')
                                        }
                                        onChange={(e) =>
                                            handleChange(
                                                key,
                                                e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                                            )
                                        }
                                        className="w-full bg-white border border-stone-200 p-3 font-mono text-sm focus:outline-none focus:border-black"
                                    />
                                    <div className="flex flex-wrap gap-1">
                                        {Array.isArray(formData[key]) &&
                                            (formData[key] as string[]).map((item, i) => (
                                                <span
                                                    key={i}
                                                    className="bg-stone-100 text-[10px] px-2 py-1 font-mono uppercase"
                                                >
                                                    {item}
                                                </span>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {/* Image gallery */}
                            {prop.dataType === 'imageGallery' && (
                                <ImageGalleryEditor
                                    modelId={modelId}
                                    images={(formData[key] as ModelImage[]) || []}
                                    onChange={(imgs) => handleChange(key, imgs)}
                                />
                            )}

                            {/* Audio upload */}
                            {prop.dataType === 'audioUpload' && (
                                <AudioUploader
                                    modelId={modelId}
                                    url={(formData[key] as string) || null}
                                    onChange={(url) => handleChange(key, url ?? '')}
                                />
                            )}

                            {/* Plain string / number — catch-all (exclude handled types) */}
                            {prop.dataType !== 'boolean' &&
                                prop.dataType !== 'array' &&
                                prop.dataType !== 'imageGallery' &&
                                prop.dataType !== 'audioUpload' &&
                                !prop.config?.enumValues &&
                                !(prop.dataType === 'string' && (prop.multiline || prop.markdown)) && (
                                    <input
                                        type={prop.dataType === 'number' ? 'number' : 'text'}
                                        required={prop.validation?.required}
                                        value={(formData[key] as string | number) || ''}
                                        onChange={(e) =>
                                            handleChange(
                                                key,
                                                prop.dataType === 'number' ? Number(e.target.value) : e.target.value
                                            )
                                        }
                                        className="w-full bg-white border border-stone-200 p-3 font-mono text-sm focus:outline-none focus:border-black transition-colors"
                                    />
                                )}
                        </div>
                    </div>
                ))}

                <div className="pt-8 border-t border-black flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-6 py-3 uppercase text-xs font-bold tracking-widest text-stone-400 hover:text-red-500 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-black text-white px-8 py-3 uppercase text-xs font-bold tracking-widest hover:bg-stone-800 flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : <><Save size={14} /> Save</>}
                    </button>
                </div>
            </form>
        </div>
    );
};
