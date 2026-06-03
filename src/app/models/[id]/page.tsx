import { notFound } from "next/navigation";
import { ModelPageClient } from "./ModelPageClient";

export default async function ModelPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    // Basic format guard — 4-digit zero-padded number
    if (!/^\d{4}$/.test(id)) notFound();
    return <ModelPageClient modelId={id} />;
}
