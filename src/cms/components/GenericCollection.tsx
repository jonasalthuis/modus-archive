"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { GenericEditor } from './GenericEditor';
import { DataTable } from './DataTable';
import type { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { Plus, Trash2, X } from 'lucide-react';

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
    tableVisible?: boolean;   // false = hidden by default in table
    tableWidth?: number;      // default column width in px
}

interface Schema {
    name: string;
    path: string;
    properties: Record<string, SchemaProperty>;
}

type DocRecord = Record<string, unknown> & { id: string };

// ─── Column builder ───────────────────────────────────────────────────────────

function defaultWidth(dataType: string): number {
    switch (dataType) {
        case 'boolean':      return 80;
        case 'number':       return 80;
        case 'imageGallery': return 75;
        case 'audioUpload':  return 70;
        default:             return 160;
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

        // ── Boolean ──
        if (prop.dataType === 'boolean') {
            return {
                ...base,
                enableSorting: true,
                accessorFn: (row: DocRecord) => (row[key] ? 1 : 0),
                cell: ({ row }: { row: { original: DocRecord } }) => {
                    const val = Boolean(row.original[key]);
                    return (
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold ${val ? 'text-stone-900' : 'text-stone-300'}`}>
                            <span className={`w-1.5 h-1.5 inline-block flex-shrink-0 ${val ? 'bg-stone-900' : 'bg-stone-200'}`} />
                            {val ? 'Yes' : 'No'}
                        </span>
                    );
                },
            } as ColumnDef<DocRecord, unknown>;
        }

        // ── Image gallery (count) ──
        if (prop.dataType === 'imageGallery') {
            return {
                ...base,
                enableSorting: true,
                accessorFn: (row: DocRecord) => Array.isArray(row[key]) ? (row[key] as unknown[]).length : 0,
                cell: ({ getValue }: { getValue: () => unknown }) => {
                    const n = getValue() as number;
                    return n > 0
                        ? <span className="font-mono text-[10px] text-stone-700">{n}</span>
                        : <span className="font-mono text-[10px] text-stone-200">0</span>;
                },
            } as ColumnDef<DocRecord, unknown>;
        }

        // ── Audio upload ──
        if (prop.dataType === 'audioUpload') {
            return {
                ...base,
                enableSorting: true,
                accessorFn: (row: DocRecord) => (row[key] ? 1 : 0),
                cell: ({ row }: { row: { original: DocRecord } }) => {
                    const has = Boolean(row.original[key]);
                    return <span className={`text-[11px] ${has ? 'text-stone-700' : 'text-stone-200'}`}>{has ? '♫' : '—'}</span>;
                },
            } as ColumnDef<DocRecord, unknown>;
        }

        // ── Array ──
        if (prop.dataType === 'array') {
            return {
                ...base,
                enableSorting: false,
                accessorFn: (row: DocRecord) => Array.isArray(row[key]) ? (row[key] as string[]).join(', ') : '',
                cell: ({ getValue }: { getValue: () => unknown }) => {
                    const val = String(getValue() || '');
                    return val
                        ? <span className="text-[10px] text-stone-500 truncate block" title={val}>{val}</span>
                        : <span className="text-stone-200">—</span>;
                },
            } as ColumnDef<DocRecord, unknown>;
        }

        // ── Enum ──
        if (prop.config?.enumValues) {
            return {
                ...base,
                enableSorting: true,
                accessorFn: (row: DocRecord) => String(row[key] || ''),
                cell: ({ getValue }: { getValue: () => unknown }) => {
                    const val = getValue() as string;
                    return val
                        ? <span className="text-[8px] uppercase tracking-[0.2em] font-bold text-stone-600 bg-stone-100 px-1.5 py-0.5 inline-block whitespace-nowrap">{val}</span>
                        : <span className="text-stone-200">—</span>;
                },
            } as ColumnDef<DocRecord, unknown>;
        }

        // ── Number ──
        if (prop.dataType === 'number') {
            return {
                ...base,
                enableSorting: true,
                accessorFn: (row: DocRecord) => (row[key] as number) || 0,
                cell: ({ getValue }: { getValue: () => unknown }) => {
                    const val = getValue() as number;
                    return val
                        ? <span className="font-mono text-[11px] text-stone-600">{val}</span>
                        : <span className="text-stone-200">—</span>;
                },
            } as ColumnDef<DocRecord, unknown>;
        }

        // ── String (default) ──
        return {
            ...base,
            enableSorting: true,
            accessorFn: (row: DocRecord) => String(row[key] || ''),
            cell: ({ getValue }: { getValue: () => unknown }) => {
                const val = String(getValue() || '');
                return val
                    ? <span className="text-[11px] text-stone-700 truncate block" title={val}>{val}</span>
                    : <span className="text-stone-200">—</span>;
            },
        } as ColumnDef<DocRecord, unknown>;
    });
}

// ─── Component ────────────────────────────────────────────────────────────────

export const GenericCollection = ({ schema }: { schema: Schema }) => {
    const [docs, setDocs] = useState<DocRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingDoc, setEditingDoc] = useState<DocRecord | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const fetchDocs = useCallback(async () => {
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, schema.path));
            setDocs(snap.docs.map(d => ({ id: d.id, ...d.data() } as DocRecord)));
        } catch (e) {
            console.error('GenericCollection fetch error:', e);
        }
        setLoading(false);
    }, [schema.path]);

    useEffect(() => { fetchDocs(); }, [fetchDocs]);

    const handleDelete = async (id: string) => {
        if (!confirm('Permanently delete this record?')) return;
        await deleteDoc(doc(db, schema.path, id));
        setDocs(prev => prev.filter(d => d.id !== id));
        if (editingDoc?.id === id) setEditingDoc(null);
    };

    const closeEditor = () => { setIsCreating(false); setEditingDoc(null); };

    const handleSave = () => { closeEditor(); fetchDocs(); };

    // Build columns and initial visibility from schema
    const columns = buildColumns(schema.properties);

    const initialColumnVisibility: VisibilityState = {};
    Object.entries(schema.properties).forEach(([key, prop]) => {
        if (prop.tableVisible === false) initialColumnVisibility[key] = false;
    });

    const isEditorOpen = isCreating || editingDoc !== null;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center pb-6 border-b border-black">
                <div>
                    <h2 className="text-2xl font-light uppercase tracking-widest">{schema.name}</h2>
                    {!loading && (
                        <p className="text-[9px] font-mono text-stone-300 mt-1">{docs.length} records total</p>
                    )}
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="bg-black text-white px-4 py-2.5 uppercase text-[10px] font-bold tracking-widest hover:bg-stone-800 flex items-center gap-2 transition-colors"
                >
                    <Plus size={13} /> Add new
                </button>
            </div>

            {/* Table */}
            <DataTable
                data={docs}
                columns={columns}
                initialColumnVisibility={initialColumnVisibility}
                onRowClick={row => setEditingDoc(row)}
                loading={loading}
            />

            {/* ── Slide-over editor ── */}
            {isEditorOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/20 z-40"
                        onClick={closeEditor}
                    />

                    {/* Panel */}
                    <div className="fixed top-0 right-0 bottom-0 w-[700px] max-w-[95vw] bg-white z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
                        {/* Panel header */}
                        <div className="flex items-center justify-between px-8 py-5 border-b border-stone-100 flex-shrink-0">
                            <div>
                                <p className="text-[8px] uppercase tracking-[0.5em] font-bold text-stone-300">
                                    {isCreating ? 'New record' : 'Edit record'}
                                </p>
                                <h3 className="text-base font-light mt-0.5">
                                    {editingDoc
                                        ? (editingDoc.title as string || editingDoc.modelNumber as string || editingDoc.id as string)
                                        : schema.name.replace(/s$/, '')}
                                </h3>
                                {editingDoc && (
                                    <p className="text-[9px] font-mono text-stone-300 mt-0.5">id: {editingDoc.id as string}</p>
                                )}
                            </div>
                            <button onClick={closeEditor} className="p-2 hover:bg-stone-100 transition-colors">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Editor form — scrollable */}
                        <div className="flex-1 overflow-y-auto">
                            <GenericEditor
                                schema={schema}
                                existingDoc={editingDoc || undefined}
                                onCancel={closeEditor}
                                onSave={handleSave}
                                hideHeader
                            />
                        </div>

                        {/* Danger zone footer (edit mode only) */}
                        {editingDoc && (
                            <div className="border-t border-stone-100 px-8 py-4 flex-shrink-0">
                                <button
                                    onClick={() => handleDelete(editingDoc.id as string)}
                                    className="text-[9px] uppercase tracking-[0.2em] font-bold text-red-300 hover:text-red-600 transition-colors flex items-center gap-2"
                                >
                                    <Trash2 size={11} />
                                    Delete this record permanently
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
