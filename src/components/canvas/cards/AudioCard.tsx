"use client";

import React from "react";
import { Play, Pause } from "lucide-react";
import { useAudioController } from "../audioContext";

function formatTime(s: number): string {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
}

// The on-canvas card you discover in space and click to start the narrative.
// Transport (pause/stop/scrub) also lives in the bottom bar once playing.
export function AudioCard() {
    const audio = useAudioController();
    if (!audio) return null;

    const { playing, active, currentTime, duration, toggle } = audio;

    return (
        <div
            className="bg-white border border-stone-200 rounded-lg shadow-[0_14px_40px_-12px_rgba(28,25,23,0.30)] p-5 select-none"
            style={{ width: 240 }}
        >
            <p className="text-[9px] uppercase tracking-[0.4em] font-bold text-stone-600 mb-3 flex items-center gap-2">
                <span
                    className={`w-1.5 h-1.5 inline-block flex-shrink-0 ${
                        playing ? "bg-stone-900 animate-pulse" : "bg-stone-300"
                    }`}
                />
                Voice Narrative
            </p>
            <div className="flex items-center gap-3">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        toggle();
                    }}
                    className="w-10 h-10 border border-stone-900 flex items-center justify-center text-stone-900 hover:bg-stone-900 hover:text-white transition-colors"
                    aria-label={playing ? "Pause" : "Play"}
                >
                    {playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
                </button>
                <span className="text-[11px] font-mono text-stone-600">
                    {active ? formatTime(currentTime) : "Listen"}
                    {active && duration > 0 && ` / ${formatTime(duration)}`}
                </span>
            </div>
        </div>
    );
}
