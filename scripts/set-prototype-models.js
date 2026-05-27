/**
 * Sets inPrototype: true on all prototype models.
 * Numbered ones updated directly by ID.
 * Unnumbered ones searched by title keywords.
 */

const admin = require('firebase-admin');

admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'modus-archive-nexus',
});

const db = admin.firestore();

// Numbered models — set by doc ID directly
const NUMBERED_IDS = [
    '0011', '0029', '0065', '0069', '0077', '0078', '0080',
    '0111', '0152', '0155', '0158', '0175', '0202', '0225',
    '0230', '0231', '0259', '0261', '0273', '0287', '0300',
    '0321', '0324', '0380', '0383', '0432', '0465', '0469',
    '0474', '0607', '0697', '0699',
];

// Unnumbered models — search by title keyword + optional architect
const UNNUMBERED_SEARCHES = [
    { keywords: ['legal', 'general'],       architect: null,           label: 'Arup — Legal & General HQ' },
    { keywords: ['skinners'],               architect: null,           label: 'Arup — Skinners' },
    { keywords: ['gramercy'],               architect: null,           label: 'John Pawson — Gramercy Park' },
    { keywords: ['design museum'],          architect: null,           label: 'John Pawson — Design Museum' },
    { keywords: ['piozzano'],               architect: null,           label: 'John Pawson — Piozzano' },
    { keywords: ['westminster abbey'],      architect: null,           label: 'Ptolemy Dean — Westminster Abbey' },
    { keywords: ['chiswick'],               architect: null,           label: 'V&A — Chiswick House' },
];

async function getAllDocs() {
    const snapshot = await db.collection('ma_models').get();
    return snapshot.docs;
}

function matchesSearch(data, { keywords }) {
    const title = (data.title || '').toLowerCase();
    const notes = (data.notes || '').toLowerCase();
    return keywords.every(kw => title.includes(kw) || notes.includes(kw));
}

async function run() {
    console.log('Fetching all models...');
    const allDocs = await getAllDocs();
    console.log(`  ${allDocs.length} models loaded\n`);

    const toUpdate = new Map(); // docId -> label

    // 1. Numbered — direct ID lookup
    for (const id of NUMBERED_IDS) {
        toUpdate.set(id, id);
    }

    // 2. Unnumbered — search by title keywords
    console.log('Searching for unnumbered models...');
    for (const search of UNNUMBERED_SEARCHES) {
        const matches = allDocs.filter(d => matchesSearch(d.data(), search));
        if (matches.length === 0) {
            console.log(`  ✗ NOT FOUND: ${search.label}`);
        } else {
            for (const match of matches) {
                const d = match.data();
                console.log(`  ✓ ${search.label}`);
                console.log(`      → ${match.id}: "${d.title}" (${d.architect})`);
                toUpdate.set(match.id, search.label);
            }
        }
    }

    console.log(`\nUpdating ${toUpdate.size} models to inPrototype: true...`);

    // Batch update in groups of 400
    const ids = Array.from(toUpdate.keys());
    for (let i = 0; i < ids.length; i += 400) {
        const batch = db.batch();
        const chunk = ids.slice(i, i + 400);
        for (const id of chunk) {
            batch.update(db.collection('ma_models').doc(id), { inPrototype: true });
        }
        await batch.commit();
    }

    console.log('\n✓ Done.\n');
    console.log('Summary:');
    for (const [id, label] of toUpdate) {
        console.log(`  ${id.padEnd(6)} ${label}`);
    }

    process.exit(0);
}

run().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
