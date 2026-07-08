import * as admin from "firebase-admin";
import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";

// Initialize Firestore if not already done

const KEYFILEPATH = process.env.SERVICE_ACCOUNT_KEY_PATH!;

// Define the scopes for Google Sheets API
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"];

/**
 * Main logic to sync data from Google Sheets to Firestore
 * @param spreadsheetId The ID of the Google Sheet
 * @param range The range to fetch (e.g., 'Sheet1!A:Z')
 */
export async function syncSheetsToFirestore(spreadsheetId: string, range: string) {
    const db = admin.firestore();
    try {
        const auth = new GoogleAuth({
            keyFile: KEYFILEPATH,
            scopes: SCOPES,
        });

        const sheets = google.sheets({ version: "v4", auth });

        // Fetch the data from the sheet
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });

        const rows = response.data.values;
        if (!rows || rows.length < 4) {
            console.log("No data found or insufficient rows for headers on row 4.");
            return { success: true, count: 0 };
        }

        // Headers are on Row 4 (index 3)
        const headers = rows[3];
        const dataRows = rows.slice(4); // Data starts from Row 5

        const batch = db.batch();
        let count = 0;
        const skippedRows: any[] = [];

        for (const row of dataRows) {
            const modelData: any = {};

            headers.forEach((header, index) => {
                if (!header) return; // Skip columns without headers

                const key = header.toString().trim().toUpperCase();
                let value = row[index];

                // Firestore doesn't like 'undefined'
                if (value === undefined) value = null;

                // Precise mapping based on the screenshot
                if (key === "REF") {
                    modelData.modelNumber = value;
                } else if (key === "YEAR") {
                    modelData.year = value;
                } else if (key === "PROJECT AND PHASE") {
                    modelData.title = value;
                } else if (key === "ARCHITECT/DESIGNER") {
                    modelData.architect = value;
                } else if (key === "SCALE") {
                    modelData.scale = value;
                } else if (key === "MODEL MATERIALS") {
                    modelData.materials = (value && typeof value === 'string') ? value.split(",").map((s: string) => s.trim()) : (value || []);
                } else if (key === "MODEL SIZE") {
                    modelData.size = value;
                } else if (key === "BUILDING LOCATION") {
                    modelData.location = value;
                } else {
                    // Generic mapping for everything else
                    const camelKey = header.toString()
                        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word: string, idx: number) => idx === 0 ? word.toLowerCase() : word.toUpperCase())
                        .replace(/[^\w\s]/gi, '')
                        .replace(/\s+/g, "");

                    if (camelKey) {
                        modelData[camelKey] = value;
                    }
                }
            });

            // Using REF as the unique document ID
            if (modelData.modelNumber && modelData.modelNumber.toString().trim() !== "") {
                const rawId = modelData.modelNumber.toString().trim();
                // Ensure 0001 format if it's a number, otherwise use raw string
                const docId = isNaN(Number(rawId)) ? rawId : rawId.padStart(4, '0');

                const docRef = db.collection("ma_models").doc(docId);

                batch.set(docRef, {
                    ...modelData,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
                count++;
            } else {
                skippedRows.push(row);
            }
        }

        if (count > 0) {
            await batch.commit();
        }

        console.log(`Successfully synced ${count} models.`);
        return {
            success: true,
            count,
            headers,
            totalRows: dataRows.length,
            skippedCount: skippedRows.length
        };

    } catch (error) {
        console.error("Error in syncSheetsToFirestore:", error);
        throw error;
    }
}
