"use client";

import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, addDoc, serverTimestamp, arrayUnion, arrayRemove, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { slugify } from "../components/GenericEditor";
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
        heading: "bg-gray-900 text-white",
        text: "bg-gray-200 text-gray-700",
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
            className={`border border-gray-300 rounded-md bg-white overflow-hidden ${isDragging ? "shadow-lg ring-1 ring-gray-300" : ""}`}
        >
            {/* Row header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 border-b border-gray-300">
                <button
                    type="button"
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 flex-shrink-0 touch-none"
                >
                    <GripVertical size={14} />
                </button>
                <span
                    className={`inline-flex items-center gap-1 text-[8px] uppercase tracking-[0.3em] font-bold px-1.5 py-0.5 flex-shrink-0 ${typeColor[item.type]}`}
                >
                    {typeIcon[item.type]} {typeLabel[item.type]}
                </span>
                <span className="flex-1 text-[10px] text-gray-500 font-mono truncate min-w-0">{preview}</span>
                <button
                    type="button"
                    onClick={() => setExpanded((p) => !p)}
                    className="text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
                >
                    {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
                <button
                    type="button"
                    onClick={() => onDelete(item.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
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
                            className="w-full border border-gray-300 rounded-md p-2 font-mono text-xs focus:outline-none focus:border-gray-900 resize-none"
                        />
                    )}

                    {item.type === "artefact" && (
                        <div className="space-y-2">
                            <input
                                type="text"
                                value={item.artefactSlug || ""}
                                onChange={(e) => onUpdate(item.id, { artefactSlug: e.target.value })}
                                placeholder="Artefact slug"
                                className="w-full border border-gray-300 rounded-md p-2 font-mono text-xs focus:outline-none focus:border-gray-900"
                            />
                            <input
                                type="text"
                                value={item.artefactTitle || ""}
                                onChange={(e) => onUpdate(item.id, { artefactTitle: e.target.value })}
                                placeholder="Display title (auto-filled if picked from library)"
                                className="w-full border border-gray-300 rounded-md p-2 font-mono text-xs focus:outline-none focus:border-gray-900"
                            />
                            <textarea
                                value={item.artefactExcerpt || ""}
                                onChange={(e) => onUpdate(item.id, { artefactExcerpt: e.target.value })}
                                rows={2}
                                placeholder="Excerpt (auto-filled if picked from library)"
                                className="w-full border border-gray-300 rounded-md p-2 font-mono text-xs focus:outline-none focus:border-gray-900 resize-none"
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
                                className="w-full border border-gray-300 rounded-md p-2 font-mono text-xs focus:outline-none focus:border-gray-900"
                            />
                            <input
                                type="text"
                                value={item.imageUrl || ""}
                                onChange={(e) => onUpdate(item.id, { imageUrl: e.target.value })}
                                placeholder="Image URL"
                                className="w-full border border-gray-300 rounded-md p-2 font-mono text-xs focus:outline-none focus:border-gray-900"
                            />
                            <input
                                type="text"
                                value={item.imageCaption || ""}
                                onChange={(e) => onUpdate(item.id, { imageCaption: e.target.value })}
                                placeholder="Caption (optional)"
                                className="w-full border border-gray-300 rounded-md p-2 font-mono text-xs focus:outline-none focus:border-gray-900"
                            />
                            {item.imageUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={item.imageUrl}
                                    alt={item.imageCaption || ""}
                                    className="w-full h-24 object-cover border border-gray-400"
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
    <div className="font-sans text-gray-900 max-w-2xl mx-auto py-16 px-8">
        {/* Cover image */}
        {meta.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={meta.coverImage} alt={meta.title} className="w-full h-64 object-cover mb-12" />
        )}

        {/* Header */}
        <div className="mb-12 border-b border-gray-300 pb-10">
            {meta.tags.length > 0 && (
                <div className="flex gap-2 mb-4 flex-wrap">
                    {meta.tags.map((t) => (
                        <span
                            key={t}
                            className="text-[8px] uppercase tracking-[0.4em] font-bold text-gray-500 border border-gray-400 px-2 py-1"
                        >
                            {t}
                        </span>
                    ))}
                </div>
            )}
            <h1 className="text-4xl font-light tracking-tight leading-[1.05] mb-6">
                {meta.title || <span className="text-gray-400">Dossier title…</span>}
            </h1>
            {meta.intro && <p className="text-base font-light text-gray-700 leading-relaxed max-w-xl">{meta.intro}</p>}
        </div>

        {/* Items */}
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
                            <p className="text-[8px] uppercase tracking-[0.5em] font-bold text-gray-500 mb-3">
                                Artefact
                            </p>
                            <h3 className="text-xl font-light mb-2">
                                {item.artefactTitle || item.artefactSlug || (
                                    <span className="text-gray-400">No artefact selected</span>
                                )}
                            </h3>
                            {item.artefactExcerpt && (
                                <p className="text-sm font-light text-gray-600 leading-relaxed mb-4">
                                    {item.artefactExcerpt}
                                </p>
                            )}
                            {item.artefactSlug && (
                                <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-gray-600">
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
                                <div className="w-full h-56 bg-gray-100 border border-gray-400 flex items-center justify-center">
                                    <p className="text-[9px] uppercase tracking-[0.4em] font-bold text-gray-400">
                                        {item.modelId ? `Model ${item.modelId}` : "Image placeholder"}
                                    </p>
                                </div>
                            )}
                            {item.imageCaption && (
                                <p className="text-[11px] text-gray-500 font-light">{item.imageCaption}</p>
                            )}
                            {item.modelId && (
                                <p className="text-[9px] font-mono text-gray-400">
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
            <div className="relative bg-white border border-gray-300 shadow-2xl rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-300 flex-shrink-0">
                    <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-gray-600">Pick model image</p>
                    <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-900">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-5 border-b border-gray-300 flex gap-2 flex-shrink-0">
                    <input
                        type="text"
                        value={modelInput}
                        onChange={(e) => setModelInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && fetchImages()}
                        placeholder="Model number (e.g. 42 or 0042)"
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:border-gray-900"
                        autoFocus
                    />
                    <button
                        type="button"
                        onClick={fetchImages}
                        disabled={loading || !modelInput.trim()}
                        className="px-4 py-2 bg-gray-900 text-white text-[9px] uppercase tracking-[0.3em] font-bold rounded-md disabled:opacity-40 hover:bg-gray-800 transition-colors"
                    >
                        {loading ? "…" : "Load"}
                    </button>
                </div>

                {modelTitle && (
                    <div className="px-5 py-2 bg-gray-100 border-b border-gray-300 flex-shrink-0">
                        <p className="text-xs text-gray-700 font-light">{modelTitle}</p>
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
                                className="aspect-square border border-gray-400 hover:border-gray-900 overflow-hidden transition-colors group"
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

// Find a free slug in ma_artefacts, appending -2, -3… if needed
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

    // ── Existing tab ──
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
        (a) =>
            !search ||
            (a.title || "").toLowerCase().includes(search.toLowerCase()) ||
            (a.slug || "").toLowerCase().includes(search.toLowerCase()),
    );

    // ── New tab ──
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
        if (!title.trim()) {
            setError("A title is required.");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const slug = await uniqueArtefactSlug(title);
            const tags = tagsInput
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean);
            // Firestore rejects `undefined` — only include fields that have a value
            const data: Record<string, unknown> = {
                title: title.trim(),
                slug,
                type: artefactType,
                publishDate: new Date().toISOString().slice(0, 10),
                isVisible: published,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };
            if (author.trim()) data.author = author.trim();
            if (excerpt.trim()) data.excerpt = excerpt.trim();
            if (content.trim()) data.content = content.trim();
            if (tags.length) data.tags = tags;
            // Write the new artefact into the artefacts collection
            await setDoc(doc(db, "ma_artefacts", slug), data);
            // Insert it into the dossier
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
            <div className="relative bg-white border border-gray-300 shadow-2xl rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
                {/* Header + tabs */}
                <div className="flex items-center justify-between px-6 pt-4 flex-shrink-0">
                    <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-gray-600">Add artefact</p>
                    <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-900">
                        <X size={16} />
                    </button>
                </div>
                <div className="flex gap-1 px-6 pt-3 border-b border-gray-300 flex-shrink-0">
                    {(["existing", "new"] as const).map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setTab(t)}
                            className={`px-3 py-2 text-[10px] uppercase tracking-[0.2em] font-bold border-b-2 -mb-px transition-colors ${
                                tab === t
                                    ? "border-gray-900 text-gray-900"
                                    : "border-transparent text-gray-500 hover:text-gray-800"
                            }`}
                        >
                            {t === "existing" ? "Pick existing" : "Create new"}
                        </button>
                    ))}
                </div>

                {/* Existing */}
                {tab === "existing" && (
                    <>
                        <div className="p-4 border-b border-gray-300 flex-shrink-0">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by title or slug…"
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-gray-700"
                                autoFocus
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <p className="text-center text-gray-400 text-sm py-10">Loading artefacts…</p>
                            ) : filtered.length === 0 ? (
                                <p className="text-center text-gray-400 text-sm py-10">No artefacts found</p>
                            ) : (
                                filtered.map((a) => (
                                    <button
                                        key={a.id}
                                        type="button"
                                        onClick={() => onSelect(a)}
                                        className="w-full text-left px-5 py-4 border-b border-gray-300 hover:bg-gray-100 transition-colors"
                                    >
                                        <p className="text-sm font-light">{a.title || "—"}</p>
                                        <p className="text-[10px] font-mono text-gray-500">{a.slug || a.id}</p>
                                        {a.excerpt && (
                                            <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{a.excerpt}</p>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </>
                )}

                {/* New */}
                {tab === "new" && (
                    <>
                        <div className="flex-1 overflow-y-auto p-5 space-y-3">
                            {/* Type */}
                            <div className="space-y-1.5">
                                <label className="block text-[8px] uppercase tracking-[0.4em] font-bold text-gray-600">
                                    Type
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    {(["text", "image", "audio", "video", "interview", "document"] as const).map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setArtefactType(t)}
                                            className={`px-3 py-1.5 text-[9px] uppercase tracking-[0.25em] font-bold rounded-md border transition-colors ${
                                                artefactType === t
                                                    ? "bg-gray-900 text-white border-gray-900"
                                                    : "border-gray-300 text-gray-500 hover:border-gray-700 hover:text-gray-800"
                                            }`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-[8px] uppercase tracking-[0.4em] font-bold text-gray-600">
                                    Title <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Artefact title…"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-gray-900"
                                    autoFocus
                                />
                                {title.trim() && (
                                    <p className="text-[10px] font-mono text-gray-500">
                                        /artefacts/{slugify(title)}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[8px] uppercase tracking-[0.4em] font-bold text-gray-600">
                                    Author
                                </label>
                                <input
                                    type="text"
                                    value={author}
                                    onChange={(e) => setAuthor(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-gray-900"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[8px] uppercase tracking-[0.4em] font-bold text-gray-600">
                                    Excerpt
                                </label>
                                <textarea
                                    value={excerpt}
                                    onChange={(e) => setExcerpt(e.target.value)}
                                    rows={2}
                                    placeholder="Short summary (shown on the dossier card)…"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-gray-900 resize-none"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[8px] uppercase tracking-[0.4em] font-bold text-gray-600">
                                    Content
                                </label>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    rows={6}
                                    placeholder="The artefact body (paragraphs separated by blank lines)…"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-gray-900 resize-none"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[8px] uppercase tracking-[0.4em] font-bold text-gray-600">
                                    Tags
                                </label>
                                <input
                                    type="text"
                                    value={tagsInput}
                                    onChange={(e) => setTagsInput(e.target.value)}
                                    placeholder="Comma-separated"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:border-gray-900"
                                />
                            </div>
                            <label className="flex items-center gap-2 pt-1 cursor-pointer">
                                <button
                                    type="button"
                                    onClick={() => setPublished((v) => !v)}
                                    className={`flex items-center w-10 h-6 p-1 border transition-colors ${published ? "bg-gray-900 border-gray-900 justify-end" : "bg-white border-gray-400 justify-start"}`}
                                >
                                    <span className={`w-4 h-4 ${published ? "bg-white" : "bg-gray-400"}`} />
                                </button>
                                <span className="text-[11px] text-gray-700">
                                    Publish immediately (visible on the public site)
                                </span>
                            </label>
                            {error && <p className="text-[12px] text-red-500">{error}</p>}
                        </div>
                        <div className="px-5 py-4 border-t border-gray-300 flex-shrink-0 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="text-[10px] uppercase tracking-[0.25em] font-bold text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={createArtefact}
                                disabled={saving || !title.trim()}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-gray-900 text-white text-[10px] uppercase tracking-[0.25em] font-bold hover:bg-gray-800 transition-colors disabled:opacity-40"
                            >
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
        <div className="relative bg-white border border-gray-300 shadow-2xl rounded-xl p-8 max-w-sm w-full space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Save size={14} className="text-gray-500" />
                    <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-gray-600">Confirm save</p>
                </div>
                <h3 className="text-lg font-light">
                    Save changes to <span className="font-medium">&quot;{title}&quot;</span>?
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                    This will overwrite the existing dossier in the database.
                </p>
            </div>
            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={saving}
                    className="flex-1 py-3 border border-gray-300 rounded-md text-[10px] uppercase tracking-[0.25em] font-bold text-gray-600 hover:border-gray-900 hover:text-gray-900 transition-colors disabled:opacity-40"
                >
                    Go back
                </button>
                <button
                    type="button"
                    onClick={onConfirm}
                    disabled={saving}
                    className="flex-1 py-3 bg-gray-900 text-white text-[10px] uppercase tracking-[0.25em] font-bold rounded-md hover:bg-gray-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
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
    const [metaCollapsed, setMetaCollapsed] = useState(false);

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

            // The slug we'll use to identify this dossier in artefact back-links
            const dossierSlug = dossierId || meta.slug;

            // Collect artefact slugs before and after so we can sync usedInDossiers
            const newArtefactSlugs = items
                .filter((i) => i.type === "artefact" && i.artefactSlug)
                .map((i) => i.artefactSlug as string);

            let oldArtefactSlugs: string[] = [];
            if (dossierId) {
                const oldSnap = await getDoc(doc(db, "ma_dossiers", dossierId));
                if (oldSnap.exists()) {
                    const oldItems: DossierItem[] = (oldSnap.data().items as DossierItem[]) || [];
                    oldArtefactSlugs = oldItems
                        .filter((i) => i.type === "artefact" && i.artefactSlug)
                        .map((i) => i.artefactSlug as string);
                }
            }

            // Save the dossier
            if (dossierId) {
                await updateDoc(doc(db, "ma_dossiers", dossierId), data);
            } else if (meta.slug) {
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

            // Sync usedInDossiers on artefacts — batch write, max 500 ops per batch
            if (dossierSlug) {
                const added = newArtefactSlugs.filter((s) => !oldArtefactSlugs.includes(s));
                const removed = oldArtefactSlugs.filter((s) => !newArtefactSlugs.includes(s));
                if (added.length > 0 || removed.length > 0) {
                    const batch = writeBatch(db);
                    for (const slug of added) {
                        batch.update(doc(db, "ma_artefacts", slug), { usedInDossiers: arrayUnion(dossierSlug) });
                    }
                    for (const slug of removed) {
                        batch.update(doc(db, "ma_artefacts", slug), { usedInDossiers: arrayRemove(dossierSlug) });
                    }
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

    // ── Render ───────────────────────────────────────────────────────────────

    if (loading)
        return (
            <div className="flex-1 flex items-center justify-center bg-white">
                <p className="text-[10px] uppercase tracking-[0.5em] text-gray-400 animate-pulse">Loading dossier…</p>
            </div>
        );

    return (
        <div className="flex-1 flex flex-col bg-white min-h-0 overflow-hidden shadow-[-2px_0_16px_rgba(0,0,0,0.06)]">
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
                                artefactTitle: art.title ?? "",
                                artefactExcerpt: art.excerpt ?? "",
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
            <div className="flex-shrink-0 flex items-center gap-4 px-5 h-14 border-b border-gray-300 bg-white z-10">
                <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] font-bold text-gray-600 hover:text-gray-900 transition-colors flex-shrink-0"
                >
                    <ArrowLeft size={14} />
                    Dossiers
                </button>

                <div className="flex-1 flex items-center gap-3 min-w-0">
                    {meta.title && <span className="text-sm font-light text-gray-800 truncate">{meta.title}</span>}
                    {!meta.title && !dossierId && (
                        <span className="text-sm font-light text-gray-400">New dossier</span>
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
                            className="text-gray-400 hover:text-gray-900 transition-colors flex-shrink-0"
                            aria-label="Open guide"
                        >
                            <HelpCircle size={15} />
                        </button>
                    )}
                    {dossierId && meta.slug && (
                        <a
                            href={`/dossiers/${meta.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500 hover:text-gray-900 transition-colors flex-shrink-0"
                        >
                            View on site <ExternalLink size={10} />
                        </a>
                    )}
                </div>

                {/* Mobile panel toggle */}
                <div className="flex border border-gray-300 rounded-md overflow-hidden lg:hidden flex-shrink-0">
                    <button
                        type="button"
                        onClick={() => setActivePanel("editor")}
                        className={`px-3 py-1.5 text-[9px] uppercase tracking-wider font-bold transition-colors ${activePanel === "editor" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                    >
                        Editor
                    </button>
                    <button
                        type="button"
                        onClick={() => setActivePanel("preview")}
                        className={`px-3 py-1.5 text-[9px] uppercase tracking-wider font-bold transition-colors ${activePanel === "preview" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                    >
                        Preview
                    </button>
                </div>

                {/* Status + save */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                        className={`text-[8px] uppercase tracking-[0.4em] font-bold px-2.5 py-1 rounded-md border ${meta.isVisible ? "border-gray-900 text-gray-900 bg-gray-100" : "border-gray-300 text-gray-500"}`}
                    >
                        {meta.isVisible ? "Live" : "Draft"}
                    </span>
                    <button
                        type="button"
                        onClick={() => setShowSaveConfirm(true)}
                        disabled={!isDirty || saving}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-[9px] uppercase tracking-[0.3em] font-bold rounded-md hover:bg-gray-800 transition-colors disabled:opacity-40"
                    >
                        <Save size={12} />
                        Save
                    </button>
                </div>
            </div>

            {/* ── Body: editor | preview ── */}
            <div className="flex-1 flex overflow-hidden">
                {/* LEFT — Editor panel (50%) */}
                <div
                    className={`w-full lg:w-1/2 flex-shrink-0 border-r border-gray-300 flex flex-col overflow-hidden ${activePanel === "preview" ? "hidden lg:flex" : "flex"}`}
                >
                    {/* ── Metadata — collapsible ── */}
                    <div className="flex-shrink-0 border-b border-gray-300">
                        {/* Collapse toggle bar */}
                        <button
                            type="button"
                            onClick={() => setMetaCollapsed((v) => !v)}
                            className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-100 transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-[8px] uppercase tracking-[0.6em] font-bold text-gray-500">Metadata</span>
                                {meta.title && (
                                    <span className="text-[10px] text-gray-500 font-light truncate max-w-[180px]">{meta.title}</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {/* Published pill */}
                                <span className={`text-[8px] uppercase tracking-[0.3em] font-bold px-2 py-0.5 rounded ${meta.isVisible ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-500"}`}>
                                    {meta.isVisible ? "Live" : "Draft"}
                                </span>
                                {metaCollapsed
                                    ? <ChevronDown size={13} className="text-gray-400 group-hover:text-gray-700 transition-colors" />
                                    : <ChevronUp size={13} className="text-gray-400 group-hover:text-gray-700 transition-colors" />
                                }
                            </div>
                        </button>

                        {/* Collapsible fields */}
                        {!metaCollapsed && (
                            <div className="overflow-y-auto border-t border-gray-200" style={{ maxHeight: "52vh" }}>
                                <div className="p-5 space-y-4">
                                    {/* Title */}
                                    <div className="space-y-1.5">
                                        <label className="block text-[8px] uppercase tracking-[0.4em] font-bold text-gray-500">
                                            Title <span className="text-red-400">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={meta.title}
                                            onChange={(e) => handleTitleChange(e.target.value)}
                                            placeholder="Dossier title…"
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-gray-700 transition-colors"
                                        />
                                        <p className="text-[10px] text-gray-500 leading-relaxed">
                                            The public-facing title shown on the dossiers overview and at the top of this page.
                                        </p>
                                    </div>

                                    {/* Slug */}
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
                                            className={`w-full border px-3 py-2 font-mono text-sm focus:outline-none transition-colors rounded-md ${
                                                dossierId
                                                    ? "bg-gray-200 border-gray-300 text-gray-600 cursor-not-allowed"
                                                    : "border-gray-400 focus:border-gray-700"
                                            }`}
                                        />
                                        <p className="text-[10px] text-gray-500 leading-relaxed">
                                            {dossierId
                                                ? "Permanent — the URL cannot be changed after creation. Changing it would break any existing links."
                                                : "Auto-generated from the title. Used in the public URL: /dossiers/your-slug. Edit before saving if needed."}
                                        </p>
                                    </div>

                                    {/* Intro */}
                                    <div className="space-y-1.5">
                                        <label className="block text-[8px] uppercase tracking-[0.4em] font-bold text-gray-500">
                                            Intro
                                        </label>
                                        <textarea
                                            value={meta.intro}
                                            onChange={(e) => updateMeta("intro", e.target.value)}
                                            rows={3}
                                            placeholder="Short introduction to this dossier…"
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-light focus:outline-none focus:border-gray-900 transition-colors resize-none"
                                        />
                                        <p className="text-[10px] text-gray-500 leading-relaxed">
                                            1–2 sentences shown on the dossiers overview card and at the top of the dossier page. Keep it concise — it&apos;s a teaser, not a summary.
                                        </p>
                                    </div>

                                    {/* Tags */}
                                    <div className="space-y-1.5">
                                        <label className="block text-[8px] uppercase tracking-[0.4em] font-bold text-gray-500">
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
                                            placeholder="e.g. Rogers, wooden models, 1990s"
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:border-gray-900 transition-colors"
                                        />
                                        <p className="text-[10px] text-gray-500 leading-relaxed">
                                            Comma-separated keywords. Used for filtering and displayed as small badges on the dossier card.
                                        </p>
                                    </div>

                                    {/* Cover image + Published row */}
                                    <div className="flex gap-4 items-start">
                                        <div className="flex-1 space-y-1.5">
                                            <label className="block text-[8px] uppercase tracking-[0.4em] font-bold text-gray-500">
                                                Cover image URL
                                            </label>
                                            <input
                                                type="text"
                                                value={meta.coverImage}
                                                onChange={(e) => updateMeta("coverImage", e.target.value)}
                                                placeholder="https://…"
                                                className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-xs focus:outline-none focus:border-gray-900 transition-colors"
                                            />
                                        </div>
                                        <div className="flex-shrink-0 space-y-1.5 pt-0.5">
                                            <p className="text-[8px] uppercase tracking-[0.4em] font-bold text-gray-500">Published</p>
                                            <button
                                                type="button"
                                                onClick={() => updateMeta("isVisible", !meta.isVisible)}
                                                className={`flex items-center w-12 h-7 p-1 border rounded transition-colors ${meta.isVisible ? "bg-gray-900 border-gray-900 justify-end" : "bg-white border-gray-400 justify-start"}`}
                                            >
                                                <div className={`w-5 h-5 rounded-sm ${meta.isVisible ? "bg-white" : "bg-gray-400"}`} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Items list */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-[8px] uppercase tracking-[0.6em] font-bold text-gray-500">
                                Items <span className="text-gray-400 font-mono">({items.length})</span>
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
                            <div className="py-10 text-center border border-dashed border-gray-300 rounded-md mt-2">
                                <p className="text-[9px] uppercase tracking-[0.4em] font-bold text-gray-400">
                                    No items yet
                                </p>
                                <p className="text-xs text-gray-400 mt-1.5">Use the buttons below to add content</p>
                            </div>
                        )}
                    </div>

                    {/* Add item footer */}
                    <div className="flex-shrink-0 border-t border-gray-300 p-4 bg-gray-100">
                        <p className="text-[8px] uppercase tracking-[0.5em] font-bold text-gray-500 mb-3">Add item</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => addItem("heading")}
                                className="flex items-center gap-2 px-3 py-2.5 border border-gray-300 rounded-md bg-white text-[9px] uppercase tracking-[0.2em] font-bold text-gray-700 hover:border-gray-900 hover:bg-white transition-colors"
                            >
                                <Type size={12} /> Heading
                            </button>
                            <button
                                type="button"
                                onClick={() => addItem("text")}
                                className="flex items-center gap-2 px-3 py-2.5 border border-gray-300 rounded-md bg-white text-[9px] uppercase tracking-[0.2em] font-bold text-gray-700 hover:border-gray-900 hover:bg-white transition-colors"
                            >
                                <AlignLeft size={12} /> Text block
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowArtefactPicker(true)}
                                className="flex items-center gap-2 px-3 py-2.5 border border-gray-300 rounded-md bg-white text-[9px] uppercase tracking-[0.2em] font-bold text-gray-700 hover:border-gray-900 hover:bg-white transition-colors"
                            >
                                <FileText size={12} /> Artefact
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowImagePicker(true)}
                                className="flex items-center gap-2 px-3 py-2.5 border border-gray-300 rounded-md bg-white text-[9px] uppercase tracking-[0.2em] font-bold text-gray-700 hover:border-gray-900 hover:bg-white transition-colors"
                            >
                                <ImageIcon size={12} /> Model image
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT — Preview panel (50%) */}
                <div
                    className={`flex-1 overflow-y-auto bg-white ${activePanel === "editor" ? "hidden lg:block" : "block"}`}
                >
                    <div className="border-b border-gray-300 px-6 py-2.5 flex items-center gap-2 bg-gray-100 sticky top-0 z-10">
                        <Eye size={11} className="text-gray-500" />
                        <p className="text-[8px] uppercase tracking-[0.5em] font-bold text-gray-500">Live preview</p>
                        {meta.slug && (
                            <span className="text-[9px] font-mono text-gray-400 ml-2">/dossiers/{meta.slug}</span>
                        )}
                    </div>
                    <DossierPreview meta={meta} items={items} />
                </div>
            </div>
        </div>
    );
};
