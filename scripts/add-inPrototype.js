/**
 * Adds inPrototype: false to every document in ma_models.
 * Run once with: node scripts/add-inPrototype.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../functions/sidenotenexus-dc9441f42cca.json');

admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'modus-archive-nexus',
});

const db = admin.firestore();

async function run() {
    const colRef = db.collection('ma_models');
    let totalUpdated = 0;
    let lastDoc = null;
    const BATCH_SIZE = 400;

    console.log('Starting — adding inPrototype: false to all ma_models...\n');

    while (true) {
        let q = colRef.orderBy('__name__').limit(BATCH_SIZE);
        if (lastDoc) q = q.startAfter(lastDoc);

        const snapshot = await q.get();
        if (snapshot.empty) break;

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { inPrototype: false });
        });

        await batch.commit();
        totalUpdated += snapshot.docs.length;
        lastDoc = snapshot.docs[snapshot.docs.length - 1];

        console.log(`  Updated ${totalUpdated} models so far...`);

        if (snapshot.docs.length < BATCH_SIZE) break;
    }

    console.log(`\nDone. ${totalUpdated} models updated with inPrototype: false`);
    process.exit(0);
}

run().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
