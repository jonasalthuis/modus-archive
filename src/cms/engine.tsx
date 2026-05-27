"use client";

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { LoginView } from "./views/LoginView";
import { GenericCollection } from "./components/GenericCollection";
import { Open_Sans } from "next/font/google";

const openSans = Open_Sans({ subsets: ["latin"] });

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const CMSEngine = ({ name: _name, config: _config }: { name?: string; config?: unknown }) => {
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
            <div className="min-h-screen flex items-center justify-center bg-white text-stone-500 text-[10px] uppercase tracking-widest">
                Loading...
            </div>
        );
    }

    if (!user) return <LoginView />;

    const schemas = getNMASchemas();

    return (
        <div className="bg-white min-h-screen font-sans text-black">
            <div className="p-12 border-b border-black">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className={`text-4xl font-light uppercase tracking-widest text-black ${openSans.className}`}>
                            NMA
                        </h1>
                        <p className="mt-1 text-stone-400 text-[10px] uppercase tracking-[0.4em] font-bold">
                            Admin — {user.email}
                        </p>
                    </div>
                    {activeCollection && (
                        <button
                            onClick={() => setActiveCollection(null)}
                            className="bg-black hover:bg-stone-800 text-white px-4 py-2 text-xs uppercase tracking-widest font-bold transition-colors"
                        >
                            ← Collections
                        </button>
                    )}
                </div>
            </div>

            <div className="p-12">
                {!activeCollection ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {Object.entries(schemas).map(([key, schema]) => (
                            <div
                                key={key}
                                className="group p-8 border border-stone-200 hover:border-black hover:bg-stone-50 transition-all duration-300 cursor-pointer"
                                onClick={() => setActiveCollection(key)}
                            >
                                <h2 className="text-xl font-bold uppercase tracking-tight mb-1">{schema.name}</h2>
                                <p className="text-[10px] font-mono text-stone-400 mb-6">/{schema.path}</p>
                                <div className="h-px w-8 bg-black mb-4 group-hover:w-16 transition-all duration-500" />
                                <span className="text-[10px] uppercase tracking-widest font-bold text-stone-400 group-hover:text-black transition-colors">
                                    Open →
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div>
                        {schemas[activeCollection as keyof ReturnType<typeof getNMASchemas>] ? (
                            <GenericCollection
                                schema={schemas[activeCollection as keyof ReturnType<typeof getNMASchemas>]}
                            />
                        ) : (
                            <div className="py-20 text-center text-stone-400 italic">
                                Collection &quot;{activeCollection}&quot; not found.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export const getNMASchemas = () => ({
    models: {
        name: "Models",
        path: "ma_models",
        properties: {
            // — Visibility & display —
            inPrototype: {
                name: "In prototype",
                dataType: "boolean",
                defaultValue: false,
            },
            isVisible: {
                name: "Visible on site",
                dataType: "boolean",
                defaultValue: false,
            },
            gridSize: {
                name: "Grid card size",
                dataType: "string",
                config: { enumValues: ["S", "M", "L", "Bi"] },
                defaultValue: "M",
            },

            // — Core identity —
            modelNumber: {
                name: "Model number (REF #)",
                dataType: "string",
                validation: { required: true },
            },
            title: {
                name: "Project title",
                dataType: "string",
                validation: { required: true },
            },
            architect: {
                name: "Architect / Studio",
                dataType: "string",
            },
            year: {
                name: "Year",
                dataType: "number",
            },

            // — Model specifics —
            scale: {
                name: "Scale",
                dataType: "string",
            },
            modelSize: {
                name: "Physical size",
                dataType: "string",
            },
            modelType: {
                name: "Model type",
                dataType: "string",
                config: {
                    enumValues: [
                        "presentation",
                        "study",
                        "competition",
                        "urban",
                        "structural",
                        "detail",
                        "section",
                        "interior",
                        "fragment",
                    ],
                },
            },
            buildingType: {
                name: "Building type",
                dataType: "string",
            },
            buildingStatus: {
                name: "Building status",
                dataType: "string",
                config: { enumValues: ["built", "unbuilt", "competition", "demolished", "unknown"] },
            },
            materials: {
                name: "Materials",
                dataType: "array",
                of: { dataType: "string" },
            },
            tags: {
                name: "Tags",
                dataType: "array",
                of: { dataType: "string" },
            },

            // — People & provenance —
            location: {
                name: "Building location",
                dataType: "string",
            },
            leadMaker: {
                name: "Lead maker",
                dataType: "string",
            },
            otherMakers: {
                name: "Other makers",
                dataType: "string",
            },
            photographer: {
                name: "Photographer",
                dataType: "string",
            },
            provenance: {
                name: "Current location / provenance",
                dataType: "string",
            },

            // — Editorial —
            notes: {
                name: "Notes",
                dataType: "string",
                multiline: true,
            },

            // — Media —
            images: {
                name: "Images",
                dataType: "imageGallery",
            },
            voiceNarrative: {
                name: "Audio narrative URL",
                dataType: "string",
            },
        },
    },

    dossiers: {
        name: "Dossiers",
        path: "ma_dossiers",
        properties: {
            isVisible: { name: "Visible on site", dataType: "boolean", defaultValue: false },
            title: { name: "Title", dataType: "string", validation: { required: true } },
            slug: { name: "Slug (URL)", dataType: "string", validation: { required: true } },
            intro: { name: "Intro text", dataType: "string", multiline: true },
            coverImage: { name: "Cover image URL", dataType: "string" },
        },
    },

    articles: {
        name: "Articles",
        path: "ma_articles",
        properties: {
            isVisible: { name: "Published", dataType: "boolean", defaultValue: false },
            title: { name: "Title", dataType: "string", validation: { required: true } },
            slug: { name: "Slug (URL)", dataType: "string", validation: { required: true } },
            author: { name: "Author", dataType: "string" },
            excerpt: { name: "Excerpt", dataType: "string", multiline: true },
            content: { name: "Content", dataType: "string", markdown: true },
            tags: { name: "Tags", dataType: "array", of: { dataType: "string" } },
        },
    },

    users: {
        name: "Users",
        path: "ma_users",
        properties: {
            displayName: { name: "Name", dataType: "string", validation: { required: true } },
            email: { name: "Email", dataType: "string", validation: { required: true } },
            role: {
                name: "Role",
                dataType: "string",
                config: { enumValues: ["admin", "editor", "viewer"] },
                defaultValue: "viewer",
            },
        },
    },
});
