import React from "react";

interface Props {
    x: number;
    y: number;
    scale: number;
}

// A layered dotted grid that pans and zooms at a *damped* rate relative to the
// canvas content, creating a parallax sense of depth — the further layer moves
// and zooms less than the nearer one, which moves less than the cards on top.
function dotLayer(
    x: number,
    y: number,
    scale: number,
    opts: { base: number; panFactor: number; zoomFactor: number; dot: number; color: string },
): React.CSSProperties {
    const { base, panFactor, zoomFactor, dot, color } = opts;
    // Background zooms at a fraction of the content zoom → parallax on zoom
    const z = 1 + (scale - 1) * zoomFactor;
    const size = base * z;
    return {
        position: "absolute",
        inset: "-50%", // oversize so the pattern always covers the viewport while panning
        backgroundImage: `radial-gradient(circle at center, ${color} ${dot}px, transparent ${dot + 0.6}px)`,
        backgroundSize: `${size}px ${size}px`,
        backgroundPosition: `${x * panFactor}px ${y * panFactor}px`,
        willChange: "background-position, background-size",
    };
}

export const CanvasBackground = React.memo(function CanvasBackground({ x, y, scale }: Props) {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
            {/* Far layer — faint, large grid, barely moves */}
            <div style={dotLayer(x, y, scale, { base: 52, panFactor: 0.35, zoomFactor: 0.35, dot: 1, color: "rgba(28,25,23,0.06)" })} />
            {/* Near layer — denser, darker, moves more */}
            <div style={dotLayer(x, y, scale, { base: 30, panFactor: 0.7, zoomFactor: 0.7, dot: 1.1, color: "rgba(28,25,23,0.10)" })} />
            {/* Depth vignette — lighter centre, soft dark edges */}
            <div
                className="absolute inset-0"
                style={{
                    background:
                        "radial-gradient(ellipse 90% 90% at 50% 45%, transparent 55%, rgba(28,25,23,0.05) 100%)",
                }}
            />
        </div>
    );
});
