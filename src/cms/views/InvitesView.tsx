"use client";

import React, { useState, useEffect, useCallback } from "react";
import { collection, getDocs, addDoc, updateDoc, doc, orderBy, query, Timestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Copy, Check, X, Plus, Link as LinkIcon, RefreshCw } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Invite {
    id: string;
    code: string;
    label: string;
    createdAt: Timestamp;
    expiresAt: Timestamp;
    maxUses: number | null;
    useCount: number;
    isRevoked: boolean;
    createdBy: string;
}

type InviteStatus = "active" | "expired" | "exhausted" | "revoked";

// ── Helpers ────────────────────────────────────────────────────────────────────

const SAFE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L

function genCode(): string {
    const seg = () =>
        Array.from({ length: 4 }, () => SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)]).join("");
    return `NMA-${seg()}-${seg()}`;
}

function getStatus(invite: Invite): InviteStatus {
    if (invite.isRevoked) return "revoked";
    if (invite.expiresAt.toDate() < new Date()) return "expired";
    if (invite.maxUses !== null && invite.useCount >= invite.maxUses) return "exhausted";
    return "active";
}

const STATUS_STYLES: Record<InviteStatus, string> = {
    active: "text-gray-900 bg-gray-900/10",
    expired: "text-gray-500 bg-gray-200",
    exhausted: "text-gray-500 bg-gray-200",
    revoked: "text-red-500 bg-red-50",
};

function fmtDate(ts: Timestamp): string {
    return ts.toDate().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtRelative(ts: Timestamp): string {
    const diff = ts.toDate().getTime() - Date.now();
    if (diff < 0) return "Expired";
    const d = Math.floor(diff / 86_400_000);
    if (d === 0) return "Today";
    if (d === 1) return "Tomorrow";
    return `${d}d`;
}

function getSiteOrigin(): string {
    if (typeof window !== "undefined") return window.location.origin;
    return "https://modus-archive.com";
}

// ── Component ──────────────────────────────────────────────────────────────────

export const InvitesView = () => {
    const [invites, setInvites] = useState<Invite[]>([]);
    const [loading, setLoading] = useState(true);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [revoking, setRevoking] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);

    // Form state
    const [formLabel, setFormLabel] = useState("");
    const [formExpiry, setFormExpiry] = useState("7");
    const [formMaxUses, setFormMaxUses] = useState<string>("1");
    const [formSaving, setFormSaving] = useState(false);
    const [previewCode] = useState(genCode);

    const fetchInvites = useCallback(async () => {
        setLoading(true);
        try {
            const snap = await getDocs(query(collection(db, "ma_invites"), orderBy("createdAt", "desc")));
            setInvites(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Invite));
        } catch (e) {
            console.error("Invites fetch error:", e);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchInvites();
    }, [fetchInvites]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormSaving(true);
        try {
            const now = new Date();
            const expiresAt = new Date(now.getTime() + Number(formExpiry) * 86_400_000);
            const maxUses = formMaxUses === "unlimited" ? null : Number(formMaxUses);

            await addDoc(collection(db, "ma_invites"), {
                code: genCode(),
                label: formLabel.trim() || "Untitled invite",
                createdAt: Timestamp.fromDate(now),
                expiresAt: Timestamp.fromDate(expiresAt),
                maxUses,
                useCount: 0,
                isRevoked: false,
                createdBy: auth.currentUser?.email ?? "unknown",
            });

            setFormLabel("");
            setFormExpiry("7");
            setFormMaxUses("1");
            setShowForm(false);
            await fetchInvites();
        } catch (e) {
            console.error("Create invite error:", e);
            alert("Failed to create invite.");
        }
        setFormSaving(false);
    };

    const handleRevoke = async (invite: Invite) => {
        if (!confirm(`Revoke code "${invite.code}" for "${invite.label}"? This cannot be undone.`)) return;
        setRevoking(invite.id);
        try {
            await updateDoc(doc(db, "ma_invites", invite.id), { isRevoked: true });
            setInvites((prev) => prev.map((i) => (i.id === invite.id ? { ...i, isRevoked: true } : i)));
        } catch (e) {
            console.error("Revoke error:", e);
        }
        setRevoking(null);
    };

    const copyLink = async (invite: Invite) => {
        const url = `${getSiteOrigin()}/?code=${invite.code}`;
        await navigator.clipboard.writeText(url);
        setCopiedId(invite.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const copyCode = async (invite: Invite) => {
        await navigator.clipboard.writeText(invite.code);
        setCopiedId(invite.id + "-code");
        setTimeout(() => setCopiedId(null), 2000);
    };

    const activeCount = invites.filter((i) => getStatus(i) === "active").length;
    const totalUses = invites.reduce((s, i) => s + i.useCount, 0);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center pb-6 border-b border-black">
                <div>
                    <h2 className="text-2xl font-light uppercase tracking-widest">Invites</h2>
                    {!loading && (
                        <p className="text-[9px] font-mono text-gray-500 mt-1">
                            {activeCount} active · {invites.length} total · {totalUses} total uses
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchInvites}
                        className="p-2 border border-gray-400 text-gray-500 hover:text-gray-900 hover:border-gray-900 transition-colors"
                    >
                        <RefreshCw size={13} />
                    </button>
                    <button
                        onClick={() => setShowForm((v) => !v)}
                        className={`flex items-center gap-2 px-4 py-2.5 uppercase text-[10px] font-bold tracking-widest transition-colors ${
                            showForm ? "bg-gray-300 text-gray-900" : "bg-black text-white hover:bg-gray-800"
                        }`}
                    >
                        <Plus size={13} /> Generate invite
                    </button>
                </div>
            </div>

            {/* ── Generate form ── */}
            {showForm && (
                <form onSubmit={handleCreate} className="border border-gray-400 p-6 space-y-5 bg-gray-100">
                    <div className="flex items-center gap-3">
                        <p className="text-[9px] uppercase tracking-[0.4em] font-bold text-gray-600">New invite</p>
                        <div className="flex-1 h-px bg-gray-300" />
                        <span className="text-[10px] font-mono text-gray-500 select-all">{previewCode}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1 space-y-1">
                            <label className="text-[9px] uppercase tracking-[0.3em] font-bold text-gray-600 block">
                                Label
                            </label>
                            <input
                                type="text"
                                value={formLabel}
                                onChange={(e) => setFormLabel(e.target.value)}
                                placeholder="e.g. Guest preview — Alessandro"
                                className="w-full border border-gray-400 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-black transition-colors"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[9px] uppercase tracking-[0.3em] font-bold text-gray-600 block">
                                Expires after
                            </label>
                            <select
                                value={formExpiry}
                                onChange={(e) => setFormExpiry(e.target.value)}
                                className="w-full border border-gray-400 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-black"
                            >
                                <option value="1">1 day</option>
                                <option value="3">3 days</option>
                                <option value="7">7 days</option>
                                <option value="30">30 days</option>
                                <option value="90">90 days</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[9px] uppercase tracking-[0.3em] font-bold text-gray-600 block">
                                Max uses
                            </label>
                            <select
                                value={formMaxUses}
                                onChange={(e) => setFormMaxUses(e.target.value)}
                                className="w-full border border-gray-400 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-black"
                            >
                                <option value="1">1 — one time</option>
                                <option value="3">3 uses</option>
                                <option value="5">5 uses</option>
                                <option value="10">10 uses</option>
                                <option value="unlimited">Unlimited</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="px-5 py-2.5 text-[10px] uppercase tracking-widest font-bold text-gray-500 hover:text-gray-900 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={formSaving}
                            className="bg-black text-white px-6 py-2.5 uppercase text-[10px] font-bold tracking-widest hover:bg-gray-800 disabled:opacity-40 transition-colors"
                        >
                            {formSaving ? "Generating…" : "Generate"}
                        </button>
                    </div>
                </form>
            )}

            {/* ── Invites table ── */}
            {loading ? (
                <p className="text-[10px] uppercase tracking-[0.4em] text-gray-500 animate-pulse py-8 text-center">
                    Loading…
                </p>
            ) : invites.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-gray-400">
                    <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400">No invites yet</p>
                    <p className="text-[11px] text-gray-500 mt-2">
                        Click "Generate invite" to create your first access code.
                    </p>
                </div>
            ) : (
                <div className="border border-gray-400">
                    {/* Table header */}
                    <div className="grid grid-cols-[1fr_1.5fr_100px_80px_80px_120px] gap-0 border-b-2 border-gray-400 bg-gray-200">
                        {["Code", "Label", "Expires", "Uses", "Status", ""].map((h) => (
                            <div
                                key={h}
                                className="px-4 py-3 text-[9px] uppercase tracking-[0.3em] font-bold text-gray-700"
                            >
                                {h}
                            </div>
                        ))}
                    </div>

                    {/* Rows */}
                    {invites.map((invite, i) => {
                        const status = getStatus(invite);
                        const isLast = i === invites.length - 1;
                        return (
                            <div
                                key={invite.id}
                                className={`grid grid-cols-[1fr_1.5fr_100px_80px_80px_120px] gap-0 items-center ${
                                    !isLast ? "border-b border-gray-400" : ""
                                } ${status === "active" ? "hover:bg-gray-100" : "opacity-60"} transition-colors`}
                            >
                                {/* Code */}
                                <div className="px-4 py-3">
                                    <span className="text-[11px] font-mono text-gray-800 select-all">
                                        {invite.code}
                                    </span>
                                </div>

                                {/* Label */}
                                <div className="px-4 py-3">
                                    <span className="text-[11px] text-gray-700 truncate block">{invite.label}</span>
                                    <span className="text-[9px] font-mono text-gray-400">
                                        {fmtDate(invite.createdAt)} · {invite.createdBy}
                                    </span>
                                </div>

                                {/* Expires */}
                                <div className="px-4 py-3">
                                    <span
                                        className="text-[11px] font-mono text-gray-600"
                                        title={fmtDate(invite.expiresAt)}
                                    >
                                        {fmtRelative(invite.expiresAt)}
                                    </span>
                                </div>

                                {/* Uses */}
                                <div className="px-4 py-3">
                                    <span className="text-[11px] font-mono text-gray-600">
                                        {invite.useCount}
                                        {invite.maxUses !== null ? `/${invite.maxUses}` : ""}
                                    </span>
                                </div>

                                {/* Status */}
                                <div className="px-4 py-3">
                                    <span
                                        className={`text-[8px] uppercase tracking-[0.2em] font-bold px-2 py-0.5 ${STATUS_STYLES[status]}`}
                                    >
                                        {status}
                                    </span>
                                </div>

                                {/* Actions */}
                                <div className="px-3 py-3 flex items-center gap-1 justify-end">
                                    {/* Copy code */}
                                    <button
                                        onClick={() => copyCode(invite)}
                                        title="Copy code"
                                        className="p-1.5 text-gray-500 hover:text-gray-900 transition-colors"
                                    >
                                        {copiedId === invite.id + "-code" ? (
                                            <Check size={12} className="text-gray-900" />
                                        ) : (
                                            <span className="text-[8px] font-mono font-bold">CODE</span>
                                        )}
                                    </button>

                                    {/* Copy link */}
                                    <button
                                        onClick={() => copyLink(invite)}
                                        title="Copy invite link"
                                        className="p-1.5 text-gray-500 hover:text-gray-900 transition-colors"
                                    >
                                        {copiedId === invite.id ? (
                                            <Check size={12} className="text-gray-900" />
                                        ) : (
                                            <LinkIcon size={12} />
                                        )}
                                    </button>

                                    {/* Revoke */}
                                    {!invite.isRevoked && (
                                        <button
                                            onClick={() => handleRevoke(invite)}
                                            disabled={revoking === invite.id}
                                            title="Revoke this invite"
                                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* How-to note */}
            <div className="border-l-2 border-gray-400 pl-4 space-y-1">
                <p className="text-[9px] uppercase tracking-[0.3em] font-bold text-gray-500">How to share</p>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                    Copy a <strong className="text-gray-700">link</strong> to send the full URL — recipients click it
                    and are admitted automatically. Or copy just the <strong className="text-gray-700">code</strong>{" "}
                    for them to enter manually on the access page.
                </p>
            </div>
        </div>
    );
};
