// Quick search script — prints matching models for investigation
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: 'modus-archive-nexus' });
const db = admin.firestore();

async function search(terms) {
    const snapshot = await db.collection('ma_models').get();
    for (const doc of snapshot.docs) {
        const d = doc.data();
        const searchable = [d.title, d.architect, d.notes, d.otherMakers, d.leadMaker, d.raStudio]
            .join(' ').toLowerCase();
        if (terms.every(t => searchable.includes(t.toLowerCase()))) {
            console.log(`${doc.id}  |  "${d.title}"  |  ${d.architect}  |  ${d.year}`);
        }
    }
}

const term = process.argv[2] || '';
const terms = term.split(',').map(t => t.trim());
console.log(`Searching for: ${terms.join(' + ')}\n`);
search(terms).then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
