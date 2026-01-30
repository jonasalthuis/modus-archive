import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { LoginView } from "./views/LoginView";
import { GenericCollection } from "./components/GenericCollection";
import { Open_Sans } from "next/font/google";

const openSans = Open_Sans({ subsets: ["latin"] });

/**
 * Local FireCMS Engine for Modus Modelmaking Archive.
 * Siloed from other applications.
 * Focuses on archival integrity and rich media relationships.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const CMSEngine = ({ name: _name, config: _config }: { name?: string, config?: unknown }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeCollection, setActiveCollection] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className={`min-h-screen flex items-center justify-center bg-white text-black italic font-sans`}>
                Loading Application...
            </div>
        );
    }

    if (!user) {
        return <LoginView />;
    }

    return (
        <div className={`bg-white min-h-screen font-sans text-black`}>
            <div className="p-12 border-b border-black">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className={`text-4xl font-light uppercase tracking-widest text-black ${openSans.className}`}>
                            Modus Archive
                        </h1>
                        <p className="mt-4 text-gray-600 italic text-lg max-w-2xl">
                            &quot;Preserving the Analogue DNA of Architecture in a Digital Era&quot;
                        </p>
                    </div>
                    {activeCollection && (
                        <button
                            onClick={() => setActiveCollection(null)}
                            className="bg-black hover:bg-gray-800 text-white px-4 py-2 text-xs uppercase tracking-widest font-bold transition-colors"
                        >
                            ← Back to Collections
                        </button>
                    )}
                </div>
            </div>

            <div className="p-12">
                {!activeCollection ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {Object.entries(getModusArchivalSchemas()).map(([key, schema]) => (
                            <div key={key} className="group p-8 rounded-none border border-black hover:bg-gray-50 transition-all duration-300">
                                <h2 className="text-2xl font-normal mb-3 text-black uppercase tracking-tight group-hover:underline transition-all">
                                    {schema.name}
                                </h2>
                                <p className="text-sm text-gray-500 mb-6 font-mono">path: /{schema.path}</p>
                                <div className="h-px w-12 bg-black mb-6 group-hover:w-24 transition-all duration-500"></div>
                                <button
                                    onClick={() => setActiveCollection(key)}
                                    className="text-sm uppercase tracking-widest font-semibold hover:underline transition-all flex items-center"
                                >
                                    Open Collection
                                    <span className="ml-2 transform group-hover:translate-x-2 transition-transform">→</span>
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white p-8 border border-black shadow-none">
                        {getModusArchivalSchemas()[activeCollection as keyof ReturnType<typeof getModusArchivalSchemas>] ? (
                            <GenericCollection schema={getModusArchivalSchemas()[activeCollection as keyof ReturnType<typeof getModusArchivalSchemas>]} />
                        ) : (
                            <div className="py-20 text-center text-gray-400 italic">
                                Collection &quot;{activeCollection}&quot; not found.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

/**
 * Modus-specific schemas for archival data.
 * Handles relationships between models, photos, and narratives.
 */
export const getModusArchivalSchemas = () => {
    return {
        models: {
            name: "Scale Models",
            path: "ma_models",
            properties: {
                isVisible: { name: "Visible on Site", dataType: "boolean", defaultValue: true },
                modelNumber: { name: "REF #", dataType: "string", validation: { required: true } },
                year: { name: "Year", dataType: "number" },
                rating: { name: "Rating", dataType: "string" },
                scale: { name: "Scale", dataType: "string" },
                architect: { name: "Architect/Designer", dataType: "string" },
                title: { name: "Project and Phase", dataType: "string" },
                buildingStatus: { name: "Building Status", dataType: "string" },
                location: { name: "Building Location", dataType: "string" },
                buildingType: { name: "Building Type", dataType: "string" },
                modelSize: { name: "Model Size", dataType: "string" },
                materials: { name: "Model Materials", dataType: "array", of: { dataType: "string" } },
                modelType: { name: "Model Type", dataType: "string" },
                purpose: { name: "Purpose", dataType: "string" },
                leadMaker: { name: "Lead Maker", dataType: "string" },
                otherMakers: { name: "Other Makers", dataType: "string" },
                raStudio: { name: "RA Studio", dataType: "string" },
                photographer: { name: "Photos / Photographer", dataType: "string" },
                provenance: { name: "Provenance / Location", dataType: "string" },
                archivalMaterial: { name: "Archival Material", dataType: "string" },
                notes: { name: "Notes", dataType: "string", markdown: true }
            }
        },
        users: {
            name: "Authorized Users",
            path: "ma_users",
            properties: {
                displayName: { name: "Display Name", dataType: "string", validation: { required: true } },
                email: { name: "Email", dataType: "string", validation: { required: true, email: true } },
                role: { name: "Role", dataType: "string", config: { enumValues: ["admin", "editor", "viewer"] }, defaultValue: "viewer" },
                photoURL: { name: "Photo URL", dataType: "string", storageMeta: { mediaType: "image" } }
            }
        },
        articles: {
            name: "Articles",
            path: "ma_articles",
            properties: {
                isVisible: { name: "Published", dataType: "boolean", defaultValue: false },
                title: { name: "Title", dataType: "string", validation: { required: true } },
                slug: { name: "Slug (URL)", dataType: "string", validation: { required: true } },
                author: { name: "Author", dataType: "string" },
                publishDate: { name: "Publish Date", dataType: "date" },
                heroImage: { name: "Hero Image", dataType: "string", storageMeta: { mediaType: "image" } },
                excerpt: { name: "Excerpt", dataType: "string", multiline: true },
                content: { name: "Content", dataType: "string", markdown: true },
                tags: { name: "Tags", dataType: "array", of: { dataType: "string" } }
            }
        }
    };
};
