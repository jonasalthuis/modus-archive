"use client";

import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface Props {
    src: string;
    modelTitle: string;
}

function formatTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function AudioCard({ src, modelTitle }: Props) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    const toggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!audioRef.current) return;
        if (playing) audioRef.current.pause();
        else audioRef.current.play();
    };

    const stop = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!audioRef.current) return;
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
    };

    return (
        <>
            <audio
                ref={audioRef}
                src={src}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
                onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
                onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
            />

            {/* Card sits on the canvas */}
            <div className="bg-white border border-stone-200 p-5 select-none" style={{ width: 240 }}>
                <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-300 mb-3 flex items-center gap-2">
                    <span
                        className={`w-1.5 h-1.5 inline-block flex-shrink-0 ${playing ? "bg-stone-900 animate-pulse" : "bg-stone-200"}`}
                    />
                    Voice Narrative
                </p>
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggle}
                        className="w-8 h-8 border border-stone-900 flex items-center justify-center text-stone-900 hover:bg-stone-900 hover:text-white transition-colors text-sm"
                        aria-label={playing ? "Pause" : "Play"}
                    >
                        {playing ? "⏸" : "▶"}
                    </button>
                    <button
                        onClick={stop}
                        className="w-8 h-8 border border-stone-300 flex items-center justify-center text-stone-400 hover:border-stone-900 hover:text-stone-900 transition-colors text-sm"
                        aria-label="Stop"
                    >
                        ⏹
                    </button>
                    <span className="text-[10px] font-mono text-stone-400 ml-1">
                        {formatTime(currentTime)}
                        {duration > 0 && ` / ${formatTime(duration)}`}
                    </span>
                </div>
            </div>

            {/* Locked mini-player — portaled outside canvas transform, only while playing */}
            {mounted &&
                playing &&
                createPortal(
                    <div className="fixed bottom-6 right-6 z-[200] bg-white border border-stone-900 p-4 shadow-none select-none">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-1.5 h-1.5 bg-stone-900 animate-pulse inline-block flex-shrink-0" />
                            <p className="text-[8px] uppercase tracking-[0.4em] font-bold text-stone-400">Now playing</p>
                        </div>
                        <p className="text-[11px] font-light text-stone-600 mb-3 leading-snug max-w-[180px]">
                            {modelTitle}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggle}
                                className="w-7 h-7 border border-stone-900 flex items-center justify-center text-xs text-stone-900 hover:bg-stone-900 hover:text-white transition-colors"
                                aria-label="Pause"
                            >
                                ⏸
                            </button>
                            <button
                                onClick={stop}
                                className="w-7 h-7 border border-stone-300 flex items-center justify-center text-xs text-stone-400 hover:border-stone-900 hover:text-stone-900 transition-colors"
                                aria-label="Stop"
                            >
                                ⏹
                            </button>
                            <span className="text-[9px] font-mono text-stone-400">
                                {formatTime(currentTime)}
                                {duration > 0 && ` / ${formatTime(duration)}`}
                            </span>
                        </div>
                    </div>,
                    document.body,
                )}
        </>
    );
}
