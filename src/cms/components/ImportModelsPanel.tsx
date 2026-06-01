"use client";

import React, { useState, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import { doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Upload, Download, FileSpreadsheet, Check, AlertTriangle, X, Loader2 } from "lucide-react";

// ─── Column definitions ─────────────────────────────────────────────────────
// Maps spreadsheet headers ↔ Firestore fields. Images & audio are managed in the
// CMS, not imported here.
type ColType = "id" | "string" | "number" | "array" | "boolean";

interface ImportColumn {
    key: string;
    header: string;
    type: ColType;
    required?: boolean;
    example?: string;
}

const IMPORT_COLUMNS: ImportColumn[] = [
    { key: "modelNumber", header: "Ref #", type: "id", required: true, example: "0042" },
    { key: "title", header: "Title", type: "string", required: true, example: "Lloyd's of London — Phase 2" },
    { key: "architect", header: "Architect", type: "string", example: "Richard Rogers Partnership" },
    { key: "year", header: "Year", type: "number", example: "1984" },
    { key: "scale", header: "Scale", type: "string", example: "1:200" },
    { key: "modelSize", header: "Physical size", type: "string", example: "600 × 400 × 350mm" },
    { key: "materials", header: "Materials", type: "array", example: "Acrylic, Brass, Wood" },
    { key: "buildingType", header: "Building type", type: "string", example: "Office" },
    { key: "modelType", header: "Model type", type: "string", example: "presentation" },
    { key: "buildingStatus", header: "Building status", type: "string", example: "built" },
    { key: "location", header: "Location", type: "string", example: "London, UK" },
    { key: "leadMaker", header: "Lead maker", type: "string", example: "" },
    { key: "otherMakers", header: "Other makers", type: "string", example: "" },
    { key: "photographer", header: "Photographer", type: "string", example: "" },
    { key: "provenance", header: "Provenance", type: "string", example: "" },
    { key: "notes", header: "Notes", type: "string", example: "Detailed presentation model." },
    { key: "tags", header: "Tags", type: "array", example: "Rogers, 1980s, High-tech" },
    { key: "isVisible", header: "Published", type: "boolean", example: "no" },
    { key: "inPrototype", header: "Prototype", type: "boolean", example: "no" },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const truthy = (v: unknown) => ["yes", "true", "1", "y", "x", "published", "visible"].includes(String(v).trim().toLowerCase());

interface ParsedRow {
    id: string;
    data: Record<string, unknown>;
}
interface RejectedRow {
    rowNumber: number;
    reason: string;
}

export const ImportModelsPanel = ({ onDone }: { onDone: () => void }) => {
    const [fileName, setFileName] = useState<string | null>(null);
    const [parsed, setParsed] = useState<ParsedRow[]>([]);
    const [rejected, setRejected] = useState<RejectedRow[]>([]);
    const [parseError, setParseError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [done, setDone] = useState<number | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // ── Template download ──
    const downloadTemplate = () => {
        const headers = IMPORT_COLUMNS.map((c) => c.header);
        const example = IMPORT_COLUMNS.map((c) => c.example ?? "");
        const ws = XLSX.utils.aoa_to_sheet([headers, example]);
        ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 2, 14) }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Models");
        XLSX.writeFile(wb, "nma-models-template.xlsx");
    };

    // ── Parse uploaded file ──
    const parseFile = useCallback(async (file: File) => {
        setParseError(null);
        setDone(null);
        setFileName(file.name);
        try {
            const buf = await file.arrayBuffer();
            const wb = XLSX.read(buf, { type: "array" });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: false });

            if (rows.length === 0) {
                setParseError("The file has no data rows.");
                setParsed([]);
                setRejected([]);
                return;
            }

            // Build a normalized lookup of the sheet's headers
            const sheetKeys = Object.keys(rows[0]);
            const keyFor = (col: ImportColumn) =>
                sheetKeys.find((k) => norm(k) === norm(col.header) || norm(k) === norm(col.key));

            const ok: ParsedRow[] = [];
            const bad: RejectedRow[] = [];

            rows.forEach((row, i) => {
                const rowNumber = i + 2; // +1 header, +1 to 1-index
                const data: Record<string, unknown> = {};
                let id = "";

                for (const col of IMPORT_COLUMNS) {
                    const srcKey = keyFor(col);
                    const raw = srcKey != null ? row[srcKey] : "";
                    const val = typeof raw === "string" ? raw.trim() : raw;

                    if (col.type === "id") {
                        let s = String(val ?? "").trim();
                        if (/^\d+$/.test(s)) s = s.padStart(4, "0");
                        id = s;
                        continue;
                    }
                    if (col.type === "boolean") {
                        // Blank booleans default to false (never auto-publish on import)
                        data[col.key] = val === "" || val == null ? false : truthy(val);
                        continue;
                    }
                    if (val === "" || val == null) continue; // omit blanks → merge preserves existing
                    if (col.type === "number") {
                        const n = Number(val);
                        if (!Number.isNaN(n)) data[col.key] = n;
                    } else if (col.type === "array") {
                        data[col.key] = String(val)
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean);
                    } else {
                        data[col.key] = String(val);
                    }
                }

                if (!id) {
                    bad.push({ rowNumber, reason: "Missing Ref #" });
                    return;
                }
                if (!data.title) {
                    bad.push({ rowNumber, reason: `Ref # ${id}: missing Title` });
                    return;
                }
                data.modelNumber = id;
                ok.push({ id, data });
            });

            // Flag duplicate Ref #s within the file
            const seen = new Set<string>();
            const deduped: ParsedRow[] = [];
            for (const r of ok) {
                if (seen.has(r.id)) {
                    bad.push({ rowNumber: 0, reason: `Duplicate Ref # ${r.id} in file (only the first is kept)` });
                } else {
                    seen.add(r.id);
                    deduped.push(r);
                }
            }

            setParsed(deduped);
            setRejected(bad);
        } catch (e) {
            console.error("Parse error", e);
            setParseError("Could not read that file. Make sure it's a .xlsx or .csv export of the template.");
            setParsed([]);
            setRejected([]);
        }
    }, []);

    const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) parseFile(f);
    };
    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) parseFile(f);
    };

    // ── Run the import (upsert, preserving images/audio via merge) ──
    const runImport = async () => {
        setShowConfirm(false);
        setImporting(true);
        setProgress(0);
        try {
            const CHUNK = 400;
            let written = 0;
            for (let i = 0; i < parsed.length; i += CHUNK) {
                const slice = parsed.slice(i, i + CHUNK);
                const batch = writeBatch(db);
                for (const { id, data } of slice) {
                    batch.set(doc(db, "ma_models", id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
                }
                await batch.commit();
                written += slice.length;
                setProgress(written);
            }
            setDone(written);
        } catch (e) {
            console.error("Import failed", e);
            setParseError("Import failed partway through. Some rows may not have been saved. Please try again.");
        }
        setImporting(false);
    };

    const reset = () => {
        setFileName(null);
        setParsed([]);
        setRejected([]);
        setParseError(null);
        setDone(null);
        if (inputRef.current) inputRef.current.value = "";
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 font-sans">
            {/* Header */}
            <div className="pb-6 border-b border-black flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-light uppercase tracking-widest">Import models</h2>
                    <p className="text-[9px] font-mono text-stone-500 mt-1">Batch upload from CSV or Excel</p>
                </div>
                <button
                    onClick={onDone}
                    className="text-[10px] uppercase tracking-[0.25em] font-bold text-stone-500 hover:text-stone-900 transition-colors"
                >
                    ← Back to models
                </button>
            </div>

            {/* Step 1 — template */}
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
                <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                        1
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-stone-800">Download the template</h3>
                        <p className="text-sm text-stone-600 mt-1 leading-relaxed">
                            Use the template so your columns line up with the database. Fill one model per row. The{" "}
                            <span className="font-mono text-[12px] bg-stone-100 px-1 rounded">Ref #</span> and{" "}
                            <span className="font-mono text-[12px] bg-stone-100 px-1 rounded">Title</span> columns are
                            required; everything else is optional.
                        </p>
                        <button
                            onClick={downloadTemplate}
                            className="mt-3 inline-flex items-center gap-2 rounded-md bg-stone-900 text-white px-4 py-2.5 text-[10px] uppercase tracking-[0.25em] font-bold hover:bg-stone-700 transition-colors"
                        >
                            <Download size={13} /> Download Excel template
                        </button>
                    </div>
                </div>
            </div>

            {/* Step 2 — upload */}
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
                <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                        2
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-stone-800">
                            Upload your file
                        </h3>
                        <p className="text-sm text-stone-600 mt-1 mb-4 leading-relaxed">
                            Drop a <span className="font-mono text-[12px]">.xlsx</span> or{" "}
                            <span className="font-mono text-[12px]">.csv</span> file below. Existing models with the same
                            Ref # are <strong>updated</strong> — their photos and audio are kept.
                        </p>

                        <div
                            onDragOver={(e) => {
                                e.preventDefault();
                                setDragOver(true);
                            }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={onDrop}
                            onClick={() => inputRef.current?.click()}
                            className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                                dragOver ? "border-stone-900 bg-stone-50" : "border-stone-300 hover:border-stone-500"
                            }`}
                        >
                            <input
                                ref={inputRef}
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                onChange={onFileInput}
                                className="hidden"
                            />
                            {fileName ? (
                                <div className="flex items-center justify-center gap-2 text-stone-700">
                                    <FileSpreadsheet size={16} />
                                    <span className="text-sm font-medium">{fileName}</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            reset();
                                        }}
                                        className="ml-2 text-stone-400 hover:text-red-500"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-stone-400">
                                    <Upload size={20} />
                                    <span className="text-[10px] uppercase tracking-[0.3em] font-bold">
                                        Drop file or click to browse
                                    </span>
                                </div>
                            )}
                        </div>

                        {parseError && (
                            <p className="mt-3 text-sm text-red-500 flex items-center gap-2">
                                <AlertTriangle size={14} /> {parseError}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Step 3 — preview & import */}
            {(parsed.length > 0 || rejected.length > 0) && (
                <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
                    <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                            3
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-800">Review &amp; import</h3>

                            {/* Counts */}
                            <div className="flex flex-wrap gap-3 mt-3">
                                <span className="inline-flex items-center gap-2 rounded-md bg-stone-100 px-3 py-1.5 text-sm">
                                    <Check size={14} className="text-stone-700" />
                                    <strong>{parsed.length}</strong> ready to import
                                </span>
                                {rejected.length > 0 && (
                                    <span className="inline-flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-1.5 text-sm text-amber-700">
                                        <AlertTriangle size={14} />
                                        <strong>{rejected.length}</strong> skipped
                                    </span>
                                )}
                            </div>

                            {/* Rejected rows */}
                            {rejected.length > 0 && (
                                <div className="mt-3 max-h-32 overflow-y-auto rounded-md border border-amber-200 bg-amber-50/50 p-3 space-y-1">
                                    {rejected.map((r, i) => (
                                        <p key={i} className="text-[12px] text-amber-700 font-mono">
                                            {r.rowNumber ? `Row ${r.rowNumber}: ` : ""}
                                            {r.reason}
                                        </p>
                                    ))}
                                </div>
                            )}

                            {/* Preview table */}
                            {parsed.length > 0 && (
                                <div className="mt-4 overflow-x-auto rounded-lg border border-stone-200 max-h-72 overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead className="sticky top-0 bg-stone-100">
                                            <tr className="text-left text-[9px] uppercase tracking-[0.2em] text-stone-600">
                                                <th className="px-3 py-2 font-bold">Ref #</th>
                                                <th className="px-3 py-2 font-bold">Title</th>
                                                <th className="px-3 py-2 font-bold">Architect</th>
                                                <th className="px-3 py-2 font-bold">Year</th>
                                                <th className="px-3 py-2 font-bold">Pub.</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parsed.slice(0, 200).map((r) => (
                                                <tr key={r.id} className="border-t border-stone-100">
                                                    <td className="px-3 py-1.5 font-mono text-stone-500">{r.id}</td>
                                                    <td className="px-3 py-1.5">{String(r.data.title ?? "")}</td>
                                                    <td className="px-3 py-1.5 text-stone-600">
                                                        {String(r.data.architect ?? "—")}
                                                    </td>
                                                    <td className="px-3 py-1.5 text-stone-600">
                                                        {String(r.data.year ?? "—")}
                                                    </td>
                                                    <td className="px-3 py-1.5 text-stone-600">
                                                        {r.data.isVisible ? "Yes" : "No"}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {parsed.length > 200 && (
                                        <p className="px-3 py-2 text-[11px] text-stone-400 bg-stone-50">
                                            Showing first 200 of {parsed.length} rows…
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Result / action */}
                            {done != null ? (
                                <div className="mt-5 flex items-center gap-3">
                                    <span className="inline-flex items-center gap-2 rounded-md bg-stone-900 text-white px-4 py-2.5 text-[10px] uppercase tracking-[0.25em] font-bold">
                                        <Check size={14} /> Imported {done} models
                                    </span>
                                    <button
                                        onClick={onDone}
                                        className="text-[10px] uppercase tracking-[0.25em] font-bold text-stone-500 hover:text-stone-900 transition-colors"
                                    >
                                        View models →
                                    </button>
                                </div>
                            ) : (
                                <button
                                    disabled={parsed.length === 0 || importing}
                                    onClick={() => setShowConfirm(true)}
                                    className="mt-5 inline-flex items-center gap-2 rounded-md bg-stone-900 text-white px-5 py-2.5 text-[10px] uppercase tracking-[0.25em] font-bold hover:bg-stone-700 transition-colors disabled:opacity-40"
                                >
                                    {importing ? (
                                        <>
                                            <Loader2 size={13} className="animate-spin" /> Importing… {progress}/
                                            {parsed.length}
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={13} /> Import {parsed.length} models
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation modal */}
            {showConfirm && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowConfirm(false)} />
                    <div className="relative bg-white rounded-xl border border-stone-200 shadow-2xl p-8 max-w-sm w-full space-y-5">
                        <div className="space-y-2">
                            <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-500">Confirm import</p>
                            <h3 className="text-lg font-light">
                                Import <span className="font-medium">{parsed.length}</span> models?
                            </h3>
                            <p className="text-xs text-stone-600 leading-relaxed">
                                New Ref #s are created; existing ones are updated (photos and audio are preserved). This
                                writes to the live database.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="flex-1 py-3 rounded-md border border-stone-300 text-[10px] uppercase tracking-[0.25em] font-bold text-stone-500 hover:border-stone-900 hover:text-stone-900 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={runImport}
                                className="flex-1 py-3 rounded-md bg-stone-900 text-white text-[10px] uppercase tracking-[0.25em] font-bold hover:bg-stone-700 transition-colors"
                            >
                                Yes, import
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
