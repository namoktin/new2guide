const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const uri = process.env.MONGODB_URI;

async function inspect2GuideDb() {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    const client = mongoose.connection.getClient();
    const db = client.db('2guide');

    console.log("=== SITEDATAS (count 1) ===");
    const siteData = await db.collection('sitedatas').findOne();
    if (siteData) {
      console.log("siteData keys:", Object.keys(siteData));
      console.log("siteCode:", siteData.siteCode);
      console.log("siteName:", siteData.siteName);
      console.log("center:", siteData.center);
      console.log("points:", siteData.points);
      console.log("artifacts:", siteData.artifacts ? siteData.artifacts.length : 'none');
      console.log("zones:", siteData.zones ? siteData.zones.length : 'none');
      console.log("beacons:", siteData.beacons ? siteData.beacons.length : 'none');
      console.log("Full siteData preview:", JSON.stringify(siteData, null, 2).slice(0, 1000));
    }

    console.log("\n=== HUBS SAMPLE ===");
    const hubs = await db.collection('hubs').find().limit(5).toArray();
    console.log(JSON.stringify(hubs, null, 2));

    console.log("\n=== TOURGROUPS SAMPLE ===");
    const groups = await db.collection('tourgroups').find().limit(5).toArray();
    console.log(JSON.stringify(groups, null, 2));

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err.message);
  }
}

inspect2GuideDb();
