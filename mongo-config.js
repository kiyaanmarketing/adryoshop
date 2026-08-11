const { MongoClient } = require("mongodb");
require("dotenv").config();

const uri = process.env.MONGODB_URI;

// ⚠️ MongoDB v6+ → no deprecated options
const client = new MongoClient(uri);

let db;

/**
 * 🔌 Connect to MongoDB Atlas
 */
async function connectDB() {
  try {
    await client.connect();

    db = client.db(process.env.DB_NAME);
    console.log("✅ MongoDB Atlas connected:", process.env.DB_NAME);

    // 🔧 Ensure all required indexes
    await ensureIndexes();

  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
}

/**
 * 🔐 Create required indexes (safe to run multiple times)
 */
async function ensureIndexes() {
  try {
    // =============================
    // 1️⃣ TTL Index (xcite payloads)
    // Auto-delete data after 24 hrs
    // =============================
    await db.collection("xcite").createIndex(
      { timestamp: 1 },
      { expireAfterSeconds: 86400 }
    );

    console.log("✅ TTL index ready: xcite.timestamp (24h)");

    // =============================
    // 2️⃣ Daily Click Limit Index
    // Unique per hostname per day
    // =============================
    await db.collection("dailyClickLimits").createIndex(
      { hostname: 1, date: 1 },
      { unique: true }
    );

    console.log("✅ Unique index ready: dailyClickLimits (hostname + date)");

    // =============================
    // 3️⃣ TTL Index (click_logs)
    // Auto-delete 6h after insert — see expireAt on each inserted doc
    // =============================
    await db.collection("click_logs").createIndex(
      { expireAt: 1 },
      { expireAfterSeconds: 0 }
    );

    console.log("✅ TTL index ready: click_logs.expireAt (6h after insert)");

  } catch (indexErr) {
    console.error("❌ Index creation error:", indexErr.message);
  }
}

/**
 * Click-log expiry: now + 6 hours. Used as the `expireAt` value so the
 * shared click_logs TTL index deletes docs a few hours after insert instead
 * of holding a full day — keeps this shared collection well under the
 * Atlas free-tier storage quota.
 */
function clickLogExpiry() {
  return new Date(Date.now() + 6 * 60 * 60 * 1000);
}

/**
 * 📦 Get DB instance (singleton)
 */
function getDB() {
  if (!db) {
    console.error("⚠️ getDB() called before DB initialized");
  }
  return db;
}

module.exports = {
  connectDB,
  getDB,
  clickLogExpiry,
};