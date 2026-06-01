"use client";

import React, { useState } from "react";
import { signOut as firebaseSignOut, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth, VerifyEmailScreen, type Role } from "@/lib/auth";
import { Inter } from "next/font/google";
import {
    LayoutDashboard,
    Archive,
    FileText,
    BookOpen,
    Users,
    UserCircle,
    LogOut,
    Plus,
    Link2,
    ExternalLink,
    HelpCircle,
    ChevronDown,
    Upload,
} from "lucide-react";

import { LoginView } from "./views/LoginView";
import { DashboardView } from "./views/DashboardView";
import { AccountView } from "./views/AccountView";
import { InvitesView } from "./views/InvitesView";
import { DossierEditor } from "./views/DossierEditor";
import { GuidesView } from "./views/GuidesView";
import dynamic from "next/dynamic";
import { GenericCollection } from "./components/GenericCollection";
import { AddModelPanel } from "./components/AddModelPanel";
import { HELP_TARGETS } from "./guides/registry";

// Lazy-loaded: pulls in the heavy spreadsheet library only when importing
const ImportModelsPanel = dynamic(
    () => import("./components/ImportModelsPanel").then((m) => m.ImportModelsPanel),
    {
        ssr: false,
        loading: () => (
            <p className="text-[10px] uppercase tracking-[0.5em] text-stone-400 py-20 text-center">Loading importer…</p>
        ),
    },
);
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const inter = Inter({ subsets: ["latin"] });

export type ActiveView =
    | "dashboard"
    | "models"
    | "add-model"
    | "import-models"
    | "artefacts"
    | "dossiers"
    | "dossier-editor"
    | "users"
    | "invites"
    | "guides"
    | "account";

// State passed when navigating to dossier-editor
export interface DossierEditorParams {
    id: string | null; // null = new dossier
}

const NAV: {
    id: ActiveView;
    label: string;
    icon: React.ReactNode;
    section?: string;
}[] = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={15} /> },
    { id: "models", label: "Models", icon: <Archive size={15} />, section: "Collections" },
    { id: "artefacts", label: "Artefacts", icon: <FileText size={15} />, section: "Collections" },
    { id: "dossiers", label: "Dossiers", icon: <BookOpen size={15} />, section: "Collections" },
    { id: "users", label: "Users", icon: <Users size={15} />, section: "Collections" },
    { id: "invites", label: "Invites", icon: <Link2 size={15} />, section: "Access" },
    { id: "guides", label: "Guides", icon: <HelpCircle size={15} />, section: "Knowledge" },
];

// ─── Role-based access ────────────────────────────────────────────────────────
// Admins get everything. Editors get the content collections + guides, but not
// the dashboard, user management, or invite (access) management.
const EDITOR_VIEWS: ActiveView[] = [
    "models",
    "add-model",
    "import-models",
    "artefacts",
    "dossiers",
    "dossier-editor",
    "guides",
    "account",
];

const viewsForRole = (role: Role): ActiveView[] =>
    role === "admin"
        ? [
              "dashboard",
              "models",
              "add-model",
              "import-models",
              "artefacts",
              "dossiers",
              "dossier-editor",
              "users",
              "invites",
              "guides",
              "account",
          ]
        : EDITOR_VIEWS;

// Which top-level NAV items each role sees in the sidebar
const navIdsForRole = (role: Role): ActiveView[] =>
    role === "admin"
        ? NAV.map((n) => n.id)
        : (["models", "artefacts", "dossiers", "guides"] as ActiveView[]);

// ─── Sidebar ────────────────────────────────────────────────────────────────

const Sidebar = ({
    activeView,
    user,
    role,
    onNavigate,
    onSignOut,
    onNewModel,
    onNewArtefact,
    onNewDossier,
    onImportModels,
}: {
    activeView: ActiveView;
    user: User;
    role: Role;
    onNavigate: (v: ActiveView) => void;
    onSignOut: () => void;
    onNewModel: () => void;
    onNewArtefact: () => void;
    onNewDossier: () => void;
    onImportModels: () => void;
}) => {
    // Restrict the nav to what this role can access
    const allowedNavIds = navIdsForRole(role);
    const navItems = NAV.filter((n) => allowedNavIds.includes(n.id));

    // Collect unique section labels in order (only for visible items)
    const sections: (string | null)[] = [];
    navItems.forEach((item) => {
        const s = item.section ?? null;
        if (!sections.includes(s)) sections.push(s);
    });

    return (
        <aside className="w-64 flex-shrink-0 border-r border-stone-300 flex flex-col h-full bg-white">
            {/* Logo + exit to site */}
            <div className="px-6 py-6 border-b border-stone-300">
                <p className="text-2xl font-light uppercase tracking-[0.25em] text-stone-900">NMA</p>
                <p className="text-[11px] uppercase tracking-[0.35em] font-bold text-stone-500 mt-1.5">Admin</p>
                <a
                    href="/"
                    title="Leave the admin panel"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-stone-300 px-2.5 py-1.5 text-[9px] uppercase tracking-[0.3em] font-bold text-stone-500 hover:text-stone-900 hover:border-stone-900 hover:bg-stone-50 transition-colors"
                >
                    Exit to site
                    <ExternalLink size={11} />
                </a>
            </div>

            {/* Nav */}
            <nav className="flex-1 py-4 overflow-y-auto">
                {sections.map((section) => {
                    const items = navItems.filter((n) => (n.section ?? null) === section);
                    return (
                        <div key={section ?? "top"} className="mb-1">
                            {section && (
                                <p className="text-[8px] uppercase tracking-[0.6em] font-bold text-stone-400 px-6 py-3">
                                    {section}
                                </p>
                            )}
                            {items.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => onNavigate(item.id)}
                                    className={`w-full flex items-center gap-3 px-6 py-2.5 text-[10px] uppercase tracking-[0.2em] font-bold transition-colors ${
                                        activeView === item.id
                                            ? "text-stone-900 bg-stone-50"
                                            : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
                                    }`}
                                >
                                    <span className={activeView === item.id ? "text-stone-900" : "text-stone-400"}>
                                        {item.icon}
                                    </span>
                                    {item.label}
                                    {activeView === item.id && (
                                        <span className="ml-auto w-1 h-1 bg-stone-900 rounded-none" />
                                    )}
                                </button>
                            ))}
                        </div>
                    );
                })}
            </nav>

            {/* ── New content menu — bottom ── */}
            <div className="px-4 pt-4 pb-3 border-t border-stone-300">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="w-full flex items-center justify-center gap-2 py-3 rounded-md text-[9px] uppercase tracking-[0.3em] font-bold bg-stone-900 text-white hover:bg-stone-700 transition-all">
                            <Plus size={13} />
                            New content
                            <ChevronDown size={12} className="opacity-70" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" side="top" sideOffset={6} className="w-56">
                        <DropdownMenuItem onClick={onNewModel} className="gap-2.5">
                            <Archive size={14} className="text-stone-500" /> New model
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onNewArtefact} className="gap-2.5">
                            <FileText size={14} className="text-stone-500" /> New artefact
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onNewDossier} className="gap-2.5">
                            <BookOpen size={14} className="text-stone-500" /> New dossier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onImportModels} className="gap-2.5">
                            <Upload size={14} className="text-stone-500" /> Import models (CSV / Excel)
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Account + sign out */}
            <div className="border-t border-stone-300 p-3 space-y-1">
                <button
                    onClick={() => onNavigate("account")}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                        activeView === "account"
                            ? "bg-stone-100 text-stone-900"
                            : "text-stone-500 hover:bg-stone-50 hover:text-stone-900"
                    }`}
                >
                    <UserCircle size={15} className="flex-shrink-0 text-stone-400" />
                    <div className="text-left min-w-0">
                        <p className="text-[10px] font-bold truncate leading-tight">{user.displayName || "Account"}</p>
                        <p className="text-[9px] text-stone-400 truncate">{user.email}</p>
                    </div>
                </button>
                <button
                    onClick={onSignOut}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-[10px] uppercase tracking-[0.2em] font-bold text-stone-500 hover:text-red-500 hover:bg-stone-50 transition-colors"
                >
                    <LogOut size={13} />
                    Sign out
                </button>
            </div>
        </aside>
    );
};

// ─── Engine ──────────────────────────────────────────────────────────────────

// Small centred message screen used for the various no-access states
const GateScreen = ({ label, message }: { label: string; message: string }) => (
    <div className={`min-h-screen flex items-center justify-center bg-white ${inter.className}`}>
        <div className="text-center space-y-4 max-w-sm px-6">
            <p className="text-2xl font-light uppercase tracking-[0.25em] text-stone-900">NMA</p>
            <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-stone-400">{label}</p>
            <p className="text-sm text-stone-600 leading-relaxed">{message}</p>
            <div className="flex items-center justify-center gap-5 pt-2">
                <a
                    href="/"
                    className="text-[10px] uppercase tracking-[0.3em] font-bold text-stone-500 hover:text-stone-900 transition-colors"
                >
                    Go to site →
                </a>
                <button
                    onClick={() => firebaseSignOut(auth)}
                    className="text-[10px] uppercase tracking-[0.3em] font-bold text-stone-500 hover:text-stone-900 transition-colors"
                >
                    Sign out →
                </button>
            </div>
        </div>
    </div>
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const CMSEngine = ({ name: _name, config: _config }: { name?: string; config?: unknown }) => {
    const { user, status, role } = useAuth();
    const [activeView, setActiveView] = useState<ActiveView>("dashboard");
    const [dossierEditorId, setDossierEditorId] = useState<string | null>(null);
    // Bumped to signal the Artefacts collection to open its create form
    const [artefactCreateNonce, setArtefactCreateNonce] = useState(0);
    const [guideTarget, setGuideTarget] = useState<{ guide: string; anchor?: string; nonce: number }>({
        guide: "README",
        nonce: 0,
    });

    const openDossierEditor = (id: string | null) => {
        setDossierEditorId(id);
        setActiveView("dossier-editor");
    };

    // "New content" menu actions
    const newModel = () => setActiveView("add-model");
    const newArtefact = () => {
        setArtefactCreateNonce((n) => n + 1);
        setActiveView("artefacts");
    };
    const newDossier = () => openDossierEditor(null);
    const importModels = () => setActiveView("import-models");

    // Open the Knowledge Center at a specific guide/section (used by the ? help icons)
    const openGuide = (guide: string, anchor?: string) => {
        setGuideTarget((t) => ({ guide, anchor, nonce: t.nonce + 1 }));
        setActiveView("guides");
    };
    const helpFor = (key: string) => () => openGuide(HELP_TARGETS[key].guide, HELP_TARGETS[key].anchor);

    if (status === "loading")
        return (
            <div className={`min-h-screen flex items-center justify-center bg-white ${inter.className}`}>
                <p className="text-[10px] uppercase tracking-[0.5em] text-stone-400">Loading…</p>
            </div>
        );

    if (status === "signed-out" || !user) return <LoginView />;

    // Password account awaiting email verification
    if (status === "unverified") return <VerifyEmailScreen user={user} />;

    // Invite-code guests
    if (status === "guest")
        return (
            <GateScreen
                label="Restricted"
                message="Admin access requires a staff account. Guest access codes grant view-only access to the public archive."
            />
        );

    // Signed in but not on the authorised list
    if (status === "unauthorised")
        return (
            <GateScreen
                label="Not authorised"
                message="This account isn't authorised yet. Ask an administrator to add your email to the archive."
            />
        );

    // Authorised viewers have no backend access — they belong on the frontend
    if (role === "viewer" || !role)
        return (
            <GateScreen
                label="Frontend only"
                message="Your account has viewer access. The admin panel is for editors and administrators — head to the site to browse the archive."
            />
        );

    const schemas = getNMASchemas();

    // Clamp the active view to what this role may see (defends against stale state)
    const allowed = viewsForRole(role);
    const effectiveView: ActiveView = allowed.includes(activeView) ? activeView : role === "admin" ? "dashboard" : "models";

    const handleSignOut = async () => {
        if (confirm("Sign out of NMA Admin?")) await firebaseSignOut(auth);
    };

    const renderView = () => {
        switch (effectiveView) {
            case "dashboard":
                return <DashboardView onNavigate={setActiveView} />;
            case "models":
                return (
                    <GenericCollection
                        schema={schemas.models}
                        onHelp={helpFor("models")}
                        quickFilters={[
                            { label: "Prototype", filterFn: (doc) => doc.inPrototype === true },
                            { label: "Published", filterFn: (doc) => doc.isVisible === true },
                            {
                                label: "With images",
                                filterFn: (doc) => Array.isArray(doc.images) && (doc.images as unknown[]).length > 0,
                            },
                            {
                                label: "No images",
                                filterFn: (doc) => !Array.isArray(doc.images) || (doc.images as unknown[]).length === 0,
                            },
                        ]}
                    />
                );
            case "add-model":
                return (
                    <AddModelPanel onSave={() => setActiveView("models")} onCancel={() => setActiveView("models")} />
                );
            case "import-models":
                return <ImportModelsPanel onDone={() => setActiveView("models")} />;
            case "artefacts":
                return (
                    <GenericCollection
                        schema={schemas.artefacts}
                        onHelp={helpFor("artefacts")}
                        autoCreateNonce={artefactCreateNonce}
                    />
                );
            case "dossiers":
                return (
                    <GenericCollection
                        schema={schemas.dossiers}
                        onHelp={helpFor("dossiers")}
                        onRowClick={(row) => openDossierEditor(row.id as string)}
                        rowActionLabel="Edit dossier →"
                        onAddNew={() => openDossierEditor(null)}
                    />
                );
            case "dossier-editor":
                return (
                    <DossierEditor
                        dossierId={dossierEditorId}
                        onBack={() => setActiveView("dossiers")}
                        onHelp={helpFor("dossiers")}
                    />
                );
            case "users":
                return <GenericCollection schema={schemas.users} onHelp={helpFor("users")} />;
            case "invites":
                return <InvitesView />;
            case "guides":
                return (
                    <GuidesView
                        key={guideTarget.nonce}
                        initialGuide={guideTarget.guide}
                        initialAnchor={guideTarget.anchor}
                    />
                );
            case "account":
                return <AccountView user={user} />;
            default:
                return null;
        }
    };

    return (
        <div className={`relative flex h-screen overflow-hidden bg-stone-100 text-black ${inter.className}`}>
            <Sidebar
                activeView={effectiveView}
                user={user}
                role={role}
                onNavigate={setActiveView}
                onSignOut={handleSignOut}
                onNewModel={newModel}
                onNewArtefact={newArtefact}
                onNewDossier={newDossier}
                onImportModels={importModels}
            />
            <main className="flex-1 overflow-y-auto">
                <div className="px-8 py-8 max-w-[1400px] mx-auto">{renderView()}</div>
            </main>
        </div>
    );
};

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const getNMASchemas = () => ({
    models: {
        name: "Models",
        path: "ma_models",
        idField: "modelNumber",
        properties: {
            // ── Table-primary columns (visible by default) ──
            modelNumber: {
                name: "Ref #",
                dataType: "string",
                validation: { required: true },
                tableVisible: true,
                tableWidth: 85,
            },
            title: {
                name: "Title",
                dataType: "string",
                validation: { required: true },
                tableVisible: true,
                tableWidth: 230,
            },
            architect: { name: "Architect", dataType: "string", tableVisible: true, tableWidth: 180 },
            year: { name: "Year", dataType: "number", tableVisible: true, tableWidth: 72 },
            isVisible: {
                name: "Published",
                dataType: "boolean",
                defaultValue: false,
                tableVisible: true,
                tableWidth: 90,
            },
            inPrototype: {
                name: "Prototype",
                dataType: "boolean",
                defaultValue: false,
                tableVisible: true,
                tableWidth: 90,
            },
            featured: {
                name: "Featured (main + secondary)",
                dataType: "featuredImages",
                tableVisible: false,
                tableWidth: 120,
            },
            imageGroups: {
                name: "Image Groups",
                dataType: "imageGroups",
                tableVisible: false,
                tableWidth: 120,
            },
            images: { name: "Images (legacy)", dataType: "imageGallery", tableVisible: true, tableWidth: 72 },
            voiceNarrative: { name: "Audio", dataType: "audioUpload", tableVisible: true, tableWidth: 65 },

            // ── Extra detail columns (hidden by default, toggleable) ──
            modelType: {
                name: "Model type",
                dataType: "string",
                tableVisible: false,
                tableWidth: 120,
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
            buildingType: { name: "Building type", dataType: "string", tableVisible: false, tableWidth: 130 },
            buildingStatus: {
                name: "Building status",
                dataType: "string",
                tableVisible: false,
                tableWidth: 120,
                config: { enumValues: ["built", "unbuilt", "competition", "demolished", "unknown"] },
            },
            scale: { name: "Scale", dataType: "string", tableVisible: false, tableWidth: 90 },
            modelSize: { name: "Physical size", dataType: "string", tableVisible: false, tableWidth: 120 },
            location: { name: "Location", dataType: "string", tableVisible: false, tableWidth: 160 },
            leadMaker: { name: "Lead maker", dataType: "string", tableVisible: false, tableWidth: 150 },
            otherMakers: { name: "Other makers", dataType: "string", tableVisible: false, tableWidth: 150 },
            photographer: { name: "Photographer", dataType: "string", tableVisible: false, tableWidth: 140 },
            provenance: { name: "Provenance", dataType: "string", tableVisible: false, tableWidth: 160 },
            materials: {
                name: "Materials",
                dataType: "array",
                tableVisible: false,
                tableWidth: 150,
                of: { dataType: "string" },
            },
            tags: { name: "Tags", dataType: "array", tableVisible: false, tableWidth: 130, of: { dataType: "string" } },
            notes: { name: "Notes", dataType: "string", tableVisible: false, tableWidth: 200, multiline: true },
            gridSize: {
                name: "Grid size",
                dataType: "string",
                tableVisible: false,
                tableWidth: 80,
                config: { enumValues: ["S", "M", "L", "Bi"] },
                defaultValue: "M",
            },
        },
    },

    dossiers: {
        name: "Dossiers",
        path: "ma_dossiers",
        idField: "slug",
        properties: {
            // ── Table-primary ──
            title: {
                name: "Title",
                dataType: "string",
                validation: { required: true },
                tableVisible: true,
                tableWidth: 260,
            },
            slug: {
                name: "Slug",
                dataType: "string",
                validation: { required: true },
                tableVisible: true,
                tableWidth: 160,
            },
            isVisible: {
                name: "Published",
                dataType: "boolean",
                defaultValue: false,
                tableVisible: true,
                tableWidth: 90,
            },
            coverImage: { name: "Cover image", dataType: "string", tableVisible: true, tableWidth: 100 },

            // ── Detail fields (managed via full-screen editor) ──
            intro: { name: "Intro text", dataType: "string", tableVisible: false, tableWidth: 300, multiline: true },
            tags: { name: "Tags", dataType: "array", tableVisible: false, tableWidth: 140, of: { dataType: "string" } },
            // items: DossierItem[] — managed exclusively via DossierEditor, not shown in generic table
        },
    },

    artefacts: {
        name: "Artefacts",
        path: "ma_articles",
        idField: "slug",
        properties: {
            // ── Table-primary ──
            title: {
                name: "Title",
                dataType: "string",
                validation: { required: true },
                tableVisible: true,
                tableWidth: 260,
            },
            slug: {
                name: "Slug",
                dataType: "string",
                validation: { required: true },
                tableVisible: true,
                tableWidth: 160,
            },
            author: { name: "Author", dataType: "string", tableVisible: true, tableWidth: 140 },
            publishDate: { name: "Date", dataType: "date", tableVisible: true, tableWidth: 100 },
            isVisible: {
                name: "Published",
                dataType: "boolean",
                defaultValue: false,
                tableVisible: true,
                tableWidth: 90,
            },

            // ── Detail fields ──
            heroImage: { name: "Hero image", dataType: "string", tableVisible: false, tableWidth: 180 },
            excerpt: { name: "Excerpt", dataType: "string", tableVisible: false, tableWidth: 280, multiline: true },
            content: { name: "Content", dataType: "string", tableVisible: false, tableWidth: 300, markdown: true },
            tags: { name: "Tags", dataType: "array", tableVisible: false, tableWidth: 130, of: { dataType: "string" } },
        },
    },

    users: {
        name: "Users",
        path: "users",
        idField: "email",
        properties: {
            displayName: {
                name: "Name",
                dataType: "string",
                validation: { required: true },
                tableVisible: true,
                tableWidth: 200,
            },
            email: {
                name: "Email",
                dataType: "string",
                validation: { required: true },
                tableVisible: true,
                tableWidth: 240,
            },
            role: {
                name: "Role",
                dataType: "string",
                tableVisible: true,
                tableWidth: 100,
                config: { enumValues: ["admin", "editor", "viewer"] },
                defaultValue: "viewer",
            },
        },
    },
});
