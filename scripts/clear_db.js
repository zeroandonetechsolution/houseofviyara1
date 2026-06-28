const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

(async () => {
  const dbPath = path.join(__dirname, '..', 'backend', 'database.db');
  try {
    const db = await open({ filename: dbPath, driver: sqlite3.Database });
    console.log('Connected to', dbPath);

    const tables = ['products', 'categories', 'banners'];
    for (const t of tables) {
      try {
        await db.run(`DELETE FROM ${t}`);
        await db.run(`DELETE FROM sqlite_sequence WHERE name='${t}'`);
        console.log(`Cleared table: ${t}`);
      } catch (e) {
        console.warn(`Table ${t} may not exist or clear failed:`, e.message);
      }
    }

    await db.close();
    console.log('Database cleanup completed.');
  } catch (err) {
    console.error('Failed to open database:', err.message);
    process.exit(1);
  }
})();
