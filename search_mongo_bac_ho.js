require('dotenv').config({ path: 'c:/Users/Nam/Desktop/antigravity/2guide/.env' });
const mongoose = require('mongoose');

async function search() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: '2guide' });
  const db = mongoose.connection.db;
  const cols = await db.listCollections().toArray();
  for (let c of cols) {
    const docs = await db.collection(c.name).find().toArray();
    for (let d of docs) {
      const s = JSON.stringify(d);
      if (/bác hồ|tượng|hồ chí minh/i.test(s)) {
        console.log(`FOUND in collection '${c.name}':`);
        console.log(s.slice(0, 300));
      }
    }
  }

  // Also check other databases in cluster!
  const admin = db.admin();
  const dbs = await admin.listDatabases();
  console.log('\nAll Databases in Cluster:');
  for (let d of dbs.databases) {
    console.log(' - DB:', d.name);
    if (d.name !== 'local' && d.name !== 'admin' && d.name !== 'config' && d.name !== '2guide') {
      const otherDb = mongoose.connection.client.db(d.name);
      const otherCols = await otherDb.listCollections().toArray();
      for (let c of otherCols) {
        const docs = await otherDb.collection(c.name).find().toArray();
        for (let doc of docs) {
          const s = JSON.stringify(doc);
          if (/bác hồ|tượng|hồ chí minh/i.test(s)) {
            console.log(`FOUND in DB '${d.name}', collection '${c.name}':`);
            console.log(s.slice(0, 300));
          }
        }
      }
    }
  }

  await mongoose.disconnect();
}
search().catch(console.error);
