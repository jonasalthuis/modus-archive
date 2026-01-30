import React, { useState, useEffect, useMemo } from "react";

interface Model {
    id: string;
    modelNumber: string;
    title: string;
    architect: string;
    year: number;
    scale: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const ModelList = ({ db: _db }: { db?: unknown }) => {
    const [models, setModels] = useState<Model[]>([]);
    const [loading, setLoading] = useState(true);

    // Mock data for initial UI build while sync is running
    const dummyModels = useMemo(() => [
        { id: "M-001", modelNumber: "M-001", title: "Rotterdam Central Station", architect: "Benthem Crouwel", year: 2014, scale: "1:200" },
        { id: "M-002", modelNumber: "M-002", title: "Delft University Library", architect: "Mecanoo", year: 1997, scale: "1:500" },
        { id: "M-003", modelNumber: "M-003", title: "Cube House", architect: "Piet Blom", year: 1984, scale: "1:100" },
    ], []);

    useEffect(() => {
        // This is where real Firestore fetching would happen
        const timer = setTimeout(() => {
            setModels(dummyModels);
            setLoading(false);
        }, 800);
        return () => clearTimeout(timer);
    }, [dummyModels]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end border-b border-black pb-4">
                <div>
                    <h3 className="text-xl font-medium text-black uppercase tracking-tight">Scale Models</h3>
                    <p className="text-sm text-gray-500 italic">Archive Collection: ma_models</p>
                </div>
                <div className="flex space-x-2">
                    <input
                        type="text"
                        placeholder="Search models..."
                        className="px-4 py-2 bg-white border border-gray-300 text-sm focus:outline-none focus:border-black transition-all rounded-none"
                    />
                </div>
            </div>

            {loading ? (
                <div className="py-20 text-center animate-pulse text-gray-400 italic">
                    Opening the archives...
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-widest">
                                <th className="py-4 font-normal">Model #</th>
                                <th className="py-4 font-normal">Project Title</th>
                                <th className="py-4 font-normal">Architect/Firm</th>
                                <th className="py-4 font-normal">Year</th>
                                <th className="py-4 font-normal">Scale</th>
                                <th className="py-4 font-normal text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-black">
                            {models.map((model: Model) => (
                                <tr key={model.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                                    <td className="py-4 font-mono text-xs">{model.modelNumber}</td>
                                    <td className="py-4 font-semibold">{model.title}</td>
                                    <td className="py-4 text-gray-600 italic text-base">{model.architect}</td>
                                    <td className="py-4 text-gray-500">{model.year}</td>
                                    <td className="py-4">{model.scale}</td>
                                    <td className="py-4 text-right">
                                        <button className="text-gray-400 group-hover:text-black transition-colors text-xs uppercase tracking-widest font-bold hover:underline">
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="pt-6 flex justify-center">
                <p className="text-xs text-gray-400 italic">
                    Showing {models.length} of 715+ archival entries
                </p>
            </div>
        </div>
    );
};
