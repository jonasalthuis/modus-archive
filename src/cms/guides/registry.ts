// ─── Knowledge Center registry ──────────────────────────────────────────────
// Single source of truth: the Markdown files in /docs are imported as raw strings
// (see next.config.ts webpack rule + src/types/markdown.d.ts) and rendered in-app.

import overviewDoc from "../../../docs/README.md";
import adminGuideDoc from "../../../docs/admin-guide.md";
import accessDoc from "../../../docs/access-and-invites.md";
import contentDoc from "../../../docs/content-and-urls.md";
import securityDoc from "../../../docs/security.md";

export interface Guide {
    id: string; // also the filename stem, so internal ./x.md links resolve
    title: string;
    description: string;
    content: string;
}

export const GUIDES: Guide[] = [
    {
        id: "README",
        title: "Overview",
        description: "Start here — what the system is and how it fits together.",
        content: overviewDoc,
    },
    {
        id: "admin-guide",
        title: "Admin Guide",
        description: "Day-to-day content work: models, artefacts, dossiers, images, audio.",
        content: adminGuideDoc,
    },
    {
        id: "access-and-invites",
        title: "Access & Invites",
        description: "Site login, staff accounts, and guest access codes.",
        content: accessDoc,
    },
    {
        id: "content-and-urls",
        title: "Content & URLs",
        description: "Identifiers, slugs, visibility, and the full field reference.",
        content: contentDoc,
    },
    {
        id: "security",
        title: "Security",
        description: "How the archive is protected, and the remaining console steps.",
        content: securityDoc,
    },
];

// Shared slug function — used both to assign heading ids and to resolve ? deep-links.
export const headingSlug = (s: string) =>
    s
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

// Where each backend page's "?" help icon points.
// { guide: <Guide.id>, anchor: <slug of a heading in that guide> }
export interface HelpTarget {
    guide: string;
    anchor?: string;
}

export const HELP_TARGETS: Record<string, HelpTarget> = {
    models: { guide: "admin-guide", anchor: "6-editing-a-model-full-detail" },
    "add-model": { guide: "admin-guide", anchor: "5-adding-a-model-with-photos-the-fast-way" },
    artefacts: { guide: "admin-guide", anchor: "7-artefacts-texts-writings" },
    dossiers: { guide: "admin-guide", anchor: "8-dossiers-curated-thematic-pages" },
    users: { guide: "admin-guide", anchor: "9-users" },
    invites: { guide: "access-and-invites", anchor: "3-guest-access-codes-invites" },
};
