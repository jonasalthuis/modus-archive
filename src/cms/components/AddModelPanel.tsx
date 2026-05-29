"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { Upload, Star, X, Check, Loader2, ImageIcon, Plus, AlertCircle } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PendingImage {
    id: string;
    file: File;
    preview: string;
    url?: string;
    uploading: boolean;
    progress: number;
    error?: string;
    isStarred: boolean;
    importance: 1 | 2 | 3;
}

interface ModelForm {
    modelNumber: string;
    title: string;
    architect: string;
    year: string;
    scale: string;
    modelType: string;
    buildingStatus: string;
    buildingType: string;
    location: string;
    leadMaker: string;
    notes: string;
    inPrototype: boolean;
    isVisible: boolean;
}

const MODEL_TYPES = ['presentation','study','competition','urban','structural','detail','section','interior','fragment'];
const BUILDING_STATUSES = ['built','unbuilt','competition','demolished','unknown'];

const EMPTY_FORM: ModelForm = {
    modelNumber: '', title: '', architect: '', year: '', scale: '',
    modelType: '', buildingStatus: '', buildingType: '', location: '',
    leadMaker: '', notes: '', inPrototype: false, isVisible: false,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const Label = ({ children }: { children: React.ReactNode }) => (
    <p className="text-[9px] uppercase tracking-[0.35em] font-bold text-stone-400 mb-1.5">{children}</p>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className="w-full border border-stone-200 focus:border-black outline-none px-3 py-2.5 text-sm font-light transition-colors bg-white" />
);

const Select = ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) => (
    <select {...props} className="w-full border border-stone-200 focus:border-black outline-none px-3 py-2.5 text-sm font-light transition-colors bg-white appearance-none cursor-pointer">
        {children}
    </select>
);

// ─── Component ────────────────────────────────────────────────────────────────

export const AddModelPanel = ({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) => {
    const [form, setForm] = useState<ModelForm>(EMPTY_FORM);
    const [images, setImages] = useState<PendingImage[]>([]);
    const [saving, setSaving] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Keep a ref to images so the modelNumber effect can read current state
    const imagesRef = useRef<PendingImage[]>([]);
    useEffect(() => { imagesRef.current = images; }, [images]);

    // ── Upload a single image ──
    const uploadImage = useCallback((img: PendingImage, modelNum: string) => {
        const path = `models/images/${modelNum}/${Date.now()}-${img.file.name.replace(/\s+/g, '_')}`;
        const storageRef = ref(storage, path);
        const task = uploadBytesResumable(storageRef, img.file);

        task.on(
            'state_changed',
            snap => {
                const progress = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
                setImages(prev => prev.map(i => i.id === img.id ? { ...i, uploading: true, progress } : i));
            },
            err => {
                setImages(prev => prev.map(i => i.id === img.id ? { ...i, uploading: false, error: err.message } : i));
            },
            async () => {
                const url = await getDownloadURL(task.snapshot.ref);
                setImages(prev => prev.map(i => i.id === img.id ? { ...i, url, uploading: false, progress: 100 } : i));
            }
        );
    }, []);

    // ── When model number becomes non-empty, upload any queued images ──
    useEffect(() => {
        const mn = form.modelNumber.trim();
        if (!mn) return;
        const queued = imagesRef.current.filter(i => !i.url && !i.uploading && !i.error);
        queued.forEach(img => uploadImage(img, mn));
    }, [form.modelNumber, uploadImage]);

    // ── Add files (from drop or picker) ──
    const addFiles = useCallback((files: File[]) => {
        const valid = files.filter(f => f.type.startsWith('image/'));
        if (!valid.length) return;

        const newImages: PendingImage[] = valid.map((file, i) => ({
            id: `${Date.now()}-${i}-${Math.random()}`,
            file,
            preview: URL.createObjectURL(file),
            uploading: false,
            progress: 0,
            isStarred: false,
            importance: 2 as const,
        }));

        setImages(prev => {
            const merged = [...prev, ...newImages];
            // Auto-star the first image if nothing is starred yet
            if (!prev.some(i => i.isStarred) && newImages.length > 0) {
                merged[prev.length] = { ...merged[prev.length], isStarred: true };
            }
            return merged;
        });

        const mn = form.modelNumber.trim();
        if (mn) newImages.forEach(img => uploadImage(img, mn));
    }, [form.modelNumber, uploadImage]);

    // ── Drag-and-drop handlers ──
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        addFiles(Array.from(e.dataTransfer.files));
    };

    // ── Image controls ──
    const setStarred = (id: string) => setImages(prev => prev.map(img => ({ ...img, isStarred: img.id === id })));

    const cycleImportance = (id: string) => setImages(prev =>
        prev.map(img => img.id === id ? { ...img, importance: ((img.importance % 3) + 1) as 1|2|3 } : img)
    );

    const removeImage = (id: string) => setImages(prev => {
        const next = prev.filter(img => img.id !== id);
        if (!next.some(img => img.isStarred) && next.length > 0) {
            next[0] = { ...next[0], isStarred: true };
        }
        return next;
    });

    // ── Submit ──
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError(null);

        if (!form.modelNumber.trim()) { setSubmitError('Model number is required.'); return; }
        if (!form.title.trim()) { setSubmitError('Project title is required.'); return; }

        const uploading = images.filter(i => i.uploading);
        if (uploading.length) { setSubmitError(`Still uploading ${uploading.length} image(s) — please wait.`); return; }

        const failed = images.filter(i => i.error);
        if (failed.length) { setSubmitError(`${failed.length} image(s) failed to upload. Remove them and try again.`); return; }

        setSaving(true);
        try {
            const imageData = images.filter(i => i.url).map(i => ({
                url: i.url!,
                importance: i.importance,
                isStarred: i.isStarred,
            }));

            // Build doc — omit falsy/null values for clean Firestore docs
            const raw: Record<string, unknown> = {
                modelNumber: form.modelNumber.trim(),
                title: form.title.trim(),
                architect: form.architect.trim() || null,
                year: form.year ? parseInt(form.year) : null,
                scale: form.scale.trim() || null,
                modelType: form.modelType || null,
                buildingStatus: form.buildingStatus || null,
                buildingType: form.buildingType.trim() || null,
                location: form.location.trim() || null,
                leadMaker: form.leadMaker.trim() || null,
                notes: form.notes.trim() || null,
                inPrototype: form.inPrototype,
                isVisible: form.isVisible,
                images: imageData,
                updatedAt: new Date(),
            };
            const cleaned = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== null));

            await setDoc(doc(db, 'ma_models', form.modelNumber.trim()), cleaned);
            onSave();
        } catch (err) {
            console.error(err);
            setSubmitError('Failed to save. Please try again.');
        }
        setSaving(false);
    };

    const uploadedCount = images.filter(i => i.url).length;
    const pendingCount = images.filter(i => !i.url && !i.uploading && !i.error).length;
    const activeUploads = images.filter(i => i.uploading).length;
    const modelNumSet = form.modelNumber.trim().length > 0;

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in duration-300">
            {/* ── Header ── */}
            <div className="flex items-start justify-between border-b border-stone-100 pb-6">
                <div>
                    <h2 className="text-2xl font-light uppercase tracking-[0.15em]">New Model</h2>
                    <p className="text-[9px] uppercase tracking-[0.4em] font-bold text-stone-300 mt-1">
                        Fill in the details, then drag in photos
                    </p>
                </div>
                <button type="button" onClick={onCancel}
                    className="text-[9px] uppercase tracking-[0.3em] font-bold text-stone-300 hover:text-stone-900 transition-colors mt-1">
                    Cancel
                </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-10">
                {/* ── Metadata ── */}
                <div className="xl:col-span-3 space-y-5">
                    <p className="text-[8px] uppercase tracking-[0.5em] font-bold text-stone-300">Details</p>

                    {/* Row: number + year */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Model number <span className="text-red-400 normal-case not-italic">*</span></Label>
                            <Input value={form.modelNumber}
                                onChange={e => setForm(f => ({ ...f, modelNumber: e.target.value }))}
                                placeholder="e.g. 0042" required />
                            {!modelNumSet && images.length > 0 && (
                                <p className="text-[9px] text-amber-500 mt-1 flex items-center gap-1">
                                    <AlertCircle size={9} /> Enter number to start uploading
                                </p>
                            )}
                            {pendingCount > 0 && modelNumSet && (
                                <p className="text-[9px] text-stone-400 mt-1">{pendingCount} image(s) queued to upload</p>
                            )}
                        </div>
                        <div>
                            <Label>Year</Label>
                            <Input type="number" value={form.year}
                                onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                                placeholder="1994" min={1970} max={2030} />
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <Label>Project title <span className="text-red-400 normal-case not-italic">*</span></Label>
                        <Input value={form.title}
                            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                            placeholder="e.g. Yokohama Hotel" required />
                    </div>

                    {/* Architect */}
                    <div>
                        <Label>Architect / Studio</Label>
                        <Input value={form.architect}
                            onChange={e => setForm(f => ({ ...f, architect: e.target.value }))}
                            placeholder="e.g. David Chipperfield Architects" />
                    </div>

                    {/* Scale + type */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Scale</Label>
                            <Input value={form.scale}
                                onChange={e => setForm(f => ({ ...f, scale: e.target.value }))}
                                placeholder="e.g. 1:200" />
                        </div>
                        <div>
                            <Label>Model type</Label>
                            <Select value={form.modelType} onChange={e => setForm(f => ({ ...f, modelType: e.target.value }))}>
                                <option value="">— select —</option>
                                {MODEL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </Select>
                        </div>
                    </div>

                    {/* Building type + status */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Building type</Label>
                            <Input value={form.buildingType}
                                onChange={e => setForm(f => ({ ...f, buildingType: e.target.value }))}
                                placeholder="e.g. Cultural" />
                        </div>
                        <div>
                            <Label>Building status</Label>
                            <Select value={form.buildingStatus} onChange={e => setForm(f => ({ ...f, buildingStatus: e.target.value }))}>
                                <option value="">— select —</option>
                                {BUILDING_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </Select>
                        </div>
                    </div>

                    {/* Location + lead maker */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Location</Label>
                            <Input value={form.location}
                                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                                placeholder="e.g. London, UK" />
                        </div>
                        <div>
                            <Label>Lead maker</Label>
                            <Input value={form.leadMaker}
                                onChange={e => setForm(f => ({ ...f, leadMaker: e.target.value }))}
                                placeholder="Name" />
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <Label>Notes</Label>
                        <textarea value={form.notes}
                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            placeholder="Additional notes about this model…"
                            rows={4}
                            className="w-full border border-stone-200 focus:border-black outline-none px-3 py-2.5 text-sm font-light transition-colors bg-white resize-none" />
                    </div>

                    {/* Toggles */}
                    <div className="flex gap-8 pt-1">
                        {[
                            { key: 'inPrototype' as const, label: 'In prototype' },
                            { key: 'isVisible' as const, label: 'Publish on site' },
                        ].map(({ key, label }) => (
                            <label key={key} className="flex items-center gap-2.5 cursor-pointer select-none">
                                <button type="button"
                                    onClick={() => setForm(f => ({ ...f, [key]: !f[key] }))}
                                    className={`w-10 h-5 flex items-center px-0.5 border transition-colors ${
                                        form[key] ? 'bg-stone-900 border-stone-900 justify-end' : 'border-stone-300 justify-start'
                                    }`}>
                                    <div className={`w-4 h-4 ${form[key] ? 'bg-white' : 'bg-stone-200'}`} />
                                </button>
                                <span className="text-[9px] uppercase tracking-[0.25em] font-bold text-stone-500">{label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* ── Image upload ── */}
                <div className="xl:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-[8px] uppercase tracking-[0.5em] font-bold text-stone-300">Photos</p>
                        {images.length > 0 && (
                            <span className="text-[9px] font-mono text-stone-400">
                                {activeUploads > 0
                                    ? <span className="flex items-center gap-1"><Loader2 size={9} className="animate-spin" /> {activeUploads} uploading…</span>
                                    : `${uploadedCount} / ${images.length} ready`}
                            </span>
                        )}
                    </div>

                    {/* Drop zone */}
                    <div
                        onDrop={handleDrop}
                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 min-h-[180px] ${
                            dragOver
                                ? 'border-stone-900 bg-stone-50 scale-[1.01]'
                                : 'border-stone-200 hover:border-stone-400 hover:bg-stone-50'
                        }`}
                    >
                        <Upload size={20} className={`mb-3 transition-colors ${dragOver ? 'text-stone-900' : 'text-stone-200'}`} />
                        <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-stone-400">
                            Drop images here
                        </p>
                        <p className="text-[9px] text-stone-300 mt-1.5">or click to browse — JPG, PNG, TIFF</p>
                        {!modelNumSet && (
                            <p className="text-[9px] text-amber-500 mt-3 font-bold flex items-center gap-1">
                                <AlertCircle size={9} /> Enter model number first
                            </p>
                        )}
                        <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden"
                            onChange={e => { if (e.target.files) addFiles(Array.from(e.target.files)); }} />
                    </div>

                    {/* Thumbnail grid */}
                    {images.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                            {images.map(img => (
                                <div key={img.id}
                                    className="relative group aspect-square bg-stone-50 overflow-hidden border border-stone-100">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={img.preview} alt="" className="w-full h-full object-cover" />

                                    {/* Upload progress */}
                                    {img.uploading && (
                                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                                            <Loader2 size={14} className="text-white animate-spin mb-1" />
                                            <span className="text-[9px] font-mono text-white">{img.progress}%</span>
                                            {/* Progress bar */}
                                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20">
                                                <div className="h-full bg-white transition-all" style={{ width: `${img.progress}%` }} />
                                            </div>
                                        </div>
                                    )}

                                    {/* Error state */}
                                    {img.error && (
                                        <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center">
                                            <AlertCircle size={14} className="text-white" />
                                        </div>
                                    )}

                                    {/* Uploaded indicator */}
                                    {img.url && !img.uploading && (
                                        <div className="absolute top-1 left-1 w-4 h-4 bg-stone-900 flex items-center justify-center">
                                            <Check size={8} className="text-white" />
                                        </div>
                                    )}

                                    {/* Star badge */}
                                    {img.isStarred && (
                                        <div className="absolute top-1 right-1">
                                            <Star size={11} className="text-amber-400 fill-amber-400 drop-shadow" />
                                        </div>
                                    )}

                                    {/* Importance badge */}
                                    <button type="button" onClick={() => cycleImportance(img.id)}
                                        className="absolute bottom-1 left-1 w-4 h-4 bg-black/60 text-white text-[8px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Cycle importance (1=high, 2=mid, 3=low)">
                                        {img.importance}
                                    </button>

                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button type="button" onClick={() => setStarred(img.id)}
                                            title="Set as hero image"
                                            className="p-1.5 bg-white/20 hover:bg-amber-500/80 transition-colors">
                                            <Star size={10} className={img.isStarred ? 'text-amber-300 fill-amber-300' : 'text-white'} />
                                        </button>
                                        <button type="button" onClick={() => removeImage(img.id)}
                                            title="Remove image"
                                            className="p-1.5 bg-white/20 hover:bg-red-500/80 transition-colors">
                                            <X size={10} className="text-white" />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* Add more */}
                            <div onClick={() => fileInputRef.current?.click()}
                                className="aspect-square border-2 border-dashed border-stone-100 flex items-center justify-center cursor-pointer hover:border-stone-400 hover:bg-stone-50 transition-all">
                                <Plus size={14} className="text-stone-300" />
                            </div>
                        </div>
                    )}

                    {images.length > 0 && (
                        <p className="text-[9px] text-stone-300 leading-relaxed">
                            <Star size={8} className="inline fill-amber-300 text-amber-300 mr-1" />
                            = hero image shown in the archive grid.
                            Hover thumbnails to set hero or remove. Numbers cycle importance (1 = high).
                        </p>
                    )}
                </div>
            </div>

            {/* ── Footer ── */}
            <div className="border-t border-stone-100 pt-6 flex items-center justify-between gap-4 flex-wrap">
                <div>
                    {submitError && (
                        <p className="text-[10px] text-red-500 flex items-center gap-1.5">
                            <AlertCircle size={11} /> {submitError}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    <button type="button" onClick={onCancel}
                        className="text-[9px] uppercase tracking-[0.25em] font-bold text-stone-300 hover:text-stone-900 transition-colors px-4 py-3">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving || activeUploads > 0}
                        className="bg-stone-900 text-white px-8 py-3 text-[10px] uppercase tracking-[0.25em] font-bold hover:bg-stone-700 transition-colors disabled:opacity-40 flex items-center gap-2"
                    >
                        {saving
                            ? <><Loader2 size={12} className="animate-spin" /> Saving…</>
                            : activeUploads > 0
                            ? <><Loader2 size={12} className="animate-spin" /> Uploading {activeUploads}…</>
                            : <><ImageIcon size={12} /> Create model</>}
                    </button>
                </div>
            </div>
        </form>
    );
};
