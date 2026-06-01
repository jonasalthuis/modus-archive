"use client";

import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
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
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DossierItemType = "heading" | "text" | "artefact" | "modelImage";

export interface DossierItem {
    id: string;
    type: DossierItemType;
    // heading / text
    content?: string;
    // artefact link
    artefactSlug?: string;
    artefactTitle?: string;
    artefactExcerpt?: string;
    // model image
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

// ── Sortable item ─────────────────────────────────────────────────────────────

const SortableItem = ({
    item,
    onDelete,
    onUpdate,
}: {
    item: DossierItem;
    onDelete: (id: string) => void;
    onUpdate: (id: string, updated: Partial<DossierItem>) => void;
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
        heading: "bg-stone-900 text-white",
        text: "bg-stone-100 text-stone-600",
        artefact: "bg-blue-50 text-blue-700",
        modelImage: "bg-amber-50 text-amber-700",
    };

    const preview =
        item.type === "heading" || item.type === "text"
            ? item.content?.slice(0, 45) || "empty…"
            : item.type === "artefact"
              ? item.artefactTitle || item.artefactSlug || "no artefact selected"
              : `Model ${item.modelId || "—"}`;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`border border-stone-300 bg-white ${isDragging ? "shadow-lg ring-1 ring-stone-300" : ""}`}
        >
            {/* Row header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-stone-50 border-b border-stone-300">
                <button
                    type="button"
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing text-stone-300 hover:text-stone-500 flex-shrink-0 touch-none"
                >
                    <GripVertical size={14} />
                </button>
                <span
                    className={`inline-flex items-center gap-1 text-[8px] uppercase tracking-[0.3em] font-bold px-1.5 py-0.5 flex-shrink-0 ${typeColor[item.type]}`}
                >
                    {typeIcon[item.type]} {typeLabel[item.type]}
                </span>
                <span className="flex-1 text-[10px] text-stone-400 font-mono truncate min-w-0">{preview}</span>
                <button
                    type="button"
                    onClick={() => setExpanded((p) => !p)}
                    className="text-stone-300 hover:text-stone-600 transition-colors flex-shrink-0"
                >
                    {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
                <button
                    type="button"
                    onClick={() => onDelete(item.id)}
                    className="text-stone-300 hover:text-red-500 transition-colors flex-shrink-0"
                >
                    <Trash2 size={13} />
                </button>
            </div>

            {/* Expanded body */}
            {expanded && (
                <div className="p-3 space-y-2">
                    {(item.type === "heading" || item.type === "text") && (
                        <textarea
                            value={item.content || ""}
                            onChange={(e) => onUpdate(item.id, { content: e.target.value })}
                            rows={item.type === "heading" ? 2 : 4}
                            placeholder={item.type === "heading" ? "Section heading…" : "Body text…"}
                            className="w-full border border-stone-300 p-2 font-mono text-xs focus:outline-none focus:border-stone-600 resize-none"
                        />
                    )}

                    {item.type === "artefact" && (
                        <div className="space-y-2">
                            <input
                                type="text"
                                value={item.artefactSlug || ""}
                                onChange={(e) => onUpdate(item.id, { artefactSlug: e.target.value })}
                                placeholder="Artefact slug"
                                className="w-full border border-stone-300 p-2 font-mono text-xs focus:outline-none focus:border-stone-600"
                            />
                            <input
                                type="text"
                                value={item.artefactTitle || ""}
                                onChange={(e) => onUpdate(item.id, { artefactTitle: e.target.value })}
                                placeholder="Display title (auto-filled if picked from library)"
                                className="w-full border border-stone-300 p-2 font-mono text-xs focus:outline-none focus:border-stone-600"
                            />
                            <textarea
                                value={item.artefactExcerpt || ""}
                                onChange={(e) => onUpdate(item.id, { artefactExcerpt: e.target.value })}
                                rows={2}
                                placeholder="Excerpt (auto-filled if picked from library)"
                                className="w-full border border-stone-300 p-2 font-mono text-xs focus:outline-none focus:border-stone-600 resize-none"
                            />
                        </div>
                    )}

                    {item.type === "modelImage" && (
                        <div className="space-y-2">
                            <input
                                type="text"
                                value={item.modelId || ""}
                                onChange={(e) => onUpdate(item.id, { modelId: e.target.value })}
                                placeholder="Model ID (4-digit, e.g. 0042)"
                                className="w-full border border-stone-300 p-2 font-mono text-xs focus:outline-none focus:border-stone-600"
                            />
                            <input
                                type="text"
                                value={item.imageUrl || ""}
                                onChange={(e) => onUpdate(item.id, { imageUrl: e.target.value })}
                                placeholder="Image URL"
                                className="w-full border border-stone-300 p-2 font-mono text-xs focus:outline-none focus:border-stone-600"
                            />
                            <input
                                type="text"
                                value={item.imageCaption || ""}
                                onChange={(e) => onUpdate(item.id, { imageCaption: e.target.value })}
                                placeholder="Caption (optional)"
                                className="w-full border border-stone-300 p-2 font-mono text-xs focus:outline-none focus:border-stone-600"
                            />
                            {item.imageUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={item.imageUrl}
                                    alt={item.imageCaption || ""}
                                    className="w-full h-24 object-cover border border-stone-300"
                                />
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ── Dossier preview (right panel) ─────────────────────────────────────────────

const DossierPreview = ({ meta, items }: { meta: DossierMeta; items: DossierItem[] }) => (
    <div className="font-sans text-stone-900 max-w-2xl mx-auto py-16 px-8">
        {/* Cover image */}
        {meta.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={meta.coverImage} alt={meta.title} className="w-full h-64 object-cover mb-12" />
        )}

        {/* Header */}
        <div className="mb-12 border-b border-stone-300 pb-10">
            {meta.tags.length > 0 && (
                <div className="flex gap-2 mb-4 flex-wrap">
                    {meta.tags.map((t) => (
                        <span
                            key={t}
                            className="text-[8px] uppercase tracking-[0.4em] font-bold text-stone-400 border border-stone-300 px-2 py-1"
                        >
                            {t}
                        </span>
                    ))}
                </div>
            )}
            <h1 className="text-4xl font-light tracking-tight leading-[1.05] mb-6">
                {meta.title || <span className="text-stone-300">Dossier title…</span>}
            </h1>
            {meta.intro && <p className="text-base font-light text-stone-600 leading-relaxed max-w-xl">{meta.intro}</p>}
        </div>

        {/* Items */}
        <div className="space-y-10">
            {items.length === 0 && (
                <p className="text-sm font-light text-stone-300 text-center py-16 border border-dashed border-stone-300">
                    Add items to begin building this dossier
                </p>
            )}

            {items.map((item) => (
                <div key={item.id}>
                    {item.type === "heading" && (
                        <h2 className="text-2xl font-light uppercase tracking-[0.1em] text-stone-900 border-b border-stone-300 pb-4">
                            {item.content || <span className="text-stone-300">Heading…</span>}
                        </h2>
                    )}

                    {item.type === "text" && (
                        <p className="text-base font-light text-stone-700 leading-relaxed whitespace-pre-wrap">
                            {item.content || <span className="text-stone-300">Text block…</span>}
                        </p>
                    )}

                    {item.type === "artefact" && (
                        <div className="border border-stone-300 p-6 hover:border-stone-900 transition-colors cursor-pointer">
                            <p className="text-[8px] uppercase tracking-[0.5em] font-bold text-stone-400 mb-3">
                                Artefact
                            </p>
                            <h3 className="text-xl font-light mb-2">
                                {item.artefactTitle || item.artefactSlug || (
                                    <span className="text-stone-300">No artefact selected</span>
                                )}
                            </h3>
                            {item.artefactExcerpt && (
                                <p className="text-sm font-light text-stone-500 leading-relaxed mb-4">
                                    {item.artefactExcerpt}
                                </p>
                            )}
                            {item.artefactSlug && (
                                <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-stone-500">
                                    Read artefact →
                                </span>
                            )}
                        </div>
                    )}

                    {item.type === "modelImage" && (
                        <div className="space-y-2">
                            {item.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={item.imageUrl}
                                    alt={item.imageCaption || ""}
                                    className="w-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-56 bg-stone-50 border border-stone-300 flex items-center justify-center">
                                    <p className="text-[9px] uppercase tracking-[0.4em] font-bold text-stone-300">
                                        {item.modelId ? `Model ${item.modelId}` : "Image placeholder"}
                                    </p>
                                </div>
                            )}
                            {item.imageCaption && (
                                <p className="text-[11px] text-stone-400 font-light">{item.imageCaption}</p>
                            )}
                            {item.modelId && (
                                <p className="text-[9px] font-mono text-stone-300">
                                    ↗ Model {item.modelId} — {item.modelTitle || ""}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    </div>
);

// ── ModelImagePicker modal ─────────────────────────────────────────────────────

const ModelImagePicker = ({
    onSelect,
    onClose,
}: {
    onSelect: (modelId: string, imageUrl: string, modelTitle?: string) => void;
    onClose: () => void;
}) => {
    const [modelInput, setModelInput] = useState("");
    const [images, setImages] = useState<string[]>([]);
    const [modelTitle, setModelTitle] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const fetchImages = async () => {
        const raw = modelInput.trim();
        if (!raw) return;
        setLoading(true);
        setError("");
        setImages([]);
        setModelTitle("");
        try {
            const padded = raw.padStart(4, "0");
            const snap = await getDoc(doc(db, "ma_models", padded));
            if (!snap.exists()) {
                setError(`Model "${padded}" not found`);
            } else {
                const data = snap.data();
                setModelTitle(data.title || "");
                const imgs = Array.isArray(data.images) ? (data.images as string[]) : [];
                setImages(imgs);
                if (imgs.length === 0) setError("No images uploaded for this model yet");
            }
        } catch {
            setError("Failed to fetch model — check console");
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white border border-stone-300 shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between px-6 py-4 border-b border-stone-300 flex-shrink-0">
                    <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-500">Pick model image</p>
                    <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-900">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-5 border-b border-stone-300 flex gap-2 flex-shrink-0">
                    <input
                        type="text"
                        value={modelInput}
                        onChange={(e) => setModelInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && fetchImages()}
                        placeholder="Model number (e.g. 42 or 0042)"
                        className="flex-1 border border-stone-300 px-3 py-2 font-mono text-sm focus:outline-none focus:border-stone-600"
                        autoFocus
                    />
                    <button
                        type="button"
                        onClick={fetchImages}
                        disabled={loading || !modelInput.trim()}
                        className="px-4 py-2 bg-stone-900 text-white text-[9px] uppercase tracking-[0.3em] font-bold disabled:opacity-40 hover:bg-stone-700 transition-colors"
                    >
                        {loading ? "…" : "Load"}
                    </button>
                </div>

                {modelTitle && (
                    <div className="px-5 py-2 bg-stone-50 border-b border-stone-300 flex-shrink-0">
                        <p className="text-xs text-stone-600 font-light">{modelTitle}</p>
                    </div>
                )}

                {error && <p className="px-5 py-3 text-xs text-red-500 flex-shrink-0">{error}</p>}

                {images.length > 0 && (
                    <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 gap-2">
                        {images.map((url, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => onSelect(modelInput.trim().padStart(4, "0"), url, modelTitle)}
                                className="aspect-square border border-stone-300 hover:border-stone-900 overflow-hidden transition-colors group"
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={url}
                                    alt={`Image ${i + 1}`}
                                    className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                                />
                            </button>
                        ))}
                    </div>
                )}
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

const ArtefactPicker = ({ onSelect, onClose }: { onSelect: (artefact: ArtefactDoc) => void; onClose: () => void }) => {
    const [artefacts, setArtefacts] = useState<ArtefactDoc[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getDocs(collection(db, "ma_articles")).then((snap) => {
            setArtefacts(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ArtefactDoc));
            setLoading(false);
        });
    }, []);

    const filtered = artefacts.filter(
        (a) =>
            !search ||
            (a.title || "").toLowerCase().includes(search.toLowerCase()) ||
            (a.slug || "").toLowerCase().includes(search.toLowerCase()),
    );

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white border border-stone-300 shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between px-6 py-4 border-b border-stone-300 flex-shrink-0">
                    <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-500">Pick artefact</p>
                    <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-900">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-4 border-b border-stone-300 flex-shrink-0">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by title or slug…"
                        className="w-full border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:border-stone-600"
                        autoFocus
                    />
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <p className="text-center text-stone-300 text-sm py-10">Loading artefacts…</p>
                    ) : filtered.length === 0 ? (
                        <p className="text-center text-stone-300 text-sm py-10">No artefacts found</p>
                    ) : (
                        filtered.map((a) => (
                            <button
                                key={a.id}
                                type="button"
                                onClick={() => onSelect(a)}
                                className="w-full text-left px-5 py-4 border-b border-stone-300 hover:bg-stone-50 transition-colors"
                            >
                                <p className="text-sm font-light">{a.title || "—"}</p>
                                <p className="text-[10px] font-mono text-stone-400">{a.slug || a.id}</p>
                                {a.excerpt && (
                                    <p className="text-[11px] text-stone-400 mt-1 line-clamp-2">{a.excerpt}</p>
                                )}
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

// ── Save confirm modal ─────────────────────────────────────────────────────────

const SaveConfirmModal = ({
    title,
    onConfirm,
    onCancel,
    saving,
}: {
    title: string;
    onConfirm: () => void;
    onCancel: () => void;
    saving: boolean;
}) => (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
        <div className="relative bg-white border border-stone-300 shadow-2xl p-8 max-w-sm w-full space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Save size={14} className="text-stone-400" />
                    <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-500">Confirm save</p>
                </div>
                <h3 className="text-lg font-light">
                    Save changes to <span className="font-medium">&quot;{title}&quot;</span>?
                </h3>
                <p className="text-xs text-stone-500 leading-relaxed">
                    This will overwrite the existing dossier in the database.
                </p>
            </div>
            <div className="flex gap-3">
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
        title: "",
        slug: "",
        intro: "",
        isVisible: false,
        tags: [],
        coverImage: "",
    });
    const [items, setItems] = useState<DossierItem[]>([]);
    const [loading, setLoading] = useState(!!dossierId);
    const [saving, setSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);
    const [showArtefactPicker, setShowArtefactPicker] = useState(false);
    const [showImagePicker, setShowImagePicker] = useState(false);
    const [tagsInput, setTagsInput] = useState("");
    const [activePanel, setActivePanel] = useState<"editor" | "preview">("editor");

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    // Load existing dossier
    useEffect(() => {
        if (!dossierId) {
            setLoading(false);
            return;
        }
        getDoc(doc(db, "ma_dossiers", dossierId)).then((snap) => {
            if (snap.exists()) {
                const d = snap.data();
                const tags = Array.isArray(d.tags) ? (d.tags as string[]) : [];
                setMeta({
                    title: d.title || "",
                    slug: d.slug || "",
                    intro: d.intro || "",
                    isVisible: d.isVisible ?? false,
                    tags,
                    coverImage: d.coverImage || "",
                });
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

    const slugify = (str: string) =>
        str
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");

    const handleTitleChange = (val: string) => {
        setMeta((prev) => ({
            ...prev,
            title: val,
            // Auto-fill slug for new dossiers
            slug: dossierId ? prev.slug : slugify(val),
        }));
        setIsDirty(true);
    };

    // Items
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

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setItems((prev) => {
                const oldIdx = prev.findIndex((it) => it.id === active.id);
                const newIdx = prev.findIndex((it) => it.id === over.id);
                return arrayMove(prev, oldIdx, newIdx);
            });
            setIsDirty(true);
        }
    };

    // Save
    const doSave = async () => {
        setSaving(true);
        try {
            const data = {
                ...meta,
                items,
                updatedAt: new Date(),
            };
            if (dossierId) {
                await updateDoc(doc(db, "ma_dossiers", dossierId), data);
            } else if (meta.slug) {
                // Guard against overwriting an existing dossier with the same slug
                const clash = await getDoc(doc(db, "ma_dossiers", meta.slug));
                if (clash.exists()) {
                    setSaving(false);
                    setShowSaveConfirm(false);
                    alert(`A dossier with the slug "${meta.slug}" already exists. Please choose a different slug.`);
                    return;
                }
                await setDoc(doc(db, "ma_dossiers", meta.slug), data);
            } else {
                await addDoc(collection(db, "ma_dossiers"), data);
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

    // ── Render ───────────────────────────────────────────────────────────────

    if (loading)
        return (
            <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
                <p className="text-[10px] uppercase tracking-[0.5em] text-stone-300 animate-pulse">Loading dossier…</p>
            </div>
        );

    return (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
            {/* Modals */}
            {showSaveConfirm && (
                <SaveConfirmModal
                    title={meta.title || "untitled"}
                    onConfirm={doSave}
                    onCancel={() => setShowSaveConfirm(false)}
                    saving={saving}
                />
            )}
            {showArtefactPicker && (
                <ArtefactPicker
                    onClose={() => setShowArtefactPicker(false)}
                    onSelect={(art) => {
                        setItems((prev) => [
                            ...prev,
                            {
                                id: nanoid(),
                                type: "artefact",
                                artefactSlug: art.slug || art.id,
                                artefactTitle: art.title,
                                artefactExcerpt: art.excerpt,
                            },
                        ]);
                        setIsDirty(true);
                        setShowArtefactPicker(false);
                    }}
                />
            )}
            {showImagePicker && (
                <ModelImagePicker
                    onClose={() => setShowImagePicker(false)}
                    onSelect={(modelId, imageUrl, modelTitle) => {
                        setItems((prev) => [
                            ...prev,
                            {
                                id: nanoid(),
                                type: "modelImage",
                                modelId,
                                modelTitle,
                                imageUrl,
                            },
                        ]);
                        setIsDirty(true);
                        setShowImagePicker(false);
                    }}
                />
            )}

            {/* ── Top bar ── */}
            <div className="flex-shrink-0 flex items-center gap-4 px-5 h-14 border-b border-stone-300 bg-white z-10">
                <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] font-bold text-stone-500 hover:text-stone-900 transition-colors flex-shrink-0"
                >
                    <ArrowLeft size={14} />
                    Dossiers
                </button>

                <div className="flex-1 flex items-center gap-3 min-w-0">
                    {meta.title && <span className="text-sm font-light text-stone-700 truncate">{meta.title}</span>}
                    {!meta.title && !dossierId && (
                        <span className="text-sm font-light text-stone-300">New dossier</span>
                    )}
                    {isDirty && (
                        <span className="flex items-center gap-1.5 flex-shrink-0">
                            <AlertTriangle size={11} className="text-amber-500" />
                            <span className="text-[9px] text-amber-600 font-medium uppercase tracking-wider">
                                Unsaved
                            </span>
                        </span>
                    )}
                    {onHelp && (
                        <button
                            type="button"
                            onClick={onHelp}
                            title="How to use dossiers →"
                            className="text-stone-300 hover:text-stone-900 transition-colors flex-shrink-0"
                            aria-label="Open guide"
                        >
                            <HelpCircle size={15} />
                        </button>
                    )}
                </div>

                {/* Mobile panel toggle */}
                <div className="flex border border-stone-300 lg:hidden flex-shrink-0">
                    <button
                        type="button"
                        onClick={() => setActivePanel("editor")}
                        className={`px-3 py-1.5 text-[9px] uppercase tracking-wider font-bold transition-colors ${activePanel === "editor" ? "bg-stone-900 text-white" : "text-stone-500 hover:bg-stone-50"}`}
                    >
                        Editor
                    </button>
                    <button
                        type="button"
                        onClick={() => setActivePanel("preview")}
                        className={`px-3 py-1.5 text-[9px] uppercase tracking-wider font-bold transition-colors ${activePanel === "preview" ? "bg-stone-900 text-white" : "text-stone-500 hover:bg-stone-50"}`}
                    >
                        Preview
                    </button>
                </div>

                {/* Status + save */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                        className={`text-[8px] uppercase tracking-[0.4em] font-bold px-2 py-1 border ${meta.isVisible ? "border-stone-900 text-stone-900 bg-stone-50" : "border-stone-300 text-stone-300"}`}
                    >
                        {meta.isVisible ? "Live" : "Draft"}
                    </span>
                    <button
                        type="button"
                        onClick={() => setShowSaveConfirm(true)}
                        disabled={!isDirty || saving}
                        className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white text-[9px] uppercase tracking-[0.3em] font-bold hover:bg-stone-700 transition-colors disabled:opacity-40"
                    >
                        <Save size={12} />
                        Save
                    </button>
                </div>
            </div>

            {/* ── Body: editor | preview ── */}
            <div className="flex-1 flex overflow-hidden">
                {/* LEFT — Editor panel */}
                <div
                    className={`w-full lg:w-[460px] flex-shrink-0 border-r border-stone-300 flex flex-col overflow-hidden ${activePanel === "preview" ? "hidden lg:flex" : "flex"}`}
                >
                    {/* Metadata fields */}
                    <div
                        className="flex-shrink-0 border-b border-stone-300 overflow-y-auto"
                        style={{ maxHeight: "52%" }}
                    >
                        <div className="p-5 space-y-4">
                            <p className="text-[8px] uppercase tracking-[0.6em] font-bold text-stone-400">Metadata</p>

                            {/* Title */}
                            <div className="space-y-1.5">
                                <label className="block text-[8px] uppercase tracking-[0.4em] font-bold text-stone-400">
                                    Title <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={meta.title}
                                    onChange={(e) => handleTitleChange(e.target.value)}
                                    placeholder="Dossier title…"
                                    className="w-full border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:border-stone-600 transition-colors"
                                />
                            </div>

                            {/* Slug */}
                            <div className="space-y-1.5">
                                <label className="block text-[8px] uppercase tracking-[0.4em] font-bold text-stone-400">
                                    Slug <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={meta.slug}
                                    onChange={(e) => updateMeta("slug", e.target.value)}
                                    readOnly={!!dossierId}
                                    placeholder="url-friendly-slug"
                                    className={`w-full border px-3 py-2 font-mono text-sm focus:outline-none transition-colors ${
                                        dossierId
                                            ? "bg-stone-100 border-stone-200 text-stone-500 cursor-not-allowed"
                                            : "border-stone-300 focus:border-stone-600"
                                    }`}
                                />
                                <p className="text-[10px] text-stone-400">
                                    {dossierId
                                        ? "Permanent — the URL cannot be changed after creation."
                                        : "Auto-generated from the title. Edit to customise the URL."}
                                </p>
                            </div>

                            {/* Intro */}
                            <div className="space-y-1.5">
                                <label className="block text-[8px] uppercase tracking-[0.4em] font-bold text-stone-400">
                                    Intro
                                </label>
                                <textarea
                                    value={meta.intro}
                                    onChange={(e) => updateMeta("intro", e.target.value)}
                                    rows={3}
                                    placeholder="Short introduction to this dossier…"
                                    className="w-full border border-stone-300 px-3 py-2 text-sm font-light focus:outline-none focus:border-stone-600 transition-colors resize-none"
                                />
                            </div>

                            {/* Tags */}
                            <div className="space-y-1.5">
                                <label className="block text-[8px] uppercase tracking-[0.4em] font-bold text-stone-400">
                                    Tags
                                </label>
                                <input
                                    type="text"
                                    value={tagsInput}
                                    onChange={(e) => {
                                        setTagsInput(e.target.value);
                                        updateMeta(
                                            "tags",
                                            e.target.value
                                                .split(",")
                                                .map((s) => s.trim())
                                                .filter(Boolean),
                                        );
                                    }}
                                    placeholder="Comma-separated (e.g. housing, Rogers, 1990s)"
                                    className="w-full border border-stone-300 px-3 py-2 font-mono text-sm focus:outline-none focus:border-stone-600 transition-colors"
                                />
                            </div>

                            {/* Cover + published row */}
                            <div className="flex gap-3 items-end">
                                <div className="flex-1 space-y-1.5">
                                    <label className="block text-[8px] uppercase tracking-[0.4em] font-bold text-stone-400">
                                        Cover image URL
                                    </label>
                                    <input
                                        type="text"
                                        value={meta.coverImage}
                                        onChange={(e) => updateMeta("coverImage", e.target.value)}
                                        placeholder="https://…"
                                        className="w-full border border-stone-300 px-3 py-2 font-mono text-xs focus:outline-none focus:border-stone-600 transition-colors"
                                    />
                                </div>
                                <div className="space-y-1.5 flex-shrink-0">
                                    <label className="block text-[8px] uppercase tracking-[0.4em] font-bold text-stone-400">
                                        Published
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => updateMeta("isVisible", !meta.isVisible)}
                                        className={`flex items-center w-12 h-7 p-1 border transition-colors ${meta.isVisible ? "bg-stone-900 border-stone-900 justify-end" : "bg-white border-stone-300 justify-start"}`}
                                    >
                                        <div className={`w-5 h-5 ${meta.isVisible ? "bg-white" : "bg-stone-300"}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items list */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-[8px] uppercase tracking-[0.6em] font-bold text-stone-400">
                                Items <span className="text-stone-300 font-mono">({items.length})</span>
                            </p>
                        </div>

                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
                                <div className="space-y-2">
                                    {items.map((item) => (
                                        <SortableItem
                                            key={item.id}
                                            item={item}
                                            onDelete={deleteItem}
                                            onUpdate={updateItem}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>

                        {items.length === 0 && (
                            <div className="py-10 text-center border border-dashed border-stone-300 mt-2">
                                <p className="text-[9px] uppercase tracking-[0.4em] font-bold text-stone-300">
                                    No items yet
                                </p>
                                <p className="text-xs text-stone-300 mt-1.5">Use the buttons below to add content</p>
                            </div>
                        )}
                    </div>

                    {/* Add item footer */}
                    <div className="flex-shrink-0 border-t border-stone-300 p-4 bg-stone-50">
                        <p className="text-[8px] uppercase tracking-[0.5em] font-bold text-stone-400 mb-3">Add item</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => addItem("heading")}
                                className="flex items-center gap-2 px-3 py-2.5 border border-stone-300 bg-white text-[9px] uppercase tracking-[0.2em] font-bold text-stone-600 hover:border-stone-900 hover:bg-white transition-colors"
                            >
                                <Type size={12} /> Heading
                            </button>
                            <button
                                type="button"
                                onClick={() => addItem("text")}
                                className="flex items-center gap-2 px-3 py-2.5 border border-stone-300 bg-white text-[9px] uppercase tracking-[0.2em] font-bold text-stone-600 hover:border-stone-900 hover:bg-white transition-colors"
                            >
                                <AlignLeft size={12} /> Text block
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowArtefactPicker(true)}
                                className="flex items-center gap-2 px-3 py-2.5 border border-stone-300 bg-white text-[9px] uppercase tracking-[0.2em] font-bold text-stone-600 hover:border-stone-900 hover:bg-white transition-colors"
                            >
                                <FileText size={12} /> Artefact
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowImagePicker(true)}
                                className="flex items-center gap-2 px-3 py-2.5 border border-stone-300 bg-white text-[9px] uppercase tracking-[0.2em] font-bold text-stone-600 hover:border-stone-900 hover:bg-white transition-colors"
                            >
                                <ImageIcon size={12} /> Model image
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT — Preview panel */}
                <div
                    className={`flex-1 overflow-y-auto bg-white ${activePanel === "editor" ? "hidden lg:block" : "block"}`}
                >
                    <div className="border-b border-stone-300 px-6 py-2.5 flex items-center gap-2 bg-stone-50 sticky top-0 z-10">
                        <Eye size={11} className="text-stone-400" />
                        <p className="text-[8px] uppercase tracking-[0.5em] font-bold text-stone-400">Live preview</p>
                        {meta.slug && (
                            <span className="text-[9px] font-mono text-stone-300 ml-2">/dossiers/{meta.slug}</span>
                        )}
                    </div>
                    <DossierPreview meta={meta} items={items} />
                </div>
            </div>
        </div>
    );
};
