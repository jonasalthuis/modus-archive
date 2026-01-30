"use client";

import React from "react";
import { CMSEngine } from "@/cms/engine";
import { CMSDashboard } from "@/components/repo-ui";

/**
 * Modus Archive Admin Page.
 * Uses the siloed archival engine and shared dashboard layout.
 */
export default function AdminPage() {
    return (
        <CMSDashboard
            title="Archival Mission Control"
            appName="MODUS"
            sidebarItems={[
                { label: "Dashboard", href: "/admin" },
                { label: "Models", href: "/admin/ma_models" },
                { label: "Articles", href: "/admin/ma_articles" },
            ]}
            userInitials="MA"
        >
            <CMSEngine name="Archival Mission Control" />
        </CMSDashboard>
    );
}
