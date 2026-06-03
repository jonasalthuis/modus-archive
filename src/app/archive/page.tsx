import { redirect } from "next/navigation";

// The archive universe now lives at the landing page. Keep this route as a
// redirect so old links and bookmarks to /archive don't 404.
export default function ArchiveRedirect() {
    redirect("/");
}
