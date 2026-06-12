/**
 * Upload prototype model images to Firebase Storage and write URLs to Firestore.
 *
 * Structure expected:
 *   project_files/protoype_wood_models/_Architect/NNNN - Model Name/photo.jpg
 *
 * Processing:
 *   - Only JPEGs (skips TIFFs, docx, etc.)
 *   - Downscaled to max 1600px on longest edge, re-encoded at JPEG quality 82
 *   - Stored at:  models/images/{modelId}/{timestamp}-{safeName}.jpg
 *   - Firestore:  ma_models/{modelId}.images = [{url, isStarred}]
 *   - Models that already have images are skipped (safe to re-run)
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const admin = require('/Users/jonasalthuis/Documents/WORK/PROJECTS/SideNote/modus-archive/functions/node_modules/firebase-admin');
const sharp = require('/Users/jonasalthuis/Documents/WORK/PROJECTS/SideNote/modus-archive/node_modules/.pnpm/sharp@0.33.5/node_modules/sharp');

// ── Config ──────────────────────────────────────────────────────────────────

const IMAGE_ROOT = path.resolve(__dirname, '../project_files/protoype_wood_models');
const MAX_EDGE   = 1600;
const QUALITY    = 82;
const CONCURRENCY = 3; // uploads in parallel per model

// ── Firebase init ────────────────────────────────────────────────────────────

admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'modus-archive-nexus',
    storageBucket: 'modus-archive-nexus.firebasestorage.app',
});

const db      = admin.firestore();
const bucket  = admin.storage().bucket();

// ── Helpers ──────────────────────────────────────────────────────────────────

function isImage(filename) {
    return /\.(jpg|jpeg|webp)$/i.test(filename);
}

/** Extract zero-padded 4-digit model ID from folder name like "0077 - Muller House" */
function extractModelId(folderName) {
    const m = folderName.match(/^(\d{4})/);
    return m ? m[1] : null;
}

// Explicit mappings for folders whose names don't start with a model number.
// key = folder name under the architect folder, value = Firestore model ID.
const FOLDER_ID_MAP = {
    'V&A Chiswick House': '0597',
    // John Pawson (Gramercy, Design Museum, Piozzano) have no Firestore docs yet.
};

/** Recursively collect JPEG/WEBP paths under a directory. */
function walkImages(dir, out) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { return; }
    for (const e of entries) {
        if (e.isDirectory()) walkImages(path.join(dir, e.name), out);
        else if (e.isFile() && isImage(e.name)) out.push(path.join(dir, e.name));
    }
}

/** Collect { modelId → [absoluteImagePaths] } from the image root. */
function collectModels(rootDir) {
    const models = new Map();
    const architectFolders = fs.readdirSync(rootDir, { withFileTypes: true })
        .filter(e => e.isDirectory())
        .map(e => path.join(rootDir, e.name));

    for (const archDir of architectFolders) {
        const modelFolders = fs.readdirSync(archDir, { withFileTypes: true })
            .filter(e => e.isDirectory());

        for (const mf of modelFolders) {
            const modelId = extractModelId(mf.name) ?? FOLDER_ID_MAP[mf.name];
            if (!modelId) {
                console.warn(`  ⚠ Skipping unrecognised folder: ${mf.name}`);
                continue;
            }
            const modelDir = path.join(archDir, mf.name);
            const images = [];
            walkImages(modelDir, images);
            images.sort();

            if (images.length > 0) {
                if (models.has(modelId)) {
                    models.get(modelId).push(...images);
                } else {
                    models.set(modelId, images);
                }
            }
        }
    }
    return models;
}

/** Downscale to web resolution and re-encode as JPEG. Handles JPEG, WEBP input. */
async function processImage(filePath) {
    return sharp(filePath)
        .rotate()                   // honour EXIF orientation
        .resize(MAX_EDGE, MAX_EDGE, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: QUALITY, mozjpeg: true })
        .toBuffer();
}

/** Upload one image buffer to Storage, return its Firebase download URL. */
async function uploadBuffer(buffer, modelId, originalName) {
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.[^.]+$/, '.jpg');
    const dest = `models/images/${modelId}/${Date.now()}-${safeName}`;
    const token = crypto.randomUUID();
    const file = bucket.file(dest);
    await file.save(buffer, {
        metadata: {
            contentType: 'image/jpeg',
            // Embed the download token so the URL works under Firebase Storage rules.
            // This mirrors exactly what the Firebase client SDK does when you call getDownloadURL().
            metadata: { firebaseStorageDownloadTokens: token },
        },
    });
    const encoded = encodeURIComponent(dest);
    return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encoded}?alt=media&token=${token}`;
}

/** Run fn on items, at most concurrency at a time. */
async function pMap(items, fn, concurrency) {
    const results = [];
    for (let i = 0; i < items.length; i += concurrency) {
        const chunk = items.slice(i, i + concurrency);
        const chunkResults = await Promise.all(chunk.map(fn));
        results.push(...chunkResults);
    }
    return results;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function run() {
    console.log('Scanning image directory…');
    const models = collectModels(IMAGE_ROOT);
    console.log(`Found ${models.size} model folders with JPEG images.\n`);

    // Load Firestore docs for all found models in one batch
    const docRefs = [...models.keys()].map(id => db.collection('ma_models').doc(id));
    const snapshots = await Promise.all(docRefs.map(r => r.get()));
    const existing = new Map(snapshots.map(s => [s.id, s.data()]));

    let uploaded = 0, skipped = 0, errors = 0;

    for (const [modelId, imagePaths] of models) {
        const docData = existing.get(modelId);
        if (!docData) {
            console.log(`  ⚠  ${modelId} — not found in Firestore, skipping`);
            skipped++;
            continue;
        }
        if (Array.isArray(docData.images) && docData.images.length > 0) {
            console.log(`  ·  ${modelId} — already has ${docData.images.length} image(s), skipping`);
            skipped++;
            continue;
        }

        console.log(`  ↑  ${modelId} — uploading ${imagePaths.length} image(s)…`);
        try {
            const urls = await pMap(imagePaths, async (imgPath, idx) => {
                const buffer = await processImage(imgPath);
                const url = await uploadBuffer(buffer, modelId, path.basename(imgPath));
                process.stdout.write(`     [${idx + 1}/${imagePaths.length}] ${path.basename(imgPath)} → done\n`);
                return url;
            }, CONCURRENCY);

            const imageObjects = urls.map((url, i) => ({
                url,
                isStarred: i === 0, // first image is the featured one
            }));

            await db.collection('ma_models').doc(modelId).update({ images: imageObjects });
            console.log(`  ✓  ${modelId} — ${urls.length} image(s) saved to Firestore\n`);
            uploaded++;
        } catch (err) {
            console.error(`  ✗  ${modelId} — ERROR: ${err.message}\n`);
            errors++;
        }
    }

    console.log('─'.repeat(50));
    console.log(`Done.  Uploaded: ${uploaded}  |  Skipped: ${skipped}  |  Errors: ${errors}`);
    process.exit(errors > 0 ? 1 : 0);
}

run().catch(err => {
    console.error('Fatal:', err.message);
    process.exit(1);
});
