"use client";

import React, { useRef, useState } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { Upload, Trash2, Play, Pause } from "lucide-react";

interface AudioUploaderProps {
    modelId: string;
    url: string | null | undefined;
    onChange: (url: string | null) => void;
}

export const AudioUploader = ({ modelId, url, onChange }: AudioUploaderProps) => {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [playing, setPlaying] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    const handleFile = (file: File) => {
        if (!modelId) {
            alert("Save the model number first before uploading audio.");
            return;
        }
        if (!file.type.startsWith("audio/")) {
            alert("Please upload an audio file (MP3, WAV, M4A, etc.).");
            return;
        }

        const timestamp = Date.now();
        const storagePath = `models/audio/${modelId}/${timestamp}-${file.name}`;
        const storageRef = ref(storage, storagePath);
        const task = uploadBytesResumable(storageRef, file);

        setUploading(true);
        setProgress(0);

        task.on(
            "state_changed",
            (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
            (err) => {
                console.error("Audio upload error:", err);
                setUploading(false);
            },
            async () => {
                const downloadUrl = await getDownloadURL(task.snapshot.ref);
                onChange(downloadUrl);
                setUploading(false);
                setProgress(0);
            },
        );
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (playing) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setPlaying(!playing);
    };

    return (
        <div className="space-y-4">
            {/* Current audio */}
            {url ? (
                <div className="flex items-center gap-4 bg-white border border-stone-300 p-4">
                    <button
                        type="button"
                        onClick={togglePlay}
                        className="w-8 h-8 bg-stone-900 text-white flex items-center justify-center hover:bg-stone-700 transition-colors flex-shrink-0"
                    >
                        {playing ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-mono text-stone-400 truncate">{url}</p>
                        <audio ref={audioRef} src={url} onEnded={() => setPlaying(false)} className="hidden" />
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            onChange(null);
                            setPlaying(false);
                        }}
                        className="p-1 hover:text-red-500 transition-colors text-stone-400 flex-shrink-0"
                        title="Remove audio"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            ) : null}

            {/* Upload zone */}
            {!url && (
                <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => inputRef.current?.click()}
                    className="border border-dashed border-stone-300 p-8 text-center cursor-pointer hover:border-stone-900 hover:bg-stone-50 transition-all"
                >
                    <Upload size={20} className="mx-auto mb-3 text-stone-300" />
                    <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-stone-400">
                        Drop audio file or click to upload
                    </p>
                    <p className="text-[9px] text-stone-300 mt-1">MP3, WAV, M4A, AIFF</p>
                    <input
                        ref={inputRef}
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => {
                            if (e.target.files?.[0]) handleFile(e.target.files[0]);
                        }}
                    />
                </div>
            )}

            {/* Replace button when audio exists */}
            {url && !uploading && (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400 hover:text-stone-900 transition-colors flex items-center gap-2"
                >
                    <Upload size={12} /> Replace audio
                </button>
            )}
            {url && (
                <input
                    ref={inputRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                        if (e.target.files?.[0]) handleFile(e.target.files[0]);
                    }}
                />
            )}

            {/* Upload progress */}
            {uploading && (
                <div className="space-y-2">
                    <div className="h-px bg-stone-300 w-full overflow-hidden">
                        <div
                            className="h-full bg-stone-900 transition-all duration-200"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-[10px] font-mono text-stone-400">Uploading… {progress}%</p>
                </div>
            )}
        </div>
    );
};
