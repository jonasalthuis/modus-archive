// Server-only Firebase Admin helpers — for verifying a caller's identity/role
// inside Next.js Route Handlers, where the client Firestore SDK's security
// rules don't apply (server code talks to Firestore/Auth with full privilege,
// so *we* are the enforcement point here).
//
// Uses Application Default Credentials — the same mechanism the existing
// /api/analytics route already relies on for the GA4 client — so no key
// file or extra config is needed in App Hosting / Cloud Run.
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Pass projectId explicitly — bare initializeApp() relies on
// GOOGLE_CLOUD_PROJECT being set, which isn't guaranteed in every runtime
// (e.g. local `pnpm dev` with only `gcloud auth application-default login`).
const adminApp = getApps().length
    ? getApps()[0]
    : initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });

const BOOTSTRAP_ADMINS = ["jonasalthuis@gmail.com"];

/**
 * Verifies the bearer ID token on a request and checks the caller has a
 * staff role (admin/editor), mirroring `isStaff()` in firestore.rules.
 * Returns the caller's email on success, or null if unauthenticated/unauthorised.
 */
export async function requireStaff(req: Request): Promise<string | null> {
    const authHeader = req.headers.get("authorization") ?? "";
    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) return null;

    try {
        const decoded = await getAuth(adminApp).verifyIdToken(match[1]);
        const email = decoded.email;
        if (!email) return null; // anonymous guests have no email — never staff

        if (BOOTSTRAP_ADMINS.includes(email)) return email;

        const snap = await getFirestore(adminApp).doc(`users/${email}`).get();
        const role = snap.exists ? (snap.data()?.role as string | undefined) : undefined;
        return role === "admin" || role === "editor" ? email : null;
    } catch (e) {
        // Fails CLOSED on any error (expired/invalid token, or an infra hiccup
        // reaching Firestore) — worst case staff briefly can't see analytics,
        // never that an unauthorised caller gets through.
        console.error("requireStaff check failed:", e);
        return null;
    }
}
