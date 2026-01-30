import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { GenericEditor } from './GenericEditor';
import { Trash2, Edit, Plus } from 'lucide-react';

interface SchemaProperty {
    name: string;
    dataType: string;
    validation?: { required?: boolean; email?: boolean };
    config?: { enumValues?: string[] };
    defaultValue?: unknown;
}

interface Schema {
    name: string;
    path: string;
    properties: Record<string, SchemaProperty>;
}

export const GenericCollection = ({ schema }: { schema: Schema }) => {
    const [docs, setDocs] = useState<Record<string, unknown>[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingDoc, setEditingDoc] = useState<Record<string, unknown> | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const fetchDocs = useCallback(async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, schema.path));
            setDocs(querySnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })));
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    }, [schema.path]); // Depend on schema.path to refetch when schema changes

    useEffect(() => {
        fetchDocs();
    }, [fetchDocs]); // Depend on fetchDocs itself, which is memoized by useCallback

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this record?')) {
            await deleteDoc(doc(db, schema.path, id));
            fetchDocs();
        }
    };

    const handleSave = () => {
        setIsCreating(false);
        setEditingDoc(null);
        fetchDocs();
    };

    if (isCreating || editingDoc) {
        return (
            <GenericEditor
                schema={schema}
                existingDoc={editingDoc || undefined}
                onCancel={() => { setIsCreating(false); setEditingDoc(null); }}
                onSave={handleSave}
            />
        );
    }

    // Determine columns from properties (take first 5 for brevity)
    const columns = Object.keys(schema.properties).slice(0, 5);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center pb-6 border-b border-black">
                <h2 className="text-2xl font-light uppercase tracking-widest">{schema.name}</h2>
                <button
                    onClick={() => setIsCreating(true)}
                    className="bg-black text-white px-4 py-2 uppercase text-xs font-bold tracking-widest hover:bg-stone-800 flex items-center gap-2"
                >
                    <Plus size={14} /> Add New
                </button>
            </div>

            {loading ? (
                <div className="text-stone-400 italic py-12 text-center">Loading collection data...</div>
            ) : docs.length === 0 ? (
                <div className="text-stone-400 italic py-12 text-center border-2 border-dashed border-stone-200">
                    No records found in {schema.name}.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-black text-xs uppercase tracking-widest text-stone-500">
                                <th className="py-3 px-2 font-bold">ID</th>
                                {columns.map(col => (
                                    <th key={col} className="py-3 px-2 font-bold">{schema.properties[col].name}</th>
                                ))}
                                <th className="py-3 px-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-mono">
                            {docs.map(d => (
                                <tr key={d.id as string} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                                    <td className="py-3 px-2 text-stone-400 text-[10px]">{(d.id as string).substring(0, 6)}...</td>
                                    {columns.map(col => (
                                        <td key={col} className="py-3 px-2 truncate max-w-[200px]">
                                            {typeof d[col] === 'boolean' ? (d[col] ? 'YES' : 'NO') :
                                                Array.isArray(d[col]) ? `[Array ${d[col].length}]` :
                                                    String(d[col] || '-')}
                                        </td>
                                    ))}
                                    <td className="py-3 px-2 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setEditingDoc(d)} className="p-1 hover:text-blue-600 transition-colors"><Edit size={14} /></button>
                                            <button onClick={() => handleDelete(d.id as string)} className="p-1 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
