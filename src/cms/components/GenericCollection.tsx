"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { GenericEditor } from "./GenericEditor";
import { DataTable } from "./DataTable";
import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import { Plus, Trash2, X, AlertTriangle, Save, Maximize2, Minimize2, HelpCircle, ExternalLink } from "lucide-react";

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
    /** e.g. "/dossiers/{slug}" — {slug} replaced with the doc's slug field */
    siteUrlTemplate?: string;
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
        <div className="relative bg-white border border-gray-300 shadow-2xl rounded-xl p-8 max-w-sm w-full space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
                    <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-gray-600">Unsaved changes</p>
                </div>
                <h3 className="text-lg font-light">Discard changes?</h3>
                <p className="text-[12px] text-gray-600 leading-relaxed">
                    You have unsaved changes. If you close this panel now, all edits will be lost and cannot be
                    recovered.
                </p>
            </div>
            <div className="flex gap-3 pt-2">
                <button
                    onClick={onKeepEditing}
                    className="flex-1 py-3 border border-gray-400 text-[10px] uppercase tracking-[0.25em] font-bold text-gray-700 hover:border-gray-900 hover:text-gray-900 transition-colors"
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
                            className={`inline-flex items-center gap-1.5 text-[10px] font-bold ${val ? "text-emerald-700" : "text-red-400"}`}
                        >
                            <span
                                className={`w-1.5 h-1.5 inline-block rounded-full flex-shrink-0 ${val ? "bg-emerald-500" : "bg-red-400"}`}
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
                        <span className="font-mono text-[10px] text-gray-800">{n}</span>
                    ) : (
                        <span className="font-mono text-[10px] text-gray-400">0</span>
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
                        <span className={`text-[11px] ${has ? "text-gray-800" : "text-gray-400"}`}>
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
                        <span className="text-[10px] text-gray-600 truncate block" title={val}>
                            {val}
                        </span>
                    ) : (
                        <span className="text-gray-400">—</span>
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
                        <span className="text-[8px] uppercase tracking-[0.2em] font-bold text-gray-700 bg-gray-200 px-1.5 py-0.5 inline-block whitespace-nowrap">
                            {val}
                        </span>
                    ) : (
                        <span className="text-gray-400">—</span>
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
                        <span className="font-mono text-[11px] text-gray-700">{val}</span>
                    ) : (
                        <span className="text-gray-400">—</span>
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
                    if (!val) return <span className="text-gray-400">—</span>;
                    // Format YYYY-MM-DD → DD Mon YYYY
                    const d = new Date(val + "T00:00:00");
                    const formatted = isNaN(d.getTime())
                        ? val
                        : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                    return <span className="font-mono text-[10px] text-gray-700">{formatted}</span>;
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
                    <span className="text-[11px] text-gray-800 truncate block" title={val}>
                        {val}
                    </span>
                ) : (
                    <span className="text-gray-400">—</span>
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
    contentLeft = 0,
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
    /** Pixel offset from viewport left where main content starts (sidebar width) — used to position the expanded panel */
    contentLeft?: number;
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
                                <p className="text-[9px] font-mono text-gray-500 mt-1">
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
                                className="text-gray-400 hover:text-gray-900 transition-colors mt-0.5"
                                aria-label="Open guide"
                            >
                                <HelpCircle size={16} />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => (onAddNewOverride ? onAddNewOverride() : setIsCreating(true))}
                        className="bg-black text-white px-4 py-2.5 uppercase text-[10px] font-bold tracking-widest hover:bg-gray-800 flex items-center gap-2 transition-colors"
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
                                    ? "bg-gray-900 text-white border-gray-900"
                                    : "border-gray-400 text-gray-600 hover:border-gray-900 hover:text-gray-900"
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
                                            ? "bg-gray-900 text-white border-gray-900"
                                            : "border-gray-400 text-gray-600 hover:border-gray-900 hover:text-gray-900"
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
                    <div className="fixed inset-0 bg-gray-900/30 z-40 animate-in fade-in duration-200" onClick={attemptClose} />

                    {/* Discard warning modal */}
                    {showDiscardWarning && (
                        <DiscardWarningModal
                            onDiscard={forceCloseEditor}
                            onKeepEditing={() => setShowDiscardWarning(false)}
                        />
                    )}

                    {/* Panel — floating, detached from edges, rounded */}
                    <div
                        className="fixed z-50 bg-white shadow-[0_8px_40px_rgba(0,0,0,0.18)] flex flex-col font-sans rounded-xl overflow-hidden transition-all duration-300 ease-in-out animate-in slide-in-from-right-4 fade-in duration-200"
                        style={isFullscreen
                            ? { top: 24, bottom: 24, left: contentLeft + 24, right: 24 }
                            : { top: 24, bottom: 24, right: 24, width: "40vw" }
                        }
                    >
                        {/* Panel header */}
                        <div className="px-8 pt-5 pb-4 border-b border-gray-200 flex-shrink-0">
                            {/* Top row: label + controls */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <p className="text-[8px] uppercase tracking-[0.5em] font-bold text-gray-400">
                                        {isCreating ? "New record" : "Edit record"}
                                    </p>
                                    {isDirty && (
                                        <span className="flex items-center gap-1 text-[8px] uppercase tracking-[0.2em] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5">
                                            <span className="w-1 h-1 bg-amber-500 inline-block" />
                                            Unsaved
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                    {/* View live page */}
                                    {editingDoc && schema.siteUrlTemplate && (() => {
                                        const url = schema.siteUrlTemplate
                                            .replace("{id}", editingDoc.id as string)
                                            .replace("{slug}", (editingDoc.slug as string) || "");
                                        return url.includes("undefined") || url.endsWith("/") ? null : (
                                            <a
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-900"
                                                title="Open live page"
                                            >
                                                <ExternalLink size={14} />
                                            </a>
                                        );
                                    })()}
                                    <button
                                        onClick={() => setIsFullscreen((v) => !v)}
                                        className="p-2 hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-900"
                                        title={isFullscreen ? "Exit fullscreen" : "Expand"}
                                    >
                                        {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                                    </button>
                                    <button
                                        onClick={attemptClose}
                                        className="p-2 hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-900"
                                        title={isDirty ? "Close (unsaved changes)" : "Close"}
                                    >
                                        <X size={15} />
                                    </button>
                                </div>
                            </div>

                            {/* Title block — archival style */}
                            <div className="space-y-1 min-w-0">
                                {editingDoc && (editingDoc.modelNumber as string) && (
                                    <p className="font-mono text-[10px] text-gray-400 tracking-widest">
                                        {editingDoc.modelNumber as string}
                                    </p>
                                )}
                                <h3 className="text-xl font-light leading-tight text-gray-900 truncate">
                                    {panelTitle}
                                </h3>
                                {editingDoc && (
                                    <p className="text-[10px] text-gray-400 font-light tracking-wide">
                                        {[editingDoc.architect as string, editingDoc.year as string]
                                            .filter(Boolean)
                                            .join(" · ") || `id: ${editingDoc.id as string}`}
                                    </p>
                                )}
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
                        <div className="border-t border-gray-400 px-8 py-4 flex-shrink-0 flex items-center justify-between gap-4 bg-white">
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
                                    className="px-5 py-2.5 text-[10px] uppercase tracking-[0.25em] font-bold text-gray-600 hover:text-gray-900 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    form="generic-editor-form"
                                    className={`px-6 py-2.5 text-[10px] uppercase tracking-[0.25em] font-bold flex items-center gap-2 transition-all ${
                                        isDirty
                                            ? "bg-gray-900 text-white hover:bg-gray-800"
                                            : "bg-gray-300 text-gray-600 cursor-default"
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
