import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { google } from "googleapis";
import * as path from "path";

admin.initializeApp();
const db = admin.firestore();

/**
 * Syncs data from Google Sheets to Firestore ma_models collection.
 * Uses the service account key provided by the user.
 */
export const syncModelsFromSheet = functions.https.onRequest(async (req, res) => {
    try {
        // 1. Setup Auth
        const keyPath = process.env.SERVICE_ACCOUNT_KEY_PATH || path.join(__dirname, "..", "sidenotenexus-dc9441f42cca.json");

        const spreadsheetId = process.env.SPREADSHEET_ID || "1VellbnjPuxdd405OQv6kTdFAlupbCdfWJmY5CagDhhM";
        const range = "Sheet1!A2:AA1000"; // Starting at row 2 to skip headers

        if (!spreadsheetId) {
            console.error("SPREADSHEET_ID not configured.");
            res.status(500).send("Server configuration error: SPREADSHEET_ID missing.");
            return;
        }

        const auth = new google.auth.GoogleAuth({
            keyFile: keyPath,
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
        res.status(200).send(`Successfully synced ${rows.length} models to ma_models.`);
    } catch (error: any) {
        console.error("Sync Error:", error);
        res.status(500).send(`Error syncing data: ${error.message}`);
    }
});
