import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { google } from "googleapis";

admin.initializeApp();
const db = admin.firestore();

const BOOTSTRAP_ADMINS = ["jonasalthuis@gmail.com"]; // mirrors src/lib/auth.tsx

/**
 * Verifies the caller sent a valid Firebase ID token belonging to a staff
 * account (admin/editor), mirroring isStaff() in firestore.rules. This
 * function has full Firestore write + Google Sheets read access, so it must
 * not be publicly triggerable.
 */
async function requireStaff(req: functions.https.Request): Promise<string | null> {
    const authHeader = req.get("authorization") ?? "";
    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) return null;

    try {
        const decoded = await admin.auth().verifyIdToken(match[1]);
        const email = decoded.email;
        if (!email) return null; // anonymous guests have no email — never staff

        if (BOOTSTRAP_ADMINS.includes(email)) return email;

        const snap = await db.doc(`users/${email}`).get();
        const role = snap.exists ? (snap.data()?.role as string | undefined) : undefined;
        return role === "admin" || role === "editor" ? email : null;
    } catch (e) {
        console.error("requireStaff check failed:", e);
        return null; // fail closed on any error (expired/invalid token, etc.)
    }
}

/**
 * Syncs data from Google Sheets to Firestore ma_models collection.
 * Staff-only (see requireStaff). Authenticates to the Sheets API as this
 * function's own runtime service account (Application Default Credentials)
 * — the target spreadsheet must be shared (Viewer) with that account's
 * email, e.g. `modus-archive-nexus@appspot.gserviceaccount.com` for the
 * default Gen 1 runtime SA. No key file needed or wanted.
 */
export const syncModelsFromSheet = functions.https.onRequest(async (req, res) => {
    const staffEmail = await requireStaff(req);
    if (!staffEmail) {
        res.status(401).send("Unauthorized");
        return;
    }

    try {
        const spreadsheetId = process.env.SPREADSHEET_ID || "1VellbnjPuxdd405OQv6kTdFAlupbCdfWJmY5CagDhhM";
        const range = "Sheet1!A2:AA1000"; // Starting at row 2 to skip headers

        const auth = new google.auth.GoogleAuth({
            scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
        });

        const sheets = google.sheets({ version: "v4", auth: auth as any });
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            res.status(200).send("No data found in sheet.");
            return;
        }

        const batch = db.batch();
        const collectionRef = db.collection("ma_models");

        rows.forEach((row) => {
            // Mapping logic based on user provided headers
            const modelData = {
                modelNumber: row[0] || "",
                year: parseInt(row[1]) || null,
                rating: row[2] || "",
                scale: row[3] || "",
                architect: row[4] || "",
                title: row[5] || "",
                buildingStatus: row[6] || "",
                location: row[7] || "",
                buildingType: row[8] || "",
                modelSize: row[9] || "",
                materials: row[10] ? row[10].split(",").map((s: string) => s.trim()) : [],
                modelType: row[11] || "",
                purpose: row[12] || "",
                leadMaker: row[13] || "",
                otherMakers: row[14] || "",
                raStudio: row[15] || "",
                // 16: FEE, 17: FEE EQUIV, 18: INVOICE, 19: LIAISON
                photographer: row[20] || "",
                // 21: EXHIBITION
                provenance: row[23] || "",
                archivalMaterial: row[24] || "",
                // 25: OLD JOB NUMBER
                notes: row[26] || "",
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            // Use REF as the document ID for stability, sanitizing for Firestore
            if (modelData.modelNumber) {
                const id = modelData.modelNumber.toString().replace(/\//g, "-").trim();
                const docRef = collectionRef.doc(id);
                batch.set(docRef, modelData, { merge: true });
            }
        });

        await batch.commit();
        res.status(200).send(`Successfully synced ${rows.length} models to ma_models. (triggered by ${staffEmail})`);
    } catch (error: any) {
        console.error("Sync Error:", error);
        res.status(500).send(`Error syncing data: ${error.message}`);
    }
});
