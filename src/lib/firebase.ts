import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Singleton — prevents re-initialisation across hot reloads
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ── App Check ──────────────────────────────────────────────────────────────
// Ties requests to this real app (reCAPTCHA v3) so the public API keys can't be
// abused from random scripts. No-ops gracefully until a site key is configured.
// Set NEXT_PUBLIC_RECAPTCHA_SITE_KEY once App Check is registered in the console.
// For localhost, set NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN (or "true") to get a debug token.
if (typeof window !== "undefined") {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (siteKey) {
        const debugToken = process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN;
        if (debugToken) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken === "true" ? true : debugToken;
        }
        try {
            initializeAppCheck(app, {
                provider: new ReCaptchaV3Provider(siteKey),
                isTokenAutoRefreshEnabled: true,
            });
        } catch (e) {
            console.warn("App Check init skipped:", e);
        }
    }
}

// Analytics — client-side only, lazy-initialised
let analytics: Analytics | null = null;
if (typeof window !== "undefined") {
    isSupported()
        .then((yes) => {
            if (yes) analytics = getAnalytics(app);
        })
        .catch(() => {
            /* analytics not available */
        });
}

export { app, auth, db, storage, analytics };
