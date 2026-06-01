"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    flexRender,
    type ColumnDef,
    type SortingState,
    type ColumnResizeMode,
    type VisibilityState,
    type PaginationState,
} from "@tanstack/react-table";
import {
    ChevronUp,
    ChevronDown,
    ChevronsUpDown,
    SlidersHorizontal,
    ChevronLeft,
    ChevronRight,
    Search,
} from "lucide-react";

// Smart page number range — shows first, current ±1, last, with "…" gaps
function pageRange(current: number, total: number): (number | "ellipsis")[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i);
    const result: (number | "ellipsis")[] = [0];
    if (current > 2) result.push("ellipsis");
    const start = Math.max(1, current - 1);
    const end = Math.min(total - 2, current + 1);
    for (let i = start; i <= end; i++) result.push(i);
    if (current < total - 3) result.push("ellipsis");
    if (total > 1) result.push(total - 1);
    return result;
}

export function DataTable<T extends Record<string, unknown>>({
    data,
    columns,
    initialColumnVisibility = {},
    onRowClick,
    loading = false,
    defaultPageSize = 25,
}: {
    data: T[];
    columns: ColumnDef<T, unknown>[];
    initialColumnVisibility?: VisibilityState;
    onRowClick?: (row: T) => void;
    loading?: boolean;
    defaultPageSize?: number;
}) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(initialColumnVisibility);
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: defaultPageSize });
    const [globalFilter, setGlobalFilter] = useState("");
    const [showColumnPicker, setShowColumnPicker] = useState(false);
    const columnPickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (columnPickerRef.current && !columnPickerRef.current.contains(e.target as Node)) {
                setShowColumnPicker(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const table = useReactTable({
        data,
        columns,
        columnResizeMode: "onChange" as ColumnResizeMode,
        state: { sorting, columnVisibility, pagination, globalFilter },
        onSortingChange: setSorting,
        onColumnVisibilityChange: setColumnVisibility,
        onPaginationChange: setPagination,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        defaultColumn: { minSize: 50, size: 150, maxSize: 700 },
    });

    const pages = pageRange(table.getState().pagination.pageIndex, table.getPageCount());

    const filteredCount = table.getFilteredRowModel().rows.length;
    const { pageIndex, pageSize } = table.getState().pagination;
    const rangeStart = pageIndex * pageSize + 1;
    const rangeEnd = Math.min((pageIndex + 1) * pageSize, filteredCount);

    return (
        <div className="space-y-3">
            {/* ── Toolbar ── */}
            <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="relative flex-1 min-w-[180px] max-w-sm">
                    <Search
                        size={11}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
                    />
                    <input
                        type="text"
                        value={globalFilter}
                        onChange={(e) => {
                            setGlobalFilter(e.target.value);
                            table.setPageIndex(0);
                        }}
                        placeholder="Search all columns…"
                        className="w-full pl-8 pr-4 py-2 border border-stone-300 focus:border-black outline-none text-[10px] tracking-wide transition-colors bg-white"
                    />
                </div>

                {/* Column visibility picker */}
                <div className="relative" ref={columnPickerRef}>
                    <button
                        onClick={() => setShowColumnPicker((v) => !v)}
                        className={`flex items-center gap-2 border px-3 py-2 text-[9px] uppercase tracking-[0.25em] font-bold transition-all select-none ${
                            showColumnPicker
                                ? "border-stone-900 text-stone-900 bg-stone-50"
                                : "border-stone-300 text-stone-600 hover:border-stone-900 hover:text-stone-900"
                        }`}
                    >
                        <SlidersHorizontal size={11} />
                        Columns
                        <span className="font-mono text-[9px] text-stone-500">
                            {table.getVisibleLeafColumns().length}/{table.getAllLeafColumns().length}
                        </span>
                    </button>

                    {showColumnPicker && (
                        <div className="absolute top-full left-0 mt-1 w-60 bg-white border border-stone-300 shadow-2xl z-30 flex flex-col max-h-96">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-300 flex-shrink-0">
                                <p className="text-[8px] uppercase tracking-[0.5em] font-bold text-stone-600">
                                    Visible columns
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => table.toggleAllColumnsVisible(true)}
                                        className="text-[8px] uppercase tracking-[0.2em] font-bold text-stone-400 hover:text-stone-900 transition-colors"
                                    >
                                        Show all
                                    </button>
                                    <button
                                        onClick={() => {
                                            table.getAllLeafColumns().forEach((col, i) => {
                                                if (i > 0) col.toggleVisibility(false);
                                            });
                                        }}
                                        className="text-[8px] uppercase tracking-[0.2em] font-bold text-stone-400 hover:text-stone-900 transition-colors"
                                    >
                                        Min
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-y-auto flex-1">
                                {table.getAllLeafColumns().map((col) => (
                                    <label
                                        key={col.id}
                                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 cursor-pointer select-none"
                                    >
                                        {/* Custom checkbox */}
                                        <span
                                            className={`w-3.5 h-3.5 border flex-shrink-0 flex items-center justify-center transition-colors ${
                                                col.getIsVisible()
                                                    ? "bg-stone-900 border-stone-900"
                                                    : "border-stone-300"
                                            }`}
                                        >
                                            {col.getIsVisible() && (
                                                <svg width="8" height="7" viewBox="0 0 8 7" fill="none">
                                                    <path
                                                        d="M1 3.5l2 2 4-4"
                                                        stroke="white"
                                                        strokeWidth="1.5"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                </svg>
                                            )}
                                        </span>
                                        <input
                                            type="checkbox"
                                            checked={col.getIsVisible()}
                                            onChange={col.getToggleVisibilityHandler()}
                                            className="hidden"
                                        />
                                        <span className="text-[11px] text-stone-600 font-medium truncate">
                                            {typeof col.columnDef.header === "string" ? col.columnDef.header : col.id}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Page size */}
                <div className="flex items-center gap-1">
                    <span className="text-[8px] uppercase tracking-[0.35em] font-bold text-stone-500 mr-1.5">
                        Per page
                    </span>
                    {[25, 50, 100].map((n) => (
                        <button
                            key={n}
                            onClick={() => {
                                table.setPageSize(n);
                                table.setPageIndex(0);
                            }}
                            className={`w-9 h-8 text-[10px] font-mono border transition-all ${
                                pageSize === n
                                    ? "bg-stone-900 text-white border-stone-900"
                                    : "border-stone-300 text-stone-600 hover:border-stone-900 hover:text-stone-900"
                            }`}
                        >
                            {n}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Table ── */}
            <div className="overflow-x-auto bg-white rounded-xl border border-stone-200 shadow-sm relative">
                {loading ? (
                    <div className="py-20 text-center">
                        <p className="text-[9px] uppercase tracking-[0.5em] text-stone-400 animate-pulse">
                            Loading records…
                        </p>
                    </div>
                ) : data.length === 0 ? (
                    <div className="py-20 text-center border-2 border-dashed border-stone-300 m-4">
                        <p className="text-[9px] uppercase tracking-[0.4em] text-stone-400">No records found</p>
                    </div>
                ) : (
                    <table style={{ width: table.getTotalSize() }} className="border-collapse text-sm">
                        <thead>
                            {table.getHeaderGroups().map((hg) => (
                                <tr key={hg.id} className="border-b-2 border-stone-300 bg-stone-100">
                                    {hg.headers.map((header) => (
                                        <th
                                            key={header.id}
                                            style={{ width: header.getSize() }}
                                            className="relative text-left border-r border-stone-300 last:border-r-0"
                                        >
                                            <div
                                                className={`flex items-center gap-1 px-3 py-3 text-[9px] uppercase tracking-[0.3em] font-bold text-stone-600 select-none whitespace-nowrap overflow-hidden ${
                                                    header.column.getCanSort()
                                                        ? "cursor-pointer hover:text-stone-900 hover:bg-stone-100 transition-colors"
                                                        : ""
                                                }`}
                                                onClick={header.column.getToggleSortingHandler()}
                                            >
                                                <span className="truncate">
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                </span>
                                                {header.column.getCanSort() && (
                                                    <span className="flex-shrink-0">
                                                        {header.column.getIsSorted() === "asc" ? (
                                                            <ChevronUp size={9} className="text-stone-900" />
                                                        ) : header.column.getIsSorted() === "desc" ? (
                                                            <ChevronDown size={9} className="text-stone-900" />
                                                        ) : (
                                                            <ChevronsUpDown size={9} className="text-stone-400" />
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                            {/* Drag-to-resize handle */}
                                            {header.column.getCanResize() && (
                                                <div
                                                    onMouseDown={header.getResizeHandler()}
                                                    onTouchStart={header.getResizeHandler()}
                                                    className={`absolute right-0 top-0 bottom-0 w-[4px] cursor-col-resize select-none touch-none transition-colors z-10 ${
                                                        header.column.getIsResizing()
                                                            ? "bg-stone-900"
                                                            : "hover:bg-stone-400 bg-transparent"
                                                    }`}
                                                />
                                            )}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {table.getRowModel().rows.map((row) => (
                                <tr
                                    key={row.id}
                                    onClick={() => onRowClick?.(row.original)}
                                    className={`border-b border-stone-300 transition-colors ${
                                        onRowClick ? "cursor-pointer hover:bg-stone-50 group" : ""
                                    }`}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td
                                            key={cell.id}
                                            style={{ width: cell.column.getSize() }}
                                            className="border-r border-stone-300 last:border-r-0 align-middle overflow-hidden"
                                        >
                                            <div className="px-3 py-2.5 overflow-hidden">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Pagination ── */}
            {!loading && table.getPageCount() > 1 && (
                <div className="flex items-center justify-between pt-1">
                    <span className="text-[9px] font-mono text-stone-500">
                        {rangeStart}–{rangeEnd} of {filteredCount}
                        {filteredCount !== data.length && ` (filtered from ${data.length})`}
                    </span>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => table.setPageIndex(0)}
                            disabled={!table.getCanPreviousPage()}
                            className="px-2 py-1.5 border border-stone-300 text-stone-600 hover:border-stone-900 hover:text-stone-900 disabled:opacity-25 transition-all text-[9px] font-mono"
                        >
                            «
                        </button>
                        <button
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                            className="p-1.5 border border-stone-300 text-stone-600 hover:border-stone-900 hover:text-stone-900 disabled:opacity-25 transition-all"
                        >
                            <ChevronLeft size={13} />
                        </button>

                        {pages.map((p, i) =>
                            p === "ellipsis" ? (
                                <span key={`e${i}`} className="px-1.5 text-stone-400 text-[10px] font-mono select-none">
                                    …
                                </span>
                            ) : (
                                <button
                                    key={p}
                                    onClick={() => table.setPageIndex(p as number)}
                                    className={`min-w-[30px] h-8 px-2 text-[10px] font-mono border transition-all ${
                                        pageIndex === p
                                            ? "bg-stone-900 text-white border-stone-900"
                                            : "border-stone-300 text-stone-500 hover:border-stone-900 hover:text-stone-900"
                                    }`}
                                >
                                    {(p as number) + 1}
                                </button>
                            ),
                        )}

                        <button
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                            className="p-1.5 border border-stone-300 text-stone-600 hover:border-stone-900 hover:text-stone-900 disabled:opacity-25 transition-all"
                        >
                            <ChevronRight size={13} />
                        </button>
                        <button
                            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                            disabled={!table.getCanNextPage()}
                            className="px-2 py-1.5 border border-stone-300 text-stone-600 hover:border-stone-900 hover:text-stone-900 disabled:opacity-25 transition-all text-[9px] font-mono"
                        >
                            »
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
