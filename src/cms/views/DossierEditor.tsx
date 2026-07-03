"use client";

import React, { useState, useEffect, useRef } from "react";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, addDoc, serverTimestamp, arrayUnion, arrayRemove, writeBatch } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { slugify } from "../components/GenericEditor";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
    DragOverlay,
    useDraggable,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { nanoid } from "nanoid";
import {
    ArrowLeft,
    Save,
    ExternalLink,
    GripVertical,
    Trash2,
    Eye,
    Type,
    AlignLeft,
    FileText,
    Image as ImageIcon,
    ChevronDown,
    ChevronUp,
    X,
    AlertTriangle,
    HelpCircle,
    Plus,
    Loader2,
    Search,
    Upload,
    Check,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DossierItemType = "heading" | "text" | "artefact" | "modelImage";

export interface DossierItem {
    id: string;
    type: DossierItemType;
    content?: string;
    artefactSlug?: string;
    artefactTitle?: string;
    artefactExcerpt?: string;
    modelId?: string;
    modelTitle?: string;
    imageUrl?: string;
    imageCaption?: string;
}

interface DossierMeta {
    title: string;
    slug: string;
    intro: string;
    isVisible: boolean;
    tags: string[];
    coverImage: string;
}

// ── AutoTextarea — grows to fit full content ──────────────────────────────────

const AutoTextarea = ({
    value,
    onChange,
    placeholder,
    className,
    minRows = 2,
}: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    className?: string;
    minRows?: number;
}) => {
    const ref = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (ref.current) {
            ref.current.style.height = "auto";
            ref.current.style.height = `${Math.max(ref.current.scrollHeight, minRows * 24)}px`;
        }
    }, [value, minRows]);

    return (
        <textarea
            ref={ref}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            rows={minRows}
            style={{ overflow: "hidden", resize: "none" }}
            className={className}
        />
    );
};

// ── Sortable item ─────────────────────────────────────────────────────────────

const SortableItem = ({
    item,
    onDelete,
    onUpdate,
    onOpenImagePicker,
    onOpenArtefactPicker,
}: {
    item: DossierItem;
    onDelete: (id: string) => void;
    onUpdate: (id: string, updated: Partial<DossierItem>) => void;
    onOpenImagePicker: (itemId: string) => void;
    onOpenArtefactPicker: (itemId: string) => void;
}) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    const [expanded, setExpanded] = useState(true);

    const typeIcon: Record<DossierItemType, React.ReactNode> = {
        heading: <Type size={11} />,
        text: <AlignLeft size={11} />,
        artefact: <FileText size={11} />,
        modelImage: <ImageIcon size={11} />,
    };

    const typeLabel: Record<DossierItemType, string> = {
        heading: "Heading",
        text: "Text",
        artefact: "Artefact",
        modelImage: "Model image",
    };

    const typeColor: Record<DossierItemType, string> = {
        heading: "bg-gray-900 text-white",
        text: "bg-gray-200 text-gray-700",
        artefact: "bg-blue-50 text-blue-700",
        modelImage: "bg-amber-50 text-amber-700",
    };

    const preview =
        item.type === "heading" || item.type === "text"
            ? item.content?.slice(0, 60) || "empty…"
            : item.type === "artefact"
              ? item.artefactTitle || item.artefactSlug || "no artefact selected"
              : `Model ${item.modelId || "—"}`;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`border border-gray-200 rounded-lg bg-white overflow-hidden cursor-grab active:cursor-grabbing ${isDragging ? "shadow-lg ring-1 ring-gray-300" : ""}`}
        >
            {/* Row header */}
            <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border-b border-gray-200">
                <span className="text-gray-300 flex-shrink-0">
                    <GripVertical size={14} />
                </span>
                <span className={`inline-flex items-center gap-1 text-[8px] uppercase tracking-[0.3em] font-bold px-2 py-0.5 rounded flex-shrink-0 ${typeColor[item.type]}`}>
                    {typeIcon[item.type]} {typeLabel[item.type]}
                </span>
                <span className="flex-1 text-[10px] text-gray-400 font-mono truncate min-w-0">{preview}</span>
                <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => setExpanded((p) => !p)} className="text-gray-300 hover:text-gray-700 transition-colors flex-shrink-0">
                    {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
                <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => onDelete(item.id)} className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
                    <Trash2 size={13} />
                </button>
            </div>

            {/* Expanded body — stop propagation so inputs/buttons don't trigger drag */}
            {expanded && (
                <div className="p-4 space-y-3" onPointerDown={(e) => e.stopPropagation()}>
                    {(item.type === "heading" || item.type === "text") && (
                        <AutoTextarea
                            value={item.content || ""}
                            onChange={(e) => onUpdate(item.id, { content: e.target.value })}
                            placeholder={item.type === "heading" ? "Section heading…" : "Body text…"}
                            minRows={item.type === "heading" ? 1 : 3}
                            className="w-full border border-gray-200 rounded-md p-3 font-mono text-sm focus:outline-none focus:border-gray-900 transition-colors"
                        />
                    )}

                    {item.type === "artefact" && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={item.artefactSlug || ""}
                                    onChange={(e) => onUpdate(item.id, { artefactSlug: e.target.value })}
                                    placeholder="Artefact slug"
                                    className="flex-1 border border-gray-200 rounded-md p-3 font-mono text-sm focus:outline-none focus:border-gray-900 transition-colors"
                                />
                                <button
                                    type="button"
                                    onClick={() => onOpenArtefactPicker(item.id)}
                                    className="flex-shrink-0 px-3 py-3 border border-gray-200 rounded-md text-[9px] uppercase tracking-[0.2em] font-bold text-gray-600 hover:border-gray-900 hover:bg-gray-900 hover:text-white transition-colors"
                                >
                                    Pick
                                </button>
                            </div>
                            <input
                                type="text"
                                value={item.artefactTitle || ""}
                                onChange={(e) => onUpdate(item.id, { artefactTitle: e.target.value })}
                                placeholder="Display title"
                                className="w-full border border-gray-200 rounded-md p-3 font-mono text-sm focus:outline-none focus:border-gray-900 transition-colors"
                            />
                            <AutoTextarea
                                value={item.artefactExcerpt || ""}
                                onChange={(e) => onUpdate(item.id, { artefactExcerpt: e.target.value })}
                                placeholder="Excerpt"
                                minRows={2}
                                className="w-full border border-gray-200 rounded-md p-3 font-mono text-sm focus:outline-none focus:border-gray-900 transition-colors"
                            />
                        </div>
                    )}

                    {item.type === "modelImage" && (
                        <div className="space-y-3">
                            {item.imageUrl ? (
                                <div className="relative group">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={item.imageUrl}
                                        alt={item.imageCaption || ""}
                                        className="w-full object-cover rounded border border-gray-200"
                                        style={{ maxHeight: 200 }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => onOpenImagePicker(item.id)}
                                        className="absolute top-2 right-2 px-2 py-1 bg-white/90 border border-gray-300 rounded text-[8px] uppercase tracking-[0.2em] font-bold text-gray-700 hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        Change
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => onOpenImagePicker(item.id)}
                                    className="w-full h-28 border border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-gray-600 hover:text-gray-600 transition-colors"
                                >
                                    <ImageIcon size={20} />
                                    <span className="text-[8px] uppercase tracking-[0.3em] font-bold">Pick model image</span>
                                </button>
                            )}
                            {item.modelId && (
                                <p className="text-[9px] font-mono text-gray-400">Model {item.modelId}{item.modelTitle ? ` — ${item.modelTitle}` : ""}</p>
                            )}
                            <input
                                type="text"
                                value={item.imageCaption || ""}
                                onChange={(e) => onUpdate(item.id, { imageCaption: e.target.value })}
                                placeholder="Caption (optional)"
                                className="w-full border border-gray-200 rounded-md p-3 font-mono text-sm focus:outline-none focus:border-gray-900 transition-colors"
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ── Palette chip — draggable ──────────────────────────────────────────────────

const PaletteChip = ({
    itemType,
    icon,
    label,
    onClick,
}: {
    itemType: DossierItemType;
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
}) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `palette-${itemType}`,
        data: { paletteType: itemType },
    });

    return (
        <button
            ref={setNodeRef}
            type="button"
            onClick={onClick}
            style={{ opacity: isDragging ? 0.4 : 1 }}
            className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-[9px] uppercase tracking-[0.2em] font-bold text-gray-600 hover:border-gray-900 hover:bg-gray-900 hover:text-white transition-colors select-none"
        >
            <span {...attributes} {...listeners} className="text-gray-300 flex-shrink-0 touch-none cursor-grab active:cursor-grabbing">
                <GripVertical size={11} />
            </span>
            {icon} {label}
        </button>
    );
};

// ── Dossier preview ───────────────────────────────────────────────────────────

const DossierPreview = ({ meta, items }: { meta: DossierMeta; items: DossierItem[] }) => (
    <div className="font-sans text-gray-900 max-w-2xl mx-auto py-16 px-8">
        {meta.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={meta.coverImage} alt={meta.title} className="w-full h-64 object-cover mb-12" />
        )}

        <div className="mb-12 border-b border-gray-300 pb-10">
            {meta.tags.length > 0 && (
                <div className="flex gap-2 mb-4 flex-wrap">
                    {meta.tags.map((t) => (
                        <span key={t} className="text-[8px] uppercase tracking-[0.4em] font-bold text-gray-500 border border-gray-400 px-2 py-1">{t}</span>
                    ))}
                </div>
            )}
            <h1 className="text-4xl font-light tracking-tight leading-[1.05] mb-6">
                {meta.title || <span className="text-gray-400">Dossier title…</span>}
            </h1>
            {meta.intro && <p className="text-base font-light text-gray-700 leading-relaxed max-w-xl">{meta.intro}</p>}
        </div>

        <div className="space-y-10">
            {items.length === 0 && (
                <p className="text-sm font-light text-gray-400 text-center py-16 border border-dashed border-gray-400">
                    Add items to begin building this dossier
                </p>
            )}

            {items.map((item) => (
                <div key={item.id}>
                    {item.type === "heading" && (
                        <h2 className="text-2xl font-light uppercase tracking-[0.1em] text-gray-900 border-b border-gray-300 pb-4">
                            {item.content || <span className="text-gray-400">Heading…</span>}
                        </h2>
                    )}
                    {item.type === "text" && (
                        <p className="text-base font-light text-gray-800 leading-relaxed whitespace-pre-wrap">
                            {item.content || <span className="text-gray-400">Text block…</span>}
                        </p>
                    )}
                    {item.type === "artefact" && (
                        <div className="border border-gray-400 p-6 hover:border-gray-900 transition-colors cursor-pointer">
                            <p className="text-[8px] uppercase tracking-[0.5em] font-bold text-gray-500 mb-3">Artefact</p>
                            <h3 className="text-xl font-light mb-2">
                                {item.artefactTitle || item.artefactSlug || <span className="text-gray-400">No artefact selected</span>}
                            </h3>
                            {item.artefactExcerpt && <p className="text-sm font-light text-gray-600 leading-relaxed mb-4">{item.artefactExcerpt}</p>}
                            {item.artefactSlug && <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-gray-600">Read artefact →</span>}
                        </div>
                    )}
                    {item.type === "modelImage" && (
                        <div className="space-y-2">
                            {item.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.imageUrl} alt={item.imageCaption || ""} className="w-full object-cover" />
                            ) : (
                                <div className="w-full h-56 bg-gray-100 border border-gray-400 flex items-center justify-center">
                                    <p className="text-[9px] uppercase tracking-[0.4em] font-bold text-gray-400">
                                        {item.modelId ? `Model ${item.modelId}` : "Image placeholder"}
                                    </p>
                                </div>
                            )}
                            {item.imageCaption && <p className="text-[11px] text-gray-500 font-light">{item.imageCaption}</p>}
                            {item.modelId && <p className="text-[9px] font-mono text-gray-400">↗ Model {item.modelId} — {item.modelTitle || ""}</p>}
                        </div>
                    )}
                </div>
            ))}
        </div>
    </div>
);

// ── ModelImagePicker — model overview grid ────────────────────────────────────

interface ModelEntry {
    id: string;
    title?: string;
    architect?: string;
    images?: string[];
}

const ModelImagePicker = ({
    onSelect,
    onClose,
}: {
    onSelect: (modelId: string, imageUrl: string, modelTitle?: string) => void;
    onClose: () => void;
}) => {
    const [models, setModels] = useState<ModelEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedModel, setSelectedModel] = useState<ModelEntry | null>(null);

    useEffect(() => {
        getDocs(collection(db, "ma_models")).then((snap) => {
            const withImages = snap.docs
                .map((d) => ({ id: d.id, ...d.data() }) as ModelEntry)
                .filter((m) => Array.isArray(m.images) && m.images!.length > 0)
                .sort((a, b) => (a.id < b.id ? -1 : 1));
            setModels(withImages);
            setLoading(false);
        });
    }, []);

    const filtered = models.filter((m) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (m.id || "").toLowerCase().includes(q) ||
            (m.title || "").toLowerCase().includes(q) ||
            (m.architect || "").toLowerCase().includes(q);
    });

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white border border-gray-200 shadow-2xl rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150 overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        {selectedModel && (
                            <button type="button" onClick={() => setSelectedModel(null)} className="text-gray-400 hover:text-gray-900 transition-colors">
                                <ArrowLeft size={14} />
                            </button>
                        )}
                        <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-gray-600">
                            {selectedModel
                                ? `${selectedModel.id}${selectedModel.title ? ` — ${selectedModel.title}` : ""}`
                                : "Pick model image"
                            }
                        </p>
                        {!selectedModel && !loading && (
                            <span className="text-[9px] font-mono text-gray-400">{models.length} models with images</span>
                        )}
                    </div>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors"><X size={16} /></button>
                </div>

                {/* Search — only in model list view */}
                {!selectedModel && (
                    <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
                        <div className="flex items-center gap-2 border border-gray-200 rounded-md px-3 py-2 focus-within:border-gray-900 transition-colors">
                            <Search size={13} className="text-gray-400 flex-shrink-0" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by number, title, architect…"
                                autoFocus
                                className="flex-1 text-sm focus:outline-none text-gray-800 placeholder:text-gray-400"
                            />
                            {search && (
                                <button type="button" onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-900"><X size={12} /></button>
                            )}
                        </div>
                    </div>
                )}

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                    {loading && (
                        <div className="flex items-center justify-center py-20">
                            <p className="text-[9px] uppercase tracking-[0.4em] font-bold text-gray-400 animate-pulse">Loading models…</p>
                        </div>
                    )}

                    {/* Model grid */}
                    {!loading && !selectedModel && (
                        filtered.length === 0
                            ? <p className="text-center text-sm text-gray-400 py-16">No models found</p>
                            : (
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-4">
                                    {filtered.map((m) => (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => setSelectedModel(m)}
                                            className="group flex flex-col text-left border border-gray-200 rounded-lg overflow-hidden hover:border-gray-900 transition-colors"
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={m.images![0]} alt={m.title || m.id} className="w-full aspect-square object-cover" />
                                            <div className="px-2 py-1.5">
                                                <p className="font-mono text-[8px] text-gray-400">{m.id}</p>
                                                <p className="text-[10px] font-light text-gray-700 truncate leading-tight">{m.title || "—"}</p>
                                                <p className="text-[9px] text-gray-400 font-mono">{m.images!.length} img</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )
                    )}

                    {/* Image grid for selected model */}
                    {!loading && selectedModel && (
                        <div className="grid grid-cols-3 gap-2 p-4">
                            {(selectedModel.images || []).map((url, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => onSelect(selectedModel.id, url, selectedModel.title)}
                                    className="aspect-square border border-gray-200 hover:border-gray-900 overflow-hidden transition-colors rounded-lg"
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={url} alt={`Image ${i + 1}`} className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ── CoverImagePicker ──────────────────────────────────────────────────────────

type CoverTab = "models" | "artefacts" | "upload";

interface ArtefactImageEntry {
    id: string;
    title?: string;
    images?: string[];
}

const CoverImagePicker = ({
    onSelect,
    onClose,
}: {
    onSelect: (url: string) => void;
    onClose: () => void;
}) => {
    const [tab, setTab] = useState<CoverTab>("models");

    // ── Models tab ──
    const [models, setModels] = useState<ModelEntry[]>([]);
    const [modelsLoading, setModelsLoading] = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [modelSearch, setModelSearch] = useState("");
    const [selectedModel, setSelectedModel] = useState<ModelEntry | null>(null);

    // ── Artefacts tab ──
    const [artefacts, setArtefacts] = useState<ArtefactImageEntry[]>([]);
    const [artefactsLoading, setArtefactsLoading] = useState(false);
    const [artefactsLoaded, setArtefactsLoaded] = useState(false);
    const [artefactSearch, setArtefactSearch] = useState("");
    const [selectedArtefact, setSelectedArtefact] = useState<ArtefactImageEntry | null>(null);

    // ── Upload tab ──
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadPreview, setUploadPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadError, setUploadError] = useState("");

    // Lazy-load on tab switch
    useEffect(() => {
        if (tab === "models" && !modelsLoaded) {
            setModelsLoading(true);
            getDocs(collection(db, "ma_models")).then((snap) => {
                const withImages = snap.docs
                    .map((d) => ({ id: d.id, ...d.data() }) as ModelEntry)
                    .filter((m) => Array.isArray(m.images) && m.images!.length > 0)
                    .sort((a, b) => (a.id < b.id ? -1 : 1));
                setModels(withImages);
                setModelsLoading(false);
                setModelsLoaded(true);
            });
        }
        if (tab === "artefacts" && !artefactsLoaded) {
            setArtefactsLoading(true);
            getDocs(collection(db, "ma_artefacts")).then((snap) => {
                const withImages = snap.docs
                    .map((d) => ({ id: d.id, ...d.data() }) as ArtefactImageEntry)
                    .filter((a) => Array.isArray(a.images) && a.images!.length > 0);
                setArtefacts(withImages);
                setArtefactsLoading(false);
                setArtefactsLoaded(true);
            });
        }
    }, [tab, modelsLoaded, artefactsLoaded]);

    const filteredModels = models.filter((m) => {
        if (!modelSearch.trim()) return true;
        const q = modelSearch.toLowerCase();
        return (m.id || "").includes(q) || (m.title || "").toLowerCase().includes(q) || (m.architect || "").toLowerCase().includes(q);
    });

    const filteredArtefacts = artefacts.filter((a) => {
        if (!artefactSearch.trim()) return true;
        const q = artefactSearch.toLowerCase();
        return (a.id || "").includes(q) || (a.title || "").toLowerCase().includes(q);
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadFile(file);
        setUploadError("");
        const reader = new FileReader();
        reader.onload = (ev) => setUploadPreview(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    const handleUpload = async () => {
        if (!uploadFile) return;
        setUploading(true);
        setUploadProgress(0);
        setUploadError("");
        try {
            const timestamp = Date.now();
            const ext = uploadFile.name.split(".").pop() || "jpg";
            const storagePath = `dossiers/covers/${timestamp}-${uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
            const storageRef = ref(storage, storagePath);
            const task = uploadBytesResumable(storageRef, uploadFile);
            await new Promise<void>((resolve, reject) => {
                task.on(
                    "state_changed",
                    (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
                    reject,
                    resolve,
                );
            });
            const downloadUrl = await getDownloadURL(task.snapshot.ref);
            onSelect(downloadUrl);
        } catch {
            setUploadError("Upload failed — please try again.");
            setUploading(false);
        }
    };

    const TABS: { id: CoverTab; label: string }[] = [
        { id: "models", label: "Model images" },
        { id: "artefacts", label: "Artefact images" },
        { id: "upload", label: "Upload new" },
    ];

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white border border-gray-200 shadow-2xl rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150 overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-4 pb-0 flex-shrink-0">
                    <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-gray-600">Cover image</p>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors"><X size={16} /></button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 px-6 pt-3 border-b border-gray-200 flex-shrink-0">
                    {TABS.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => { setSelectedModel(null); setSelectedArtefact(null); setTab(t.id); }}
                            className={`px-3 py-2 text-[10px] uppercase tracking-[0.2em] font-bold border-b-2 -mb-px transition-colors ${tab === t.id ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-800"}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">

                    {/* ── Models tab ── */}
                    {tab === "models" && (
                        <>
                            {!selectedModel && (
                                <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
                                    <div className="flex items-center gap-2 border border-gray-200 rounded-md px-3 py-2 focus-within:border-gray-900 transition-colors">
                                        <Search size={13} className="text-gray-400 flex-shrink-0" />
                                        <input autoFocus type="text" value={modelSearch} onChange={(e) => setModelSearch(e.target.value)}
                                            placeholder="Search by number, title, architect…"
                                            className="flex-1 text-sm focus:outline-none placeholder:text-gray-400" />
                                        {modelSearch && <button type="button" onClick={() => setModelSearch("")}><X size={12} className="text-gray-400" /></button>}
                                    </div>
                                </div>
                            )}
                            {modelsLoading && <p className="text-center text-[9px] uppercase tracking-[0.4em] font-bold text-gray-400 animate-pulse py-16">Loading…</p>}
                            {!modelsLoading && !selectedModel && (
                                filteredModels.length === 0
                                    ? <p className="text-center text-sm text-gray-400 py-16">No models with images</p>
                                    : <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-4">
                                        {filteredModels.map((m) => (
                                            <button key={m.id} type="button" onClick={() => setSelectedModel(m)}
                                                className="group flex flex-col text-left border border-gray-200 rounded-lg overflow-hidden hover:border-gray-900 transition-colors">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={m.images![0]} alt={m.title || m.id} className="w-full aspect-square object-cover" />
                                                <div className="px-2 py-1.5">
                                                    <p className="font-mono text-[8px] text-gray-400">{m.id}</p>
                                                    <p className="text-[10px] font-light text-gray-700 truncate">{m.title || "—"}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                            )}
                            {!modelsLoading && selectedModel && (
                                <div>
                                    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
                                        <button type="button" onClick={() => setSelectedModel(null)} className="text-gray-400 hover:text-gray-900"><ArrowLeft size={14} /></button>
                                        <p className="text-[9px] uppercase tracking-[0.4em] font-bold text-gray-600">{selectedModel.id} — {selectedModel.title}</p>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 p-4">
                                        {(selectedModel.images || []).map((url, i) => (
                                            <button key={i} type="button" onClick={() => onSelect(url)}
                                                className="aspect-square border border-gray-200 hover:border-gray-900 overflow-hidden transition-colors rounded-lg">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={url} alt="" className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* ── Artefacts tab ── */}
                    {tab === "artefacts" && (
                        <>
                            {!selectedArtefact && (
                                <div className="px-4 py-3 border-b border-gray-200">
                                    <div className="flex items-center gap-2 border border-gray-200 rounded-md px-3 py-2 focus-within:border-gray-900 transition-colors">
                                        <Search size={13} className="text-gray-400 flex-shrink-0" />
                                        <input autoFocus type="text" value={artefactSearch} onChange={(e) => setArtefactSearch(e.target.value)}
                                            placeholder="Search artefacts…"
                                            className="flex-1 text-sm focus:outline-none placeholder:text-gray-400" />
                                        {artefactSearch && <button type="button" onClick={() => setArtefactSearch("")}><X size={12} className="text-gray-400" /></button>}
                                    </div>
                                </div>
                            )}
                            {artefactsLoading && <p className="text-center text-[9px] uppercase tracking-[0.4em] font-bold text-gray-400 animate-pulse py-16">Loading…</p>}
                            {!artefactsLoading && !selectedArtefact && (
                                filteredArtefacts.length === 0
                                    ? <p className="text-center text-sm text-gray-400 py-16">No artefacts with images</p>
                                    : <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-4">
                                        {filteredArtefacts.map((a) => (
                                            <button key={a.id} type="button" onClick={() => setSelectedArtefact(a)}
                                                className="group flex flex-col text-left border border-gray-200 rounded-lg overflow-hidden hover:border-gray-900 transition-colors">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={a.images![0]} alt={a.title || a.id} className="w-full aspect-square object-cover" />
                                                <div className="px-2 py-1.5">
                                                    <p className="text-[10px] font-light text-gray-700 truncate">{a.title || a.id}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                            )}
                            {!artefactsLoading && selectedArtefact && (
                                <div>
                                    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
                                        <button type="button" onClick={() => setSelectedArtefact(null)} className="text-gray-400 hover:text-gray-900"><ArrowLeft size={14} /></button>
                                        <p className="text-[9px] uppercase tracking-[0.4em] font-bold text-gray-600">{selectedArtefact.title || selectedArtefact.id}</p>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 p-4">
                                        {(selectedArtefact.images || []).map((url, i) => (
                                            <button key={i} type="button" onClick={() => onSelect(url)}
                                                className="aspect-square border border-gray-200 hover:border-gray-900 overflow-hidden transition-colors rounded-lg">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={url} alt="" className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* ── Upload tab ── */}
                    {tab === "upload" && (
                        <div className="p-6 space-y-5">
                            <p className="text-[10px] text-gray-500 leading-relaxed">
                                Upload an image directly for this dossier. It will be stored in Firebase Storage under <span className="font-mono">dossiers/covers/</span>.
                            </p>

                            {!uploadFile ? (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full h-40 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-3 text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <Upload size={22} />
                                    <span className="text-[9px] uppercase tracking-[0.3em] font-bold">Choose image</span>
                                    <span className="text-xs text-gray-400">JPG, PNG, WebP</span>
                                </button>
                            ) : (
                                <div className="space-y-4">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    {uploadPreview && <img src={uploadPreview} alt="Preview" className="w-full max-h-48 object-cover rounded-lg border border-gray-200" />}
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-mono text-gray-500 truncate max-w-[60%]">{uploadFile.name}</p>
                                        <button type="button" onClick={() => { setUploadFile(null); setUploadPreview(null); }}
                                            className="text-[9px] uppercase tracking-[0.2em] font-bold text-gray-400 hover:text-gray-900 transition-colors">
                                            Change
                                        </button>
                                    </div>

                                    {uploading ? (
                                        <div className="space-y-2">
                                            <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-gray-900 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                            </div>
                                            <p className="text-[9px] text-gray-400 text-center">{uploadProgress}%</p>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleUpload}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 text-white text-[9px] uppercase tracking-[0.3em] font-bold rounded-md hover:bg-gray-800 transition-colors"
                                        >
                                            <Upload size={13} /> Upload &amp; set as cover
                                        </button>
                                    )}
                                    {uploadError && <p className="text-[11px] text-red-500">{uploadError}</p>}
                                </div>
                            )}

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ── ArtefactPicker modal ──────────────────────────────────────────────────────

interface ArtefactDoc {
    id: string;
    title?: string;
    slug?: string;
    excerpt?: string;
}

async function uniqueArtefactSlug(base: string): Promise<string> {
    const root = slugify(base) || "artefact";
    let candidate = root;
    let n = 2;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const snap = await getDoc(doc(db, "ma_artefacts", candidate));
        if (!snap.exists()) return candidate;
        candidate = `${root}-${n++}`;
    }
}

const ArtefactPicker = ({ onSelect, onClose }: { onSelect: (artefact: ArtefactDoc) => void; onClose: () => void }) => {
    const [tab, setTab] = useState<"existing" | "new">("existing");
    const [artefacts, setArtefacts] = useState<ArtefactDoc[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getDocs(collection(db, "ma_artefacts")).then((snap) => {
            setArtefacts(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ArtefactDoc));
            setLoading(false);
        });
    }, []);

    const filtered = artefacts.filter(
        (a) => !search ||
            (a.title || "").toLowerCase().includes(search.toLowerCase()) ||
            (a.slug || "").toLowerCase().includes(search.toLowerCase()),
    );

    const [title, setTitle] = useState("");
    const [artefactType, setArtefactType] = useState("text");
    const [author, setAuthor] = useState("");
    const [excerpt, setExcerpt] = useState("");
    const [content, setContent] = useState("");
    const [tagsInput, setTagsInput] = useState("");
    const [published, setPublished] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createArtefact = async () => {
        if (!title.trim()) { setError("A title is required."); return; }
        setSaving(true);
        setError(null);
        try {
            const slug = await uniqueArtefactSlug(title);
            const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
            const data: Record<string, unknown> = {
                title: title.trim(), slug, type: artefactType,
                publishDate: new Date().toISOString().slice(0, 10),
                isVisible: published, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
            };
            if (author.trim()) data.author = author.trim();
            if (excerpt.trim()) data.excerpt = excerpt.trim();
            if (content.trim()) data.content = content.trim();
            if (tags.length) data.tags = tags;
            await setDoc(doc(db, "ma_artefacts", slug), data);
            onSelect({ id: slug, slug, title: title.trim(), excerpt: excerpt.trim() || undefined });
        } catch (e) {
            console.error("Create artefact failed", e);
            setError("Could not create the artefact. Please try again.");
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white border border-gray-200 shadow-2xl rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
                <div className="flex items-center justify-between px-6 pt-4 flex-shrink-0">
                    <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-gray-600">Add artefact</p>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-900"><X size={16} /></button>
                </div>
                <div className="flex gap-1 px-6 pt-3 border-b border-gray-200 flex-shrink-0">
                    {(["existing", "new"] as const).map((t) => (
                        <button key={t} type="button" onClick={() => setTab(t)}
                            className={`px-3 py-2 text-[10px] uppercase tracking-[0.2em] font-bold border-b-2 -mb-px transition-colors ${tab === t ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
                            {t === "existing" ? "Pick existing" : "Create new"}
                        </button>
                    ))}
                </div>

                {tab === "existing" && (
                    <>
                        <div className="p-4 border-b border-gray-200 flex-shrink-0">
                            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by title or slug…" autoFocus
                                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-gray-700" />
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {loading ? <p className="text-center text-gray-400 text-sm py-10">Loading…</p>
                                : filtered.length === 0 ? <p className="text-center text-gray-400 text-sm py-10">No artefacts found</p>
                                : filtered.map((a) => (
                                    <button key={a.id} type="button" onClick={() => onSelect(a)}
                                        className="w-full text-left px-5 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                        <p className="text-sm font-light">{a.title || "—"}</p>
                                        <p className="text-[10px] font-mono text-gray-500">{a.slug || a.id}</p>
                                        {a.excerpt && <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{a.excerpt}</p>}
                                    </button>
                                ))
                            }
                        </div>
                    </>
                )}

                {tab === "new" && (
                    <>
                        <div className="flex-1 overflow-y-auto p-5 space-y-3">
                            <div className="space-y-1.5">
                                <label className="block text-[8px] uppercase tracking-[0.4em] font-bold text-gray-600">Type</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {(["text", "image", "audio", "video", "interview", "document"] as const).map((t) => (
                                        <button key={t} type="button" onClick={() => setArtefactType(t)}
                                            className={`px-3 py-1.5 text-[9px] uppercase tracking-[0.25em] font-bold rounded-md border transition-colors ${artefactType === t ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-500 hover:border-gray-700 hover:text-gray-800"}`}>
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[8px] uppercase tracking-[0.4em] font-bold text-gray-600">Title <span className="text-red-400">*</span></label>
                                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Artefact title…" autoFocus
                                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-gray-900" />
                                {title.trim() && <p className="text-[10px] font-mono text-gray-500">/artefacts/{slugify(title)}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[8px] uppercase tracking-[0.4em] font-bold text-gray-600">Author</label>
                                <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)}
                                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-gray-900" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[8px] uppercase tracking-[0.4em] font-bold text-gray-600">Excerpt</label>
                                <AutoTextarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Short summary…"
                                    minRows={2} className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-gray-900" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[8px] uppercase tracking-[0.4em] font-bold text-gray-600">Content</label>
                                <AutoTextarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Body…"
                                    minRows={5} className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-gray-900" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[8px] uppercase tracking-[0.4em] font-bold text-gray-600">Tags</label>
                                <input type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="Comma-separated"
                                    className="w-full border border-gray-200 rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:border-gray-900" />
                            </div>
                            <label className="flex items-center gap-2 pt-1 cursor-pointer">
                                <button type="button" onClick={() => setPublished((v) => !v)}
                                    className={`flex items-center w-10 h-6 p-1 border transition-colors ${published ? "bg-gray-900 border-gray-900 justify-end" : "bg-white border-gray-300 justify-start"}`}>
                                    <span className={`w-4 h-4 ${published ? "bg-white" : "bg-gray-400"}`} />
                                </button>
                                <span className="text-[11px] text-gray-700">Publish immediately</span>
                            </label>
                            {error && <p className="text-[12px] text-red-500">{error}</p>}
                        </div>
                        <div className="px-5 py-4 border-t border-gray-200 flex-shrink-0 flex items-center justify-end gap-3">
                            <button type="button" onClick={onClose}
                                className="text-[10px] uppercase tracking-[0.25em] font-bold text-gray-600 hover:text-gray-900 transition-colors">Cancel</button>
                            <button type="button" onClick={createArtefact} disabled={saving || !title.trim()}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-gray-900 text-white text-[10px] uppercase tracking-[0.25em] font-bold hover:bg-gray-800 transition-colors disabled:opacity-40">
                                {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                                Create &amp; add
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// ── Save confirm modal ─────────────────────────────────────────────────────────

const SaveConfirmModal = ({ title, onConfirm, onCancel, saving }: { title: string; onConfirm: () => void; onCancel: () => void; saving: boolean }) => (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
        <div className="relative bg-white border border-gray-200 shadow-2xl rounded-xl p-8 max-w-sm w-full space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Save size={14} className="text-gray-500" />
                    <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-gray-600">Confirm save</p>
                </div>
                <h3 className="text-lg font-light">Save changes to <span className="font-medium">&quot;{title}&quot;</span>?</h3>
                <p className="text-xs text-gray-600 leading-relaxed">This will overwrite the existing dossier in the database.</p>
            </div>
            <div className="flex gap-3">
                <button type="button" onClick={onCancel} disabled={saving}
                    className="flex-1 py-3 border border-gray-200 rounded-md text-[10px] uppercase tracking-[0.25em] font-bold text-gray-600 hover:border-gray-900 hover:text-gray-900 transition-colors disabled:opacity-40">
                    Go back
                </button>
                <button type="button" onClick={onConfirm} disabled={saving}
                    className="flex-1 py-3 bg-gray-900 text-white text-[10px] uppercase tracking-[0.25em] font-bold rounded-md hover:bg-gray-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                    {saving ? "Saving…" : <><Save size={12} /> Yes, save</>}
                </button>
            </div>
        </div>
    </div>
);

// ── Main component ────────────────────────────────────────────────────────────

export const DossierEditor = ({
    dossierId,
    onBack,
    onHelp,
}: {
    dossierId: string | null;
    onBack: () => void;
    onHelp?: () => void;
}) => {
    const [meta, setMeta] = useState<DossierMeta>({
        title: "", slug: "", intro: "", isVisible: false, tags: [], coverImage: "",
    });
    const [items, setItems] = useState<DossierItem[]>([]);
    const [loading, setLoading] = useState(!!dossierId);
    const [saving, setSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);
    const [showArtefactPicker, setShowArtefactPicker] = useState(false);
    const [showImagePicker, setShowImagePicker] = useState(false);
    const [showCoverPicker, setShowCoverPicker] = useState(false);
    const [tagsInput, setTagsInput] = useState("");
    const [activePanel, setActivePanel] = useState<"editor" | "preview">("editor");
    const [activeDragPaletteType, setActiveDragPaletteType] = useState<DossierItemType | null>(null);

    // Which item the open picker should update (null = add new at end)
    const pickerTarget = useRef<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    useEffect(() => {
        if (!dossierId) { setLoading(false); return; }
        getDoc(doc(db, "ma_dossiers", dossierId)).then((snap) => {
            if (snap.exists()) {
                const d = snap.data();
                const tags = Array.isArray(d.tags) ? (d.tags as string[]) : [];
                setMeta({ title: d.title || "", slug: d.slug || "", intro: d.intro || "", isVisible: d.isVisible ?? false, tags, coverImage: d.coverImage || "" });
                setTagsInput(tags.join(", "));
                setItems(Array.isArray(d.items) ? (d.items as DossierItem[]) : []);
            }
            setLoading(false);
        });
    }, [dossierId]);

    const updateMeta = (key: keyof DossierMeta, value: unknown) => {
        setMeta((prev) => ({ ...prev, [key]: value }));
        setIsDirty(true);
    };

    const localSlugify = (str: string) => str.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const handleTitleChange = (val: string) => {
        setMeta((prev) => ({ ...prev, title: val, slug: dossierId ? prev.slug : localSlugify(val) }));
        setIsDirty(true);
    };

    const addItem = (type: DossierItemType) => {
        setItems((prev) => [...prev, { id: nanoid(), type }]);
        setIsDirty(true);
    };

    const updateItem = (id: string, updated: Partial<DossierItem>) => {
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...updated } : it)));
        setIsDirty(true);
    };

    const deleteItem = (id: string) => {
        setItems((prev) => prev.filter((it) => it.id !== id));
        setIsDirty(true);
    };

    const handleDragStart = (event: DragStartEvent) => {
        const data = event.active.data.current;
        if (data?.paletteType) setActiveDragPaletteType(data.paletteType as DossierItemType);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveDragPaletteType(null);
        const { active, over } = event;
        const data = active.data.current;

        // Reorder existing items
        if (!data?.paletteType && over && active.id !== over.id) {
            setItems((prev) => {
                const oldIdx = prev.findIndex((it) => it.id === active.id);
                const newIdx = prev.findIndex((it) => it.id === over.id);
                return arrayMove(prev, oldIdx, newIdx);
            });
            setIsDirty(true);
            return;
        }

        // Insert from palette drag
        if (data?.paletteType) {
            const type = data.paletteType as DossierItemType;
            if (type === "artefact") { pickerTarget.current = null; setShowArtefactPicker(true); return; }
            if (type === "modelImage") { pickerTarget.current = null; setShowImagePicker(true); return; }
            // heading / text — insert after the drop target
            const overIdx = over ? items.findIndex((it) => it.id === over.id) : -1;
            const newItem: DossierItem = { id: nanoid(), type };
            setItems((prev) => {
                if (overIdx >= 0) {
                    const next = [...prev];
                    next.splice(overIdx + 1, 0, newItem);
                    return next;
                }
                return [...prev, newItem];
            });
            setIsDirty(true);
        }
    };

    const openImagePickerForItem = (itemId: string) => { pickerTarget.current = itemId; setShowImagePicker(true); };
    const openArtefactPickerForItem = (itemId: string) => { pickerTarget.current = itemId; setShowArtefactPicker(true); };

    const handleImageSelected = (modelId: string, imageUrl: string, modelTitle?: string) => {
        if (pickerTarget.current) {
            updateItem(pickerTarget.current, { modelId, imageUrl, modelTitle: modelTitle ?? "" });
        } else {
            setItems((prev) => [...prev, { id: nanoid(), type: "modelImage", modelId, modelTitle: modelTitle ?? "", imageUrl }]);
            setIsDirty(true);
        }
        pickerTarget.current = null;
        setShowImagePicker(false);
    };

    const handleArtefactSelected = (art: ArtefactDoc) => {
        if (pickerTarget.current) {
            updateItem(pickerTarget.current, { artefactSlug: art.slug || art.id, artefactTitle: art.title ?? "", artefactExcerpt: art.excerpt ?? "" });
        } else {
            setItems((prev) => [...prev, { id: nanoid(), type: "artefact", artefactSlug: art.slug || art.id, artefactTitle: art.title ?? "", artefactExcerpt: art.excerpt ?? "" }]);
            setIsDirty(true);
        }
        pickerTarget.current = null;
        setShowArtefactPicker(false);
    };

    const doSave = async () => {
        setSaving(true);
        try {
            const data = { ...meta, items, updatedAt: new Date() };
            const dossierSlug = dossierId || meta.slug;
            const newArtefactSlugs = items.filter((i) => i.type === "artefact" && i.artefactSlug).map((i) => i.artefactSlug as string);
            let oldArtefactSlugs: string[] = [];
            if (dossierId) {
                const oldSnap = await getDoc(doc(db, "ma_dossiers", dossierId));
                if (oldSnap.exists()) {
                    const oldItems: DossierItem[] = (oldSnap.data().items as DossierItem[]) || [];
                    oldArtefactSlugs = oldItems.filter((i) => i.type === "artefact" && i.artefactSlug).map((i) => i.artefactSlug as string);
                }
            }
            if (dossierId) {
                await updateDoc(doc(db, "ma_dossiers", dossierId), data);
            } else if (meta.slug) {
                const clash = await getDoc(doc(db, "ma_dossiers", meta.slug));
                if (clash.exists()) { setSaving(false); setShowSaveConfirm(false); alert(`A dossier with slug "${meta.slug}" already exists.`); return; }
                await setDoc(doc(db, "ma_dossiers", meta.slug), data);
            } else {
                await addDoc(collection(db, "ma_dossiers"), data);
            }
            if (dossierSlug) {
                const added = newArtefactSlugs.filter((s) => !oldArtefactSlugs.includes(s));
                const removed = oldArtefactSlugs.filter((s) => !newArtefactSlugs.includes(s));
                if (added.length > 0 || removed.length > 0) {
                    const batch = writeBatch(db);
                    for (const slug of added) batch.update(doc(db, "ma_artefacts", slug), { usedInDossiers: arrayUnion(dossierSlug) });
                    for (const slug of removed) batch.update(doc(db, "ma_artefacts", slug), { usedInDossiers: arrayRemove(dossierSlug) });
                    await batch.commit();
                }
            }
            setShowSaveConfirm(false);
            setIsDirty(false);
        } catch (e) {
            console.error("Dossier save failed", e);
            alert("Failed to save dossier. Please try again.");
            setShowSaveConfirm(false);
        }
        setSaving(false);
    };

    const handleBack = () => {
        if (isDirty && !window.confirm("You have unsaved changes. Discard and go back?")) return;
        onBack();
    };

    if (loading)
        return (
            <div className="flex-1 flex items-center justify-center bg-white">
                <p className="text-[10px] uppercase tracking-[0.5em] text-gray-400 animate-pulse">Loading dossier…</p>
            </div>
        );

    return (
        <div className="flex-1 flex flex-col bg-white min-h-0 overflow-hidden">
            {/* Modals */}
            {showSaveConfirm && (
                <SaveConfirmModal title={meta.title || "untitled"} onConfirm={doSave} onCancel={() => setShowSaveConfirm(false)} saving={saving} />
            )}
            {showArtefactPicker && (
                <ArtefactPicker onClose={() => { pickerTarget.current = null; setShowArtefactPicker(false); }} onSelect={handleArtefactSelected} />
            )}
            {showImagePicker && (
                <ModelImagePicker onClose={() => { pickerTarget.current = null; setShowImagePicker(false); }} onSelect={handleImageSelected} />
            )}
            {showCoverPicker && (
                <CoverImagePicker
                    onClose={() => setShowCoverPicker(false)}
                    onSelect={(url) => { updateMeta("coverImage", url); setShowCoverPicker(false); }}
                />
            )}

            {/* ── Top bar ── */}
            <div className="flex-shrink-0 flex items-center gap-4 px-5 h-14 border-b border-gray-200 bg-white z-10">
                <button type="button" onClick={handleBack}
                    className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] font-bold text-gray-500 hover:text-gray-900 transition-colors flex-shrink-0">
                    <ArrowLeft size={14} /> Dossiers
                </button>

                <div className="flex-1 flex items-center gap-3 min-w-0">
                    {meta.title && <span className="text-sm font-light text-gray-800 truncate">{meta.title}</span>}
                    {!meta.title && !dossierId && <span className="text-sm font-light text-gray-400">New dossier</span>}
                    {isDirty && (
                        <span className="flex items-center gap-1.5 flex-shrink-0">
                            <AlertTriangle size={11} className="text-amber-500" />
                            <span className="text-[9px] text-amber-600 font-medium uppercase tracking-wider">Unsaved</span>
                        </span>
                    )}
                    {onHelp && (
                        <button type="button" onClick={onHelp} className="text-gray-400 hover:text-gray-900 transition-colors flex-shrink-0" aria-label="Open guide">
                            <HelpCircle size={15} />
                        </button>
                    )}
                    {dossierId && meta.slug && (
                        <a href={`/dossiers/${meta.slug}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500 hover:text-gray-900 transition-colors flex-shrink-0">
                            View on site <ExternalLink size={10} />
                        </a>
                    )}
                </div>

                {/* Mobile panel toggle */}
                <div className="flex border border-gray-200 rounded-md overflow-hidden lg:hidden flex-shrink-0">
                    {(["editor", "preview"] as const).map((p) => (
                        <button key={p} type="button" onClick={() => setActivePanel(p)}
                            className={`px-3 py-1.5 text-[9px] uppercase tracking-wider font-bold transition-colors ${activePanel === p ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                            {p === "editor" ? "Editor" : "Preview"}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[8px] uppercase tracking-[0.4em] font-bold px-2.5 py-1 rounded-md border ${meta.isVisible ? "border-gray-900 text-gray-900 bg-gray-100" : "border-gray-200 text-gray-500"}`}>
                        {meta.isVisible ? "Live" : "Draft"}
                    </span>
                    <button type="button" onClick={() => setShowSaveConfirm(true)} disabled={!isDirty || saving}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-[9px] uppercase tracking-[0.3em] font-bold rounded-md hover:bg-gray-800 transition-colors disabled:opacity-40">
                        <Save size={12} /> Save
                    </button>
                </div>
            </div>

            {/* ── Body ── */}
            <div className="flex-1 flex overflow-hidden">

                {/* LEFT — Editor panel */}
                <div className={`w-full lg:w-1/2 flex-shrink-0 border-r border-gray-200 flex flex-col overflow-hidden ${activePanel === "preview" ? "hidden lg:flex" : "flex"}`}>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        {/* Single scrollable column — all metadata + items together */}
                        <div className="flex-1 overflow-y-auto">

                            {/* ── Metadata ── */}
                            <div className="p-6 space-y-5">
                                <p className="text-[8px] uppercase tracking-[0.6em] font-bold text-gray-400">Metadata</p>

                                <div className="space-y-1.5">
                                    <label className="block text-[8px] uppercase tracking-[0.4em] font-bold text-gray-500">
                                        Title <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={meta.title}
                                        onChange={(e) => handleTitleChange(e.target.value)}
                                        placeholder="Dossier title…"
                                        className="w-full border border-gray-200 rounded-md px-4 py-3 text-base font-light focus:outline-none focus:border-gray-700 transition-colors"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-[8px] uppercase tracking-[0.4em] font-bold text-gray-500">
                                        Slug <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={meta.slug}
                                        onChange={(e) => updateMeta("slug", e.target.value)}
                                        readOnly={!!dossierId}
                                        placeholder="url-friendly-slug"
                                        className={`w-full border px-4 py-3 font-mono text-sm focus:outline-none transition-colors rounded-md ${dossierId ? "bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed" : "border-gray-200 focus:border-gray-700"}`}
                                    />
                                    {dossierId && <p className="text-[10px] text-gray-400">Permanent — cannot be changed after creation.</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-[8px] uppercase tracking-[0.4em] font-bold text-gray-500">Intro</label>
                                    <AutoTextarea
                                        value={meta.intro}
                                        onChange={(e) => updateMeta("intro", e.target.value)}
                                        placeholder="1–2 sentences shown on the dossier card and at the top of the page…"
                                        minRows={3}
                                        className="w-full border border-gray-200 rounded-md px-4 py-3 text-sm font-light focus:outline-none focus:border-gray-900 transition-colors"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-[8px] uppercase tracking-[0.4em] font-bold text-gray-500">Tags</label>
                                    <input
                                        type="text"
                                        value={tagsInput}
                                        onChange={(e) => {
                                            setTagsInput(e.target.value);
                                            updateMeta("tags", e.target.value.split(",").map((s) => s.trim()).filter(Boolean));
                                        }}
                                        placeholder="e.g. Rogers, wooden models, 1990s"
                                        className="w-full border border-gray-200 rounded-md px-4 py-3 font-mono text-sm focus:outline-none focus:border-gray-900 transition-colors"
                                    />
                                </div>

                                <div className="flex gap-4 items-start">
                                    <div className="flex-1 space-y-1.5">
                                        <label className="block text-[8px] uppercase tracking-[0.4em] font-bold text-gray-500">Cover image</label>
                                        {meta.coverImage ? (
                                            <div className="relative group">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={meta.coverImage}
                                                    alt="Cover"
                                                    className="w-full h-28 object-cover rounded-md border border-gray-200"
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-md">
                                                    <button
                                                        type="button"
                                                        onPointerDown={(e) => e.stopPropagation()}
                                                        onClick={() => setShowCoverPicker(true)}
                                                        className="px-3 py-1.5 bg-white text-[8px] uppercase tracking-[0.2em] font-bold text-gray-900 rounded hover:bg-gray-100 transition-colors"
                                                    >
                                                        Change
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onPointerDown={(e) => e.stopPropagation()}
                                                        onClick={() => updateMeta("coverImage", "")}
                                                        className="px-3 py-1.5 bg-white text-[8px] uppercase tracking-[0.2em] font-bold text-red-500 rounded hover:bg-red-50 transition-colors"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onPointerDown={(e) => e.stopPropagation()}
                                                onClick={() => setShowCoverPicker(true)}
                                                className="w-full h-16 border border-dashed border-gray-200 rounded-md flex items-center justify-center gap-2 text-gray-400 hover:border-gray-500 hover:text-gray-600 transition-colors"
                                            >
                                                <ImageIcon size={14} />
                                                <span className="text-[8px] uppercase tracking-[0.3em] font-bold">Pick cover image</span>
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex-shrink-0 space-y-1.5 pt-0.5">
                                        <p className="text-[8px] uppercase tracking-[0.4em] font-bold text-gray-500">Published</p>
                                        <button
                                            type="button"
                                            onClick={() => updateMeta("isVisible", !meta.isVisible)}
                                            className={`flex items-center w-12 h-7 p-1 border rounded transition-colors ${meta.isVisible ? "bg-gray-900 border-gray-900 justify-end" : "bg-white border-gray-300 justify-start"}`}
                                        >
                                            <div className={`w-5 h-5 rounded-sm ${meta.isVisible ? "bg-white" : "bg-gray-300"}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="mx-6 border-t border-gray-100" />

                            {/* ── Items ── */}
                            <div className="px-6 pt-5 pb-2">
                                <p className="text-[8px] uppercase tracking-[0.6em] font-bold text-gray-400 mb-4">
                                    Items <span className="font-mono text-gray-300">({items.length})</span>
                                </p>

                                <SortableContext items={items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-2">
                                        {items.map((item) => (
                                            <SortableItem
                                                key={item.id}
                                                item={item}
                                                onDelete={deleteItem}
                                                onUpdate={updateItem}
                                                onOpenImagePicker={openImagePickerForItem}
                                                onOpenArtefactPicker={openArtefactPickerForItem}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>

                                {items.length === 0 && (
                                    <div className="py-12 text-center border border-dashed border-gray-200 rounded-lg">
                                        <p className="text-[9px] uppercase tracking-[0.4em] font-bold text-gray-300">No items yet</p>
                                        <p className="text-xs text-gray-300 mt-1.5">Drag chips below or click to add content</p>
                                    </div>
                                )}
                            </div>

                            {/* Spacer so last item clears the pinned palette */}
                            <div className="h-36" />
                        </div>

                        {/* ── Palette — pinned at bottom ── */}
                        <div className="flex-shrink-0 border-t border-gray-200 px-6 py-4 bg-gray-50">
                            <p className="text-[8px] uppercase tracking-[0.5em] font-bold text-gray-400 mb-3">
                                Add item — click or drag into list
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                <PaletteChip itemType="heading" icon={<Type size={12} />} label="Heading" onClick={() => addItem("heading")} />
                                <PaletteChip itemType="text" icon={<AlignLeft size={12} />} label="Text block" onClick={() => addItem("text")} />
                                <PaletteChip itemType="artefact" icon={<FileText size={12} />} label="Artefact"
                                    onClick={() => { pickerTarget.current = null; setShowArtefactPicker(true); }} />
                                <PaletteChip itemType="modelImage" icon={<ImageIcon size={12} />} label="Model image"
                                    onClick={() => { pickerTarget.current = null; setShowImagePicker(true); }} />
                            </div>
                        </div>

                        {/* Drag overlay */}
                        <DragOverlay>
                            {activeDragPaletteType && (
                                <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-900 text-white text-[9px] uppercase tracking-[0.2em] font-bold rounded-lg shadow-xl opacity-90 cursor-grabbing">
                                    {activeDragPaletteType === "heading" && <Type size={12} />}
                                    {activeDragPaletteType === "text" && <AlignLeft size={12} />}
                                    {activeDragPaletteType === "artefact" && <FileText size={12} />}
                                    {activeDragPaletteType === "modelImage" && <ImageIcon size={12} />}
                                    {activeDragPaletteType}
                                </div>
                            )}
                        </DragOverlay>
                    </DndContext>
                </div>

                {/* RIGHT — Preview panel */}
                <div className={`flex-1 overflow-y-auto bg-white ${activePanel === "editor" ? "hidden lg:block" : "block"}`}>
                    <div className="border-b border-gray-200 px-6 py-2.5 flex items-center gap-2 bg-gray-50 sticky top-0 z-10">
                        <Eye size={11} className="text-gray-400" />
                        <p className="text-[8px] uppercase tracking-[0.5em] font-bold text-gray-400">Live preview</p>
                        {meta.slug && <span className="text-[9px] font-mono text-gray-400 ml-2">/dossiers/{meta.slug}</span>}
                    </div>
                    <DossierPreview meta={meta} items={items} />
                </div>
            </div>
        </div>
    );
};
