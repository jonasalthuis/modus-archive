"use client";

import { createContext, useContext } from "react";

export interface AudioController {
    hasAudio: boolean;
    playing: boolean;
    /** true once playback has started and hasn't been stopped (paused counts as active) */
    active: boolean;
    currentTime: number;
    duration: number;
    toggle: () => void;
    stop: () => void;
}

export const AudioControllerContext = createContext<AudioController | null>(null);

export function useAudioController(): AudioController | null {
    return useContext(AudioControllerContext);
}
