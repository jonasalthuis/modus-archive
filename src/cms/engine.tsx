"use client";

import React, { useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
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
    PanelLeftClose,
    PanelLeftOpen,
    ArrowLeft,
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
            <p className="text-[10px] uppercase tracking-[0.5em] text-gray-500 py-20 text-center">Loading importer…</p>
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
    collapsed,
    onNavigate,
    onSignOut,
    onNewModel,
    onNewArtefact,
    onNewDossier,
    onImportModels,
    onToggleCollapse,
}: {
    activeView: ActiveView;
    user: User;
    role: Role;
    collapsed: boolean;
    onNavigate: (v: ActiveView) => void;
    onSignOut: () => void;
    onNewModel: () => void;
    onNewArtefact: () => void;
    onNewDossier: () => void;
    onImportModels: () => void;
    onToggleCollapse: () => void;
}) => {

    const allowedNavIds = navIdsForRole(role);
    const navItems = NAV.filter((n) => allowedNavIds.includes(n.id));

    const sections: (string | null)[] = [];
    navItems.forEach((item) => {
        const s = item.section ?? null;
        if (!sections.includes(s)) sections.push(s);
    });

    return (
        <aside className="flex-shrink-0 border-r border-gray-200 flex flex-col h-full bg-white z-10 overflow-hidden" style={{ width: "100%" }}>
            {/* Logo */}
            <div className={`border-b border-gray-200 flex-shrink-0 ${collapsed ? "px-3 py-4 flex flex-col items-center gap-2" : "px-4 py-4"}`}>
                {!collapsed && (
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            {/* Exit to site — matches front-end back button style */}
                            <a
                                href="/"
                                title="Exit to site"
                                className="inline-flex items-center justify-center w-[34px] h-[34px] flex-shrink-0 border border-stone-200 rounded-md text-stone-400 hover:bg-stone-900 hover:border-stone-900 hover:text-white transition-colors duration-300"
                            >
                                <ArrowLeft size={13} />
                            </a>
                            {/* NMA button — matches front-end nav style */}
                            <a
                                href="/"
                                className="text-[10px] font-bold uppercase tracking-[0.4em] px-3 rounded-md border border-stone-200 hover:border-stone-900 hover:bg-stone-900 hover:text-white bg-white text-stone-900 transition-colors duration-300 select-none h-[34px] flex items-center justify-center flex-shrink-0"
                            >
                                NMA
                            </a>
                            <span className="text-[9px] uppercase tracking-[0.35em] font-bold text-gray-400 truncate">Admin</span>
                        </div>
                    </div>
                )}
                {collapsed && (
                    <a
                        href="/"
                        title="Exit to site"
                        className="inline-flex items-center justify-center w-[34px] h-[34px] border border-stone-200 rounded-md text-stone-400 hover:bg-stone-900 hover:border-stone-900 hover:text-white transition-colors duration-300"
                    >
                        <ArrowLeft size={13} />
                    </a>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
                {sections.map((section) => {
                    const items = navItems.filter((n) => (n.section ?? null) === section);
                    return (
                        <div key={section ?? "top"} className="mb-1">
                            {section && !collapsed && (
                                <p className="text-[7px] uppercase tracking-[0.6em] font-bold text-gray-400 px-5 pt-4 pb-1.5">
                                    {section}
                                </p>
                            )}
                            {section && collapsed && <div className="my-2 mx-3 border-t border-gray-100" />}
                            {items.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => onNavigate(item.id)}
                                    title={collapsed ? item.label : undefined}
                                    className={`w-full flex items-center transition-colors ${collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] font-bold"} ${
                                        activeView === item.id
                                            ? "text-gray-900 bg-gray-100"
                                            : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                                    }`}
                                >
                                    <span className={`flex-shrink-0 ${activeView === item.id ? "text-gray-900" : "text-gray-400"}`}>
                                        {item.icon}
                                    </span>
                                    {!collapsed && item.label}
                                    {!collapsed && activeView === item.id && (
                                        <span className="ml-auto w-1 h-1 bg-gray-900 rounded-none" />
                                    )}
                                </button>
                            ))}
                        </div>
                    );
                })}
            </nav>

            {/* Collapse toggle */}
            <div className={`pt-2 pb-1 border-t border-gray-200 ${collapsed ? "px-2" : "px-3"}`}>
                <button
                    onClick={onToggleCollapse}
                    title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    className={`w-full flex items-center rounded-md text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-colors ${collapsed ? "justify-center py-2.5" : "gap-2 px-2 py-2"}`}
                >
                    {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
                    {!collapsed && <span className="text-[9px] uppercase tracking-[0.3em] font-bold">Collapse</span>}
                </button>
            </div>

            {/* New content */}
            <div className={`pt-2 pb-2 border-t border-gray-200 ${collapsed ? "px-2" : "px-3"}`}>
                {collapsed ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button title="New content" className="w-full flex items-center justify-center py-2.5 rounded-md bg-gray-900 text-white hover:bg-gray-800 transition-colors">
                                <Plus size={14} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" side="right" sideOffset={8} className="w-52">
                            <DropdownMenuItem onClick={onNewModel} className="gap-2.5"><Archive size={14} className="text-gray-600" /> New model</DropdownMenuItem>
                            <DropdownMenuItem onClick={onNewArtefact} className="gap-2.5"><FileText size={14} className="text-gray-600" /> New artefact</DropdownMenuItem>
                            <DropdownMenuItem onClick={onNewDossier} className="gap-2.5"><BookOpen size={14} className="text-gray-600" /> New dossier</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={onImportModels} className="gap-2.5"><Upload size={14} className="text-gray-600" /> Import models</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md text-[9px] uppercase tracking-[0.3em] font-bold bg-gray-900 text-white hover:bg-gray-800 transition-colors">
                                <Plus size={13} /> New content <ChevronDown size={11} className="opacity-60" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" side="top" sideOffset={6} className="w-52">
                            <DropdownMenuItem onClick={onNewModel} className="gap-2.5"><Archive size={14} className="text-gray-600" /> New model</DropdownMenuItem>
                            <DropdownMenuItem onClick={onNewArtefact} className="gap-2.5"><FileText size={14} className="text-gray-600" /> New artefact</DropdownMenuItem>
                            <DropdownMenuItem onClick={onNewDossier} className="gap-2.5"><BookOpen size={14} className="text-gray-600" /> New dossier</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={onImportModels} className="gap-2.5"><Upload size={14} className="text-gray-600" /> Import models (CSV / Excel)</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {/* Account + sign out */}
            <div className={`border-t border-gray-200 py-2 space-y-0.5 ${collapsed ? "px-2" : "px-2"}`}>
                <button
                    onClick={() => onNavigate("account")}
                    title={collapsed ? `${user.displayName || "Account"} — ${user.email}` : undefined}
                    className={`w-full flex items-center rounded-md transition-colors ${collapsed ? "justify-center py-2.5 px-0" : "gap-3 px-3 py-2.5"} ${
                        activeView === "account" ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                >
                    <UserCircle size={15} className="flex-shrink-0 text-gray-400" />
                    {!collapsed && (
                        <div className="text-left min-w-0">
                            <p className="text-[10px] font-bold truncate leading-tight">{user.displayName || "Account"}</p>
                            <p className="text-[9px] text-gray-400 truncate">{user.email}</p>
                        </div>
                    )}
                </button>
                <button
                    onClick={onSignOut}
                    title={collapsed ? "Sign out" : undefined}
                    className={`w-full flex items-center rounded-md text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 hover:text-red-500 hover:bg-gray-50 transition-colors ${collapsed ? "justify-center py-2.5 px-0" : "gap-3 px-3 py-2"}`}
                >
                    <LogOut size={13} />
                    {!collapsed && "Sign out"}
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
            <p className="text-2xl font-light uppercase tracking-[0.25em] text-gray-900">NMA</p>
            <p className="text-[9px] uppercase tracking-[0.5em] font-bold text-gray-500">{label}</p>
            <p className="text-sm text-gray-700 leading-relaxed">{message}</p>
            <div className="flex items-center justify-center gap-5 pt-2">
                <a
                    href="/"
                    className="text-[10px] uppercase tracking-[0.3em] font-bold text-gray-600 hover:text-gray-900 transition-colors"
                >
                    Go to site →
                </a>
                <button
                    onClick={() => firebaseSignOut(auth)}
                    className="text-[10px] uppercase tracking-[0.3em] font-bold text-gray-600 hover:text-gray-900 transition-colors"
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
    const [activeView, setActiveView] = useState<ActiveView>(() => {
        if (typeof window === "undefined") return "dashboard";
        const saved = localStorage.getItem("nma_admin_view") as ActiveView | null;
        return saved || "dashboard";
    });

    const setActiveViewPersisted = (view: ActiveView) => {
        setActiveView(view);
        try { localStorage.setItem("nma_admin_view", view); } catch { /* private browsing */ }
    };
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(224);
    const isResizing = useRef(false);
    const startX = useRef(0);
    const startWidth = useRef(0);

    const onResizeStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isResizing.current = true;
        startX.current = e.clientX;
        startWidth.current = sidebarWidth;
        document.body.style.userSelect = "none";
        document.body.style.cursor = "col-resize";
        const onMove = (ev: MouseEvent) => {
            if (!isResizing.current) return;
            const next = Math.max(160, Math.min(400, startWidth.current + ev.clientX - startX.current));
            setSidebarWidth(next);
        };
        const onUp = () => {
            isResizing.current = false;
            document.body.style.userSelect = "";
            document.body.style.cursor = "";
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    }, [sidebarWidth]);
    const [dossierEditorId, setDossierEditorId] = useState<string | null>(null);
    const [dossierEditorOpen, setDossierEditorOpen] = useState(false);
    // Bumped to signal the Artefacts collection to open its create form
    const [artefactCreateNonce, setArtefactCreateNonce] = useState(0);
    const [guideTarget, setGuideTarget] = useState<{ guide: string; anchor?: string; nonce: number }>({
        guide: "README",
        nonce: 0,
    });

    const openDossierEditor = (id: string | null) => {
        setDossierEditorId(id);
        setDossierEditorOpen(true);
        setActiveViewPersisted("dossiers");
    };
    const closeDossierEditor = () => setDossierEditorOpen(false);

    // "New content" menu actions
    const newModel = () => setActiveViewPersisted("add-model");
    const newArtefact = () => {
        setArtefactCreateNonce((n) => n + 1);
        setActiveViewPersisted("artefacts");
    };
    const newDossier = () => openDossierEditor(null);
    const importModels = () => setActiveViewPersisted("import-models");

    // Open the Knowledge Center at a specific guide/section (used by the ? help icons)
    const openGuide = (guide: string, anchor?: string) => {
        setGuideTarget((t) => ({ guide, anchor, nonce: t.nonce + 1 }));
        setActiveViewPersisted("guides");
    };
    const helpFor = (key: string) => () => openGuide(HELP_TARGETS[key].guide, HELP_TARGETS[key].anchor);

    if (status === "loading")
        return (
            <div className={`min-h-screen flex items-center justify-center bg-white ${inter.className}`}>
                <p className="text-[10px] uppercase tracking-[0.5em] text-gray-500">Loading…</p>
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

    const cl = sidebarCollapsed ? 56 : sidebarWidth;

    const renderView = () => {
        switch (effectiveView) {
            case "dashboard":
                return <DashboardView onNavigate={setActiveViewPersisted} />;
            case "models":
                return (
                    <GenericCollection
                        schema={schemas.models}
                        onHelp={helpFor("models")}
                        contentLeft={cl}
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
                    <AddModelPanel onSave={() => setActiveViewPersisted("models")} onCancel={() => setActiveViewPersisted("models")} />
                );
            case "import-models":
                return <ImportModelsPanel onDone={() => setActiveViewPersisted("models")} />;
            case "artefacts":
                return (
                    <GenericCollection
                        schema={schemas.artefacts}
                        onHelp={helpFor("artefacts")}
                        contentLeft={cl}
                        autoCreateNonce={artefactCreateNonce}
                    />
                );
            case "dossiers":
                return (
                    <GenericCollection
                        schema={schemas.dossiers}
                        onHelp={helpFor("dossiers")}
                        contentLeft={cl}
                        onRowClick={(row) => openDossierEditor(row.id as string)}
                        rowActionLabel="Edit dossier →"
                        onAddNew={() => openDossierEditor(null)}
                    />
                );
            case "users":
                return <GenericCollection schema={schemas.users} contentLeft={cl} onHelp={helpFor("users")} />;
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
            {/* Sidebar wrapper — controlled width */}
            <div
                className="relative flex-shrink-0 transition-[width] duration-200"
                style={{ width: sidebarCollapsed ? 56 : sidebarWidth }}
            >
                <Sidebar
                    activeView={effectiveView}
                    user={user}
                    role={role}
                    collapsed={sidebarCollapsed}
                    onNavigate={setActiveViewPersisted}
                    onSignOut={handleSignOut}
                    onNewModel={newModel}
                    onNewArtefact={newArtefact}
                    onNewDossier={newDossier}
                    onImportModels={importModels}
                    onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
                />

                {/* Resize handle — only when expanded */}
                {!sidebarCollapsed && (
                    <div
                        onMouseDown={onResizeStart}
                        className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize hover:bg-stone-300 transition-colors z-20"
                    />
                )}
            </div>

            <main className="flex-1 min-h-0 overflow-y-auto">
                <div className="p-6 max-w-[1400px] mx-auto">
                    <div className="bg-white rounded-xl shadow-[0_2px_20px_rgba(0,0,0,0.08)] px-8 py-8">
                        {renderView()}
                    </div>
                </div>
            </main>

            {/* Dossier editor — floating panel portal */}
            {dossierEditorOpen && typeof window !== "undefined" && createPortal(
                <>
                    <div
                        className="fixed inset-0 bg-gray-900/30 z-40 animate-in fade-in duration-200"
                        onClick={closeDossierEditor}
                    />
                    <div
                        className="fixed z-50 bg-white shadow-[0_8px_40px_rgba(0,0,0,0.18)] flex flex-col font-sans rounded-xl overflow-hidden animate-in slide-in-from-right-4 fade-in duration-200"
                        style={{ top: 24, bottom: 24, left: cl + 24, right: 24 }}
                    >
                        <DossierEditor
                            dossierId={dossierEditorId}
                            onBack={closeDossierEditor}
                            onHelp={() => { closeDossierEditor(); helpFor("dossiers")(); }}
                        />
                    </div>
                </>,
                document.body
            )}
        </div>
    );
};

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const getNMASchemas = () => ({
    models: {
        name: "Models",
        path: "ma_models",
        idField: "modelNumber",
        siteUrlTemplate: "/en/models/{id}",
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
            images: { name: "Images", dataType: "imageGallery", tableVisible: true, tableWidth: 72 },
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
        siteUrlTemplate: "/dossiers/{slug}",
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

            // ── Image management ──
            images: { name: "Images (upload pool)", dataType: "imageGallery", tableVisible: false },
            featuredImages: { name: "Featured images", dataType: "featuredImages", tableVisible: false },
            imageGroups: { name: "Image groups", dataType: "imageGroups", tableVisible: false },
            // items: DossierItem[] — managed exclusively via DossierEditor, not shown in generic table
        },
    },

    artefacts: {
        name: "Artefacts",
        path: "ma_artefacts",
        idField: "slug",
        siteUrlTemplate: "/artefacts/{slug}",
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
                tableWidth: 140,
            },
            type: {
                name: "Type",
                dataType: "string",
                tableVisible: true,
                tableWidth: 90,
                config: { enumValues: ["image", "audio", "video", "document", "text", "interview"] },
                defaultValue: "image",
            },
            isVisible: {
                name: "Published",
                dataType: "boolean",
                defaultValue: false,
                tableVisible: true,
                tableWidth: 90,
            },
            modelNumber: { name: "Model #", dataType: "string", tableVisible: true, tableWidth: 80 },
            photographer: { name: "Photographer", dataType: "string", tableVisible: true, tableWidth: 140 },
            usedInDossiers: {
                name: "Used in dossiers",
                dataType: "array",
                tableVisible: true,
                tableWidth: 200,
                of: { dataType: "string" },
            },

            // ── Links ──
            modelId: { name: "Linked model (doc ID)", dataType: "string", tableVisible: false },
            tags: { name: "Tags", dataType: "array", tableVisible: false, tableWidth: 130, of: { dataType: "string" } },
            publishDate: { name: "Date", dataType: "date", tableVisible: false, tableWidth: 100 },
            author: { name: "Author / credit", dataType: "string", tableVisible: false, tableWidth: 140 },

            // ── Content (for text / interview artefacts) ──
            excerpt: { name: "Excerpt", dataType: "string", tableVisible: false, tableWidth: 280, multiline: true },
            content: { name: "Content", dataType: "string", tableVisible: false, tableWidth: 300, markdown: true },

            // ── Media ──
            audioUrl: { name: "Audio file", dataType: "audioUpload", tableVisible: false },

            // ── Image management ──
            images: { name: "Images (upload pool)", dataType: "imageGallery", tableVisible: false },
            featuredImages: { name: "Featured images", dataType: "featuredImages", tableVisible: false },
            imageGroups: { name: "Image groups", dataType: "imageGroups", tableVisible: false },
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
