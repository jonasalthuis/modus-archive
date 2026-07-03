import React from "react";

interface Props {
    x: number;
    y: number;
    scale: number;
}

const DOT_BASE = 26; // grid spacing in canvas-space px (before zoom)

// The grid is locked 1:1 to the canvas transform: it scales with the zoom and
// tracks the pan exactly, so it reads as graph paper sitting behind the cards.
export const CanvasBackground = React.memo(function CanvasBackground({ x, y, scale }: Props) {
    const size = DOT_BASE * scale;
    const dot = Math.max(0.6, 1.1 * scale);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: `radial-gradient(circle at center, rgba(28,25,23,0.045) ${dot}px, transparent ${dot + 0.7}px)`,
                    backgroundSize: `${size}px ${size}px`,
                    backgroundPosition: `${x}px ${y}px`,
                }}
            />
        </div>
    );
});
