"use client";

import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc, updateDoc, addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { X, Save, AlertTriangle } from "lucide-react";
import { ImageGalleryEditor, type ModelImage } from "./ImageGalleryEditor";
import { ImageGroupsEditor } from "./ImageGroupsEditor";
import { FeaturedImagesEditor } from "./FeaturedImagesEditor";
import { AudioUploader } from "./AudioUploader";
import type { ImageGroup, FeaturedImages } from "@/types/model";

// Turn a title into a URL-safe, hyphen-separated slug
export const slugify = (s: string) =>
    s
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

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
    /** Which field becomes the Firestore document ID (e.g. "modelNumber", "slug", "email") */
    idField?: string;
    properties: Record<string, SchemaProperty>;
}

// ── Save confirmation modal ────────────────────────────────────────────────────

const SaveConfirmModal = ({
    recordTitle,
    onConfirm,
    onCancel,
    saving,
}: {
    recordTitle: string;
    onConfirm: () => void;
    onCancel: () => void;
    saving: boolean;
}) => (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
        <div className="relative bg-white border border-stone-300 shadow-2xl p-8 max-w-sm w-full space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Save size={14} className="text-stone-400 flex-shrink-0" />
                    <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-500">Confirm save</p>
                </div>
                <h3 className="text-lg font-light leading-snug">
                    Save changes to <span className="font-medium">"{recordTitle}"</span>?
                </h3>
                <p className="text-[12px] text-stone-500 leading-relaxed">
                    Please confirm the information is accurate before writing to the database. This will overwrite the
                    existing record.
                </p>
            </div>
            <div className="flex gap-3 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={saving}
                    className="flex-1 py-3 border border-stone-300 text-[10px] uppercase tracking-[0.25em] font-bold text-stone-500 hover:border-stone-900 hover:text-stone-900 transition-colors disabled:opacity-40"
                >
                    Go back
                </button>
                <button
                    type="button"
                    onClick={onConfirm}
                    disabled={saving}
                    className="flex-1 py-3 bg-stone-900 text-white text-[10px] uppercase tracking-[0.25em] font-bold hover:bg-stone-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                >
                    {saving ? (
                        "Saving…"
                    ) : (
                        <>
                            <Save size={12} /> Yes, save
                        </>
                    )}
                </button>
            </div>
        </div>
    </div>
);

// ── Component ─────────────────────────────────────────────────────────────────

export const GenericEditor = ({
    schema,
    existingDoc,
    onCancel,
    onSave,
    hideHeader = false,
    onDirtyChange,
}: {
    schema: Schema;
    existingDoc?: Record<string, unknown>;
    onCancel: () => void;
    onSave: () => void;
    hideHeader?: boolean;
    onDirtyChange?: (dirty: boolean) => void;
}) => {
    const [formData, setFormData] = useState<Record<string, unknown>>({});
    const [saving, setSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);
    // Tracks whether the editor manually edited the slug — once touched, stop auto-deriving from title
    const [slugTouched, setSlugTouched] = useState(false);

    const hasSlug = "slug" in schema.properties;

    // Reset form and dirty state whenever the doc being edited changes
    useEffect(() => {
        if (existingDoc) {
            setFormData({ ...existingDoc });
        } else {
            const defaults: Record<string, unknown> = {};
            Object.entries(schema.properties).forEach(([key, prop]) => {
                if (prop.defaultValue !== undefined) defaults[key] = prop.defaultValue;
                if (prop.dataType === "boolean" && prop.defaultValue === undefined) defaults[key] = false;
                if (prop.dataType === "imageGallery") defaults[key] = [];
                if (prop.dataType === "imageGroups") defaults[key] = [];
                if (prop.dataType === "featuredImages") defaults[key] = {};
            });
            setFormData(defaults);
        }
        setIsDirty(false);
        setSlugTouched(false);
        onDirtyChange?.(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [existingDoc, schema]);

    const handleChange = (key: string, value: unknown) => {
        setFormData((prev) => {
            const next = { ...prev, [key]: value };
            // When creating, auto-derive the slug from the title until the editor edits it manually
            if (key === "title" && !existingDoc && hasSlug && !slugTouched) {
                next.slug = slugify(String(value ?? ""));
            }
            return next;
        });
        if (key === "slug") setSlugTouched(true);
        if (!isDirty) {
            setIsDirty(true);
            onDirtyChange?.(true);
        }
    };

    // The field that becomes the Firestore document ID — immutable once the record exists
    const isLockedIdField = (key: string) => !!existingDoc && key === (schema.idField ?? "");

    // Intercept form submit — show confirmation modal instead of saving immediately
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setShowSaveConfirm(true);
    };

    // The actual save logic — only called after user confirms in modal
    const doSave = async () => {
        setSaving(true);
        try {
            if (existingDoc) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { id, ...data } = formData;
                await updateDoc(doc(db, schema.path, existingDoc.id as string), data);
            } else {
                // The chosen doc ID comes from the schema's idField (modelNumber / slug / email)
                const idField = schema.idField;
                const rawId = idField && typeof formData[idField] === "string" ? (formData[idField] as string) : null;
                // Emails are case-insensitive — normalise so role lookups by token.email match
                const newId = rawId && idField === "email" ? rawId.trim().toLowerCase() : rawId;

                if (newId) {
                    // Guard against silently overwriting an existing record with the same ID
                    const clash = await getDoc(doc(db, schema.path, newId));
                    if (clash.exists()) {
                        setSaving(false);
                        setShowSaveConfirm(false);
                        alert(`A record with the ID "${newId}" already exists. Please choose a different ${idField}.`);
                        return;
                    }
                    // Persist the normalised id back into the document data when relevant
                    const data = idField === "email" ? { ...formData, email: newId } : formData;
                    await setDoc(doc(db, schema.path, newId), data);
                } else {
                    await addDoc(collection(db, schema.path), formData);
                }
            }
            setShowSaveConfirm(false);
            setIsDirty(false);
            onDirtyChange?.(false);
            onSave();
        } catch (error) {
            console.error("Save failed", error);
            setShowSaveConfirm(false);
            alert("Failed to save record. Please try again.");
        }
        setSaving(false);
    };

    // The model ID for Storage path — use existing doc ID, or the entered modelNumber
    const modelId = (existingDoc?.id as string) || (formData.modelNumber as string) || "";

    const recordTitle =
        (existingDoc?.title as string) ||
        (existingDoc?.modelNumber as string) ||
        (formData.modelNumber as string) ||
        (existingDoc?.id as string) ||
        "new record";

    return (
        <div className="bg-white p-8 font-sans">
            {/* Save confirmation modal */}
            {showSaveConfirm && (
                <SaveConfirmModal
                    recordTitle={recordTitle}
                    onConfirm={doSave}
                    onCancel={() => setShowSaveConfirm(false)}
                    saving={saving}
                />
            )}

            {!hideHeader && (
                <div className="flex justify-between items-center mb-8 border-b border-stone-300 pb-4">
                    <div>
                        <h3 className="text-xl font-light uppercase tracking-widest">
                            {existingDoc
                                ? `Edit: ${(existingDoc.title as string) || (existingDoc.id as string)}`
                                : `New ${schema.name}`}
                        </h3>
                        {existingDoc && (
                            <span className="text-[10px] font-mono text-stone-500">ID: {existingDoc.id as string}</span>
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

            <form id="generic-editor-form" onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
                {Object.entries(schema.properties).map(([key, prop]) => (
                    <div
                        key={key}
                        className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-stone-300 pb-6 last:border-0"
                    >
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold uppercase tracking-widest mb-1 text-stone-800">
                                {prop.name}
                                {prop.validation?.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            <span className="text-[10px] font-mono text-stone-500">{prop.dataType}</span>
                        </div>

                        <div className="md:col-span-2">
                            {/* Boolean toggle */}
                            {prop.dataType === "boolean" && (
                                <div className="flex items-center space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => handleChange(key, !formData[key])}
                                        className={`w-12 h-6 flex items-center p-1 border transition-colors ${
                                            formData[key]
                                                ? "bg-stone-900 border-stone-900 justify-end"
                                                : "bg-white border-stone-300 justify-start"
                                        }`}
                                    >
                                        <div className={`w-4 h-4 ${formData[key] ? "bg-white" : "bg-stone-400"}`} />
                                    </button>
                                    <span className="text-xs uppercase font-bold">{formData[key] ? "Yes" : "No"}</span>
                                </div>
                            )}

                            {/* Multiline / markdown */}
                            {prop.dataType === "string" && (prop.multiline || prop.markdown) && (
                                <textarea
                                    value={(formData[key] as string) || ""}
                                    onChange={(e) => handleChange(key, e.target.value)}
                                    rows={6}
                                    className="w-full bg-white border border-stone-300 p-3 font-mono text-sm focus:outline-none focus:border-black transition-colors"
                                    placeholder={`${prop.name}...`}
                                />
                            )}

                            {/* Enum select */}
                            {prop.config?.enumValues && (
                                <select
                                    value={(formData[key] as string) || ""}
                                    onChange={(e) => handleChange(key, e.target.value)}
                                    className="w-full bg-white border border-stone-300 p-3 font-mono text-sm focus:outline-none focus:border-black"
                                >
                                    <option value="">— select —</option>
                                    {prop.config.enumValues.map((val) => (
                                        <option key={val} value={val}>
                                            {val}
                                        </option>
                                    ))}
                                </select>
                            )}

                            {/* String array (comma separated) */}
                            {prop.dataType === "array" && (
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        placeholder="Comma separated (e.g. Wood, Steel)"
                                        value={
                                            Array.isArray(formData[key])
                                                ? (formData[key] as string[]).join(", ")
                                                : (formData[key] as string) || ""
                                        }
                                        onChange={(e) =>
                                            handleChange(
                                                key,
                                                e.target.value
                                                    .split(",")
                                                    .map((s) => s.trim())
                                                    .filter(Boolean),
                                            )
                                        }
                                        className="w-full bg-white border border-stone-300 p-3 font-mono text-sm focus:outline-none focus:border-black"
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
                            {prop.dataType === "imageGallery" && (
                                <ImageGalleryEditor
                                    modelId={modelId}
                                    images={(formData[key] as ModelImage[]) || []}
                                    onChange={(imgs) => handleChange(key, imgs)}
                                />
                            )}

                            {/* Featured images (main + secondary) */}
                            {prop.dataType === "featuredImages" && (
                                <FeaturedImagesEditor
                                    modelId={modelId}
                                    featured={(formData[key] as FeaturedImages) || {}}
                                    onChange={(f) => handleChange(key, f)}
                                />
                            )}

                            {/* Image groups (canvas layout) */}
                            {prop.dataType === "imageGroups" && (
                                <ImageGroupsEditor
                                    modelId={modelId}
                                    groups={(formData[key] as ImageGroup[]) || []}
                                    onChange={(groups) => handleChange(key, groups)}
                                />
                            )}

                            {/* Audio upload */}
                            {prop.dataType === "audioUpload" && (
                                <AudioUploader
                                    modelId={modelId}
                                    url={(formData[key] as string) || null}
                                    onChange={(url) => handleChange(key, url ?? "")}
                                />
                            )}

                            {/* Date picker */}
                            {prop.dataType === "date" && (
                                <input
                                    type="date"
                                    value={(formData[key] as string) || ""}
                                    onChange={(e) => handleChange(key, e.target.value)}
                                    className="w-full bg-white border border-stone-300 p-3 font-mono text-sm focus:outline-none focus:border-black transition-colors"
                                />
                            )}

                            {/* Plain string / number — catch-all */}
                            {prop.dataType !== "boolean" &&
                                prop.dataType !== "date" &&
                                prop.dataType !== "array" &&
                                prop.dataType !== "imageGallery" &&
                                prop.dataType !== "audioUpload" &&
                                !prop.config?.enumValues &&
                                !(prop.dataType === "string" && (prop.multiline || prop.markdown)) && (
                                    <div>
                                        <input
                                            type={prop.dataType === "number" ? "number" : "text"}
                                            required={prop.validation?.required}
                                            readOnly={isLockedIdField(key)}
                                            value={(formData[key] as string | number) || ""}
                                            onChange={(e) =>
                                                handleChange(
                                                    key,
                                                    prop.dataType === "number"
                                                        ? Number(e.target.value)
                                                        : e.target.value,
                                                )
                                            }
                                            className={`w-full border p-3 font-mono text-sm focus:outline-none transition-colors ${
                                                isLockedIdField(key)
                                                    ? "bg-stone-100 border-stone-200 text-stone-500 cursor-not-allowed"
                                                    : "bg-white border-stone-300 focus:border-black"
                                            }`}
                                        />
                                        {isLockedIdField(key) && (
                                            <p className="text-[10px] text-stone-500 mt-1.5">
                                                Permanent — this is the record ID and cannot be changed after creation.
                                            </p>
                                        )}
                                        {!existingDoc && key === "slug" && (
                                            <p className="text-[10px] text-stone-500 mt-1.5">
                                                Auto-generated from the title. Edit to customise the URL.
                                            </p>
                                        )}
                                    </div>
                                )}
                        </div>
                    </div>
                ))}

                {/* Footer — only shown when not in slide-over (hideHeader = false = standalone mode) */}
                {!hideHeader && (
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
                            {saving ? (
                                "Saving..."
                            ) : (
                                <>
                                    <Save size={14} /> Save
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Dirty indicator shown when in slide-over (hideHeader = true) */}
                {hideHeader && isDirty && (
                    <div className="flex items-center gap-2 py-3 border-t border-amber-100 bg-amber-50 -mx-8 px-8 mt-2">
                        <AlertTriangle size={11} className="text-amber-500 flex-shrink-0" />
                        <p className="text-[10px] text-amber-700 font-medium">Unsaved changes</p>
                    </div>
                )}
            </form>
        </div>
    );
};
