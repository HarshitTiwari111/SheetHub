const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const BACKUP_DIR = path.join(__dirname, '../../backups');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function performBackup() {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      console.error('[Backup] Database connection not ready.');
      return { success: false, reason: 'Database not connected' };
    }

    const collections = await db.listCollections().toArray();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const targetFolder = path.join(BACKUP_DIR, `backup-${timestamp}`);

    fs.mkdirSync(targetFolder, { recursive: true });

    for (const col of collections) {
      const data = await db.collection(col.name).find({}).toArray();
      const filePath = path.join(targetFolder, `${col.name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }

    // Retention policy: Keep last 10 backups
    const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.startsWith('backup-'));
    if (files.length > 10) {
      files.sort();
      const toRemove = files.slice(0, files.length - 10);
      for (const oldFolder of toRemove) {
        fs.rmSync(path.join(BACKUP_DIR, oldFolder), { recursive: true, force: true });
      }
    }

    console.log(`[Backup] Successfully created database backup: backup-${timestamp}`);
    return { success: true, folder: targetFolder, timestamp };
  } catch (err) {
    console.error('[Backup] Failed to create database backup:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { performBackup };
