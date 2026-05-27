"use client";

import React from "react";
import { CMSEngine } from "@/cms/engine";
import { CMSDashboard } from "@/components/repo-ui";

export default function AdminPage() {
    return (
        <CMSDashboard
            title="NMA Admin"
            appName="NMA"
            sidebarItems={[
                { label: "Dashboard", href: "/admin" },
                { label: "Models", href: "/admin/ma_models" },
                { label: "Articles", href: "/admin/ma_articles" },
            ]}
            userInitials="NMA"
        >
            <CMSEngine name="NMA Admin" />
        </CMSDashboard>
    );
}
