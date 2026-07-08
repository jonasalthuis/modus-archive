export default function DossiersLoading() {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="w-1 h-1 rounded-full bg-stone-400"
                            style={{
                                animation: "nma-pulse 1.2s ease-in-out infinite",
                                animationDelay: `${i * 0.2}s`,
                            }}
                        />
                    ))}
                </div>
            </div>
            <style>{`
                @keyframes nma-pulse {
                    0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
                    40% { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
}
