"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { GenericEditor } from "./GenericEditor";
import { DataTable } from "./DataTable";
import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import { Plus, Trash2, X, AlertTriangle, Save, Maximize2, Minimize2, HelpCircle } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SchemaProperty {
    name: string;
    dataType: string;
    validation?: { required?: boolean };
    config?: { enumValues?: string[] };
    defaultValue?: unknown;
    multiline?: boolean;
    markdown?: boolean;
    of?: { dataType: string };
    tableVisible?: boolean;
    tableWidth?: number;
}

interface Schema {
    name: string;
    path: string;
    properties: Record<string, SchemaProperty>;
}

type DocRecord = Record<string, unknown> & { id: string };

export interface QuickFilter {
    label: string;
    filterFn: (doc: DocRecord) => boolean;
}

// ─── Discard warning modal ────────────────────────────────────────────────────

const DiscardWarningModal = ({ onDiscard, onKeepEditing }: { onDiscard: () => void; onKeepEditing: () => void }) => (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-black/40" onClick={onKeepEditing} />
        <div className="relative bg-white border border-stone-300 shadow-2xl p-8 max-w-sm w-full space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
                    <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-500">Unsaved changes</p>
                </div>
                <h3 className="text-lg font-light">Discard changes?</h3>
                <p className="text-[12px] text-stone-500 leading-relaxed">
                    You have unsaved changes. If you close this panel now, all edits will be lost and cannot be
                    recovered.
                </p>
            </div>
            <div className="flex gap-3 pt-2">
                <button
                    onClick={onKeepEditing}
                    className="flex-1 py-3 border border-stone-300 text-[10px] uppercase tracking-[0.25em] font-bold text-stone-600 hover:border-stone-900 hover:text-stone-900 transition-colors"
                >
                    Keep editing
                </button>
                <button
                    onClick={onDiscard}
                    className="flex-1 py-3 bg-red-600 text-white text-[10px] uppercase tracking-[0.25em] font-bold hover:bg-red-700 transition-colors"
                >
                    Discard
                </button>
            </div>
        </div>
    </div>
);

// ─── Column builder ───────────────────────────────────────────────────────────

function defaultWidth(dataType: string): number {
    switch (dataType) {
        case "boolean":
            return 80;
        case "number":
            return 80;
        case "imageGallery":
            return 75;
        case "audioUpload":
            return 70;
        default:
            return 160;
    }
}

function buildColumns(properties: Record<string, SchemaProperty>): ColumnDef<DocRecord, unknown>[] {
    return Object.entries(properties).map(([key, prop]) => {
        const base = {
            id: key,
            header: prop.name,
            enableResizing: true,
            size: prop.tableWidth ?? defaultWidth(prop.dataType),
        };

        if (prop.dataType === "boolean") {
            return {
                ...base,
                enableSorting: true,
                accessorFn: (row: DocRecord) => (row[key] ? 1 : 0),
                cell: ({ row }: { row: { original: DocRecord } }) => {
                    const val = Boolean(row.original[key]);
                    return (
                        <span
                            className={`inline-flex items-center gap-1.5 text-[10px] font-bold ${val ? "text-stone-900" : "text-stone-300"}`}
                        >
                            <span
                                className={`w-1.5 h-1.5 inline-block flex-shrink-0 ${val ? "bg-stone-900" : "bg-stone-200"}`}
                            />
                            {val ? "Yes" : "No"}
                        </span>
                    );
                },
            } as ColumnDef<DocRecord, unknown>;
        }

        if (prop.dataType === "imageGallery") {
            return {
                ...base,
                enableSorting: true,
                accessorFn: (row: DocRecord) => (Array.isArray(row[key]) ? (row[key] as unknown[]).length : 0),
                cell: ({ getValue }: { getValue: () => unknown }) => {
                    const n = getValue() as number;
                    return n > 0 ? (
                        <span className="font-mono text-[10px] text-stone-700">{n}</span>
                    ) : (
                        <span className="font-mono text-[10px] text-stone-300">0</span>
                    );
                },
            } as ColumnDef<DocRecord, unknown>;
        }

        if (prop.dataType === "audioUpload") {
            return {
                ...base,
                enableSorting: true,
                accessorFn: (row: DocRecord) => (row[key] ? 1 : 0),
                cell: ({ row }: { row: { original: DocRecord } }) => {
                    const has = Boolean(row.original[key]);
                    return (
                        <span className={`text-[11px] ${has ? "text-stone-700" : "text-stone-300"}`}>
                            {has ? "♫" : "—"}
                        </span>
                    );
                },
            } as ColumnDef<DocRecord, unknown>;
        }

        if (prop.dataType === "array") {
            return {
                ...base,
                enableSorting: false,
                accessorFn: (row: DocRecord) => (Array.isArray(row[key]) ? (row[key] as string[]).join(", ") : ""),
                cell: ({ getValue }: { getValue: () => unknown }) => {
                    const val = String(getValue() || "");
                    return val ? (
                        <span className="text-[10px] text-stone-500 truncate block" title={val}>
                            {val}
                        </span>
                    ) : (
                        <span className="text-stone-300">—</span>
                    );
                },
            } as ColumnDef<DocRecord, unknown>;
        }

        if (prop.config?.enumValues) {
            return {
                ...base,
                enableSorting: true,
                accessorFn: (row: DocRecord) => String(row[key] || ""),
                cell: ({ getValue }: { getValue: () => unknown }) => {
                    const val = getValue() as string;
                    return val ? (
                        <span className="text-[8px] uppercase tracking-[0.2em] font-bold text-stone-600 bg-stone-100 px-1.5 py-0.5 inline-block whitespace-nowrap">
                            {val}
                        </span>
                    ) : (
                        <span className="text-stone-300">—</span>
                    );
                },
            } as ColumnDef<DocRecord, unknown>;
        }

        if (prop.dataType === "number") {
            return {
                ...base,
                enableSorting: true,
                accessorFn: (row: DocRecord) => (row[key] as number) || 0,
                cell: ({ getValue }: { getValue: () => unknown }) => {
                    const val = getValue() as number;
                    return val ? (
                        <span className="font-mono text-[11px] text-stone-600">{val}</span>
                    ) : (
                        <span className="text-stone-300">—</span>
                    );
                },
            } as ColumnDef<DocRecord, unknown>;
        }

        // ── Date ──
        if (prop.dataType === "date") {
            return {
                ...base,
                enableSorting: true,
                accessorFn: (row: DocRecord) => String(row[key] || ""),
                cell: ({ getValue }: { getValue: () => unknown }) => {
                    const val = getValue() as string;
                    if (!val) return <span className="text-stone-300">—</span>;
                    // Format YYYY-MM-DD → DD Mon YYYY
                    const d = new Date(val + "T00:00:00");
                    const formatted = isNaN(d.getTime())
                        ? val
                        : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                    return <span className="font-mono text-[10px] text-stone-600">{formatted}</span>;
                },
            } as ColumnDef<DocRecord, unknown>;
        }

        return {
            ...base,
            enableSorting: true,
            accessorFn: (row: DocRecord) => String(row[key] || ""),
            cell: ({ getValue }: { getValue: () => unknown }) => {
                const val = String(getValue() || "");
                return val ? (
                    <span className="text-[11px] text-stone-700 truncate block" title={val}>
                        {val}
                    </span>
                ) : (
                    <span className="text-stone-300">—</span>
                );
            },
        } as ColumnDef<DocRecord, unknown>;
    });
}

// ─── Component ────────────────────────────────────────────────────────────────

export const GenericCollection = ({
    schema,
    quickFilters,
    onRowClick: onRowClickOverride,
    rowActionLabel,
    onAddNew: onAddNewOverride,
    onHelp,
    autoCreateNonce,
}: {
    schema: Schema;
    quickFilters?: QuickFilter[];
    /** Override the default slide-over editor when a row is clicked */
    onRowClick?: (row: DocRecord) => void;
    rowActionLabel?: string;
    /** Override the Add new button behaviour */
    onAddNew?: () => void;
    /** Open the Knowledge Center guide for this collection */
    onHelp?: () => void;
    /** When this number changes, open the create form (used by the New content menu) */
    autoCreateNonce?: number;
}) => {
    const [docs, setDocs] = useState<DocRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingDoc, setEditingDoc] = useState<DocRecord | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Quick filter state — null = show all
    const [activeFilter, setActiveFilter] = useState<number | null>(null);

    // Dirty / discard state
    const [isDirty, setIsDirty] = useState(false);
    const [showDiscardWarning, setShowDiscardWarning] = useState(false);

    // Keep a ref to isDirty so event handlers always read the current value
    const isDirtyRef = useRef(false);
    useEffect(() => {
        isDirtyRef.current = isDirty;
    }, [isDirty]);

    const fetchDocs = useCallback(async () => {
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, schema.path));
            setDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DocRecord));
        } catch (e) {
            console.error("GenericCollection fetch error:", e);
        }
        setLoading(false);
    }, [schema.path]);

    useEffect(() => {
        fetchDocs();
    }, [fetchDocs]);

    // Open the create form when the parent's "New content" menu requests it
    useEffect(() => {
        if (autoCreateNonce && autoCreateNonce > 0) {
            setEditingDoc(null);
            setIsCreating(true);
        }
    }, [autoCreateNonce]);

    const handleDelete = async (id: string) => {
        if (!confirm("Permanently delete this record?")) return;
        await deleteDoc(doc(db, schema.path, id));
        setDocs((prev) => prev.filter((d) => d.id !== id));
        if (editingDoc?.id === id) forceCloseEditor();
    };

    // Closes the editor unconditionally (used after save or confirmed discard)
    const forceCloseEditor = () => {
        setIsCreating(false);
        setEditingDoc(null);
        setIsDirty(false);
        setShowDiscardWarning(false);
    };

    // Attempts to close — checks for unsaved changes first
    const attemptClose = () => {
        if (isDirtyRef.current) {
            setShowDiscardWarning(true);
        } else {
            forceCloseEditor();
        }
    };

    const handleSave = () => {
        forceCloseEditor();
        fetchDocs();
    };

    const handleDirtyChange = (dirty: boolean) => {
        setIsDirty(dirty);
    };

    // Build columns and initial visibility from schema
    const columns = buildColumns(schema.properties);
    const initialColumnVisibility: VisibilityState = {};
    Object.entries(schema.properties).forEach(([key, prop]) => {
        if (prop.tableVisible === false) initialColumnVisibility[key] = false;
    });

    // Apply active quick filter (if any) before the DataTable sees the data
    const visibleDocs =
        activeFilter !== null && quickFilters?.[activeFilter] ? docs.filter(quickFilters[activeFilter].filterFn) : docs;

    const isEditorOpen = isCreating || editingDoc !== null;

    const panelTitle = editingDoc
        ? (editingDoc.title as string) || (editingDoc.modelNumber as string) || (editingDoc.id as string)
        : schema.name.replace(/s$/, "");

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="pb-6 border-b border-black space-y-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div>
                            <h2 className="text-2xl font-light uppercase tracking-widest">{schema.name}</h2>
                            {!loading && (
                                <p className="text-[9px] font-mono text-stone-400 mt-1">
                                    {activeFilter !== null
                                        ? `${visibleDocs.length} of ${docs.length} records`
                                        : `${docs.length} records total`}
                                </p>
                            )}
                        </div>
                        {onHelp && (
                            <button
                                onClick={onHelp}
                                title={`How to use ${schema.name} →`}
                                className="text-stone-300 hover:text-stone-900 transition-colors mt-0.5"
                                aria-label="Open guide"
                            >
                                <HelpCircle size={16} />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => (onAddNewOverride ? onAddNewOverride() : setIsCreating(true))}
                        className="bg-black text-white px-4 py-2.5 uppercase text-[10px] font-bold tracking-widest hover:bg-stone-800 flex items-center gap-2 transition-colors"
                    >
                        <Plus size={13} /> Add new
                    </button>
                </div>

                {/* Quick filter tabs */}
                {quickFilters && quickFilters.length > 0 && (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setActiveFilter(null)}
                            className={`px-3 py-1.5 text-[9px] uppercase tracking-[0.25em] font-bold border transition-all ${
                                activeFilter === null
                                    ? "bg-stone-900 text-white border-stone-900"
                                    : "border-stone-300 text-stone-500 hover:border-stone-900 hover:text-stone-900"
                            }`}
                        >
                            All {!loading && <span className="ml-1 opacity-60">{docs.length}</span>}
                        </button>
                        {quickFilters.map((qf, i) => {
                            const count = docs.filter(qf.filterFn).length;
                            return (
                                <button
                                    key={qf.label}
                                    onClick={() => setActiveFilter(activeFilter === i ? null : i)}
                                    className={`px-3 py-1.5 text-[9px] uppercase tracking-[0.25em] font-bold border transition-all ${
                                        activeFilter === i
                                            ? "bg-stone-900 text-white border-stone-900"
                                            : "border-stone-300 text-stone-500 hover:border-stone-900 hover:text-stone-900"
                                    }`}
                                >
                                    {qf.label} {!loading && <span className="ml-1 opacity-60">{count}</span>}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Table */}
            <DataTable
                data={visibleDocs}
                columns={columns}
                initialColumnVisibility={initialColumnVisibility}
                onRowClick={(row) => {
                    if (onRowClickOverride) {
                        onRowClickOverride(row);
                    } else {
                        setEditingDoc(row);
                    }
                }}
                loading={loading}
            />

            {/* ── Slide-over editor (portaled to body to avoid containing-block glitches) ── */}
            {isEditorOpen && createPortal(
                <>
                    {/* Backdrop — clicking it triggers the discard check */}
                    <div className="fixed inset-0 bg-stone-900/30 z-40 animate-in fade-in duration-200" onClick={attemptClose} />

                    {/* Discard warning modal */}
                    {showDiscardWarning && (
                        <DiscardWarningModal
                            onDiscard={forceCloseEditor}
                            onKeepEditing={() => setShowDiscardWarning(false)}
                        />
                    )}

                    {/* Panel — slide-over or fullscreen depending on state */}
                    <div
                        className={`fixed top-0 right-0 bottom-0 bg-white z-50 shadow-2xl flex flex-col font-sans animate-in slide-in-from-right duration-200 ${
                            isFullscreen ? "left-0 w-full" : "w-[720px] max-w-[95vw]"
                        }`}
                    >
                        {/* Panel header */}
                        <div className="flex items-center justify-between px-8 py-5 border-b border-stone-300 flex-shrink-0">
                            <div className="min-w-0 flex-1 mr-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-[8px] uppercase tracking-[0.5em] font-bold text-stone-600">
                                        {isCreating ? "New record" : "Edit record"}
                                    </p>
                                    {isDirty && (
                                        <span className="flex items-center gap-1 text-[8px] uppercase tracking-[0.2em] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5">
                                            <span className="w-1 h-1 bg-amber-500 rounded-none inline-block" />
                                            Unsaved
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-base font-medium mt-0.5 truncate text-stone-900">{panelTitle}</h3>
                                {editingDoc && (
                                    <p className="text-[9px] font-mono text-stone-500 mt-0.5">
                                        id: {editingDoc.id as string}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                    onClick={() => setIsFullscreen((v) => !v)}
                                    className="p-2 hover:bg-stone-100 transition-colors"
                                    title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                                >
                                    {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                                </button>
                                <button
                                    onClick={attemptClose}
                                    className="p-2 hover:bg-stone-100 transition-colors"
                                    title={isDirty ? "Close (you have unsaved changes)" : "Close"}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Editor form — scrollable */}
                        <div className="flex-1 overflow-y-auto">
                            <GenericEditor
                                schema={schema}
                                existingDoc={editingDoc || undefined}
                                onCancel={attemptClose}
                                onSave={handleSave}
                                onDirtyChange={handleDirtyChange}
                                hideHeader
                            />
                        </div>

                        {/* Sticky footer — Save + Delete */}
                        <div className="border-t border-stone-300 px-8 py-4 flex-shrink-0 flex items-center justify-between gap-4 bg-white">
                            {/* Delete (edit mode only) */}
                            <div>
                                {editingDoc && (
                                    <button
                                        onClick={() => handleDelete(editingDoc.id as string)}
                                        className="text-[9px] uppercase tracking-[0.2em] font-bold text-red-300 hover:text-red-600 transition-colors flex items-center gap-2"
                                    >
                                        <Trash2 size={11} />
                                        Delete permanently
                                    </button>
                                )}
                            </div>

                            {/* Cancel + Save */}
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={attemptClose}
                                    className="px-5 py-2.5 text-[10px] uppercase tracking-[0.25em] font-bold text-stone-500 hover:text-stone-900 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    form="generic-editor-form"
                                    className={`px-6 py-2.5 text-[10px] uppercase tracking-[0.25em] font-bold flex items-center gap-2 transition-all ${
                                        isDirty
                                            ? "bg-stone-900 text-white hover:bg-stone-700"
                                            : "bg-stone-200 text-stone-500 cursor-default"
                                    }`}
                                    title={!isDirty ? "No changes to save" : undefined}
                                >
                                    <Save size={12} />
                                    Save changes
                                </button>
                            </div>
                        </div>
                    </div>
                </>,
                document.body,
            )}
        </div>
    );
};
