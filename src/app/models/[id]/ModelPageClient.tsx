"use client";

import dynamic from "next/dynamic";

const ModelScene = dynamic(
    () => import("@/components/universe/ModelScene").then(m => m.ModelScene),
    {
        ssr: false,
        loading: () => (
            <div className="fixed inset-0 flex items-center justify-center bg-stone-50">
                <div className="space-y-3 text-center">
                    <div className="w-12 h-px bg-stone-300 mx-auto animate-pulse" />
                    <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-300">
                        Opening model…
                    </p>
                </div>
            </div>
        ),
    },
);

export function ModelPageClient({ modelId }: { modelId: string }) {
    return <ModelScene modelId={modelId} />;
}
