const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const usePostgres = Boolean(process.env.DATABASE_URL);
const sqlitePath = process.env.SQLITE_PATH || process.env.DATABASE_PATH || path.join(__dirname, 'health.db');

let sqliteDb = null;
let pgPool = null;

const connectPostgres = async () => {
  const sslDisabled = process.env.PGSSLMODE === 'disable' || process.env.PGSSL_DISABLE === 'true';
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: sslDisabled ? false : { rejectUnauthorized: false },
  });
  await pgPool.query('SELECT 1');
};

const ensureSqliteDir = () => {
  const dir = path.dirname(sqlitePath);
  if (dir && dir !== '.' && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const initSqlite = () => new Promise((resolve, reject) => {
  ensureSqliteDir();
  sqliteDb = new sqlite3.Database(sqlitePath, (err) => {
    if (err) reject(err);
    else resolve();
  });
});

const createTablesSqlite = async () => {
  await run(
    `CREATE TABLE IF NOT EXISTS health_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
  );
  await run(
    `CREATE TABLE IF NOT EXISTS daily_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      note_text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
  );
  await run(
    `CREATE TABLE IF NOT EXISTS medical_timeline (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_date DATE,
      date_text TEXT,
      category TEXT,
      title TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
  );
  await run(
    `CREATE TABLE IF NOT EXISTS body_measurements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_date DATE,
      date_text TEXT,
      measurement_text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
  );
  await run(
    `CREATE TABLE IF NOT EXISTS portal_state (
      state_key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
  );
  await run(
    `CREATE TABLE IF NOT EXISTS portal_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT,
      tags_json TEXT,
      note TEXT,
      reference_date DATE,
      family_person_id TEXT,
      stored_name TEXT NOT NULL,
      stored_path TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT,
      size_bytes INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
  );
  // Indexes for common query patterns
  await run(`CREATE INDEX IF NOT EXISTS idx_health_data_created_at ON health_data(created_at DESC)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_health_data_type ON health_data(type)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_daily_notes_created_at ON daily_notes(created_at DESC)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_medical_timeline_event_date ON medical_timeline(event_date DESC)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_medical_timeline_created_at ON medical_timeline(created_at DESC)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_body_measurements_event_date ON body_measurements(event_date DESC)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_portal_documents_created_at ON portal_documents(created_at DESC)`);
};

const createTablesPostgres = async () => {
  await run(
    `CREATE TABLE IF NOT EXISTS health_data (
      id SERIAL PRIMARY KEY,
      type TEXT,
      data TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  );
  await run(
    `CREATE TABLE IF NOT EXISTS daily_notes (
      id SERIAL PRIMARY KEY,
      note_text TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  );
  await run(
    `CREATE TABLE IF NOT EXISTS medical_timeline (
      id SERIAL PRIMARY KEY,
      event_date DATE,
      date_text TEXT,
      category TEXT,
      title TEXT NOT NULL,
      details TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  );
  await run(
    `CREATE TABLE IF NOT EXISTS body_measurements (
      id SERIAL PRIMARY KEY,
      event_date DATE,
      date_text TEXT,
      measurement_text TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  );
  await run(
    `CREATE TABLE IF NOT EXISTS portal_state (
      state_key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  );
  await run(
    `CREATE TABLE IF NOT EXISTS portal_documents (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT,
      tags_json TEXT,
      note TEXT,
      reference_date DATE,
      family_person_id TEXT,
      stored_name TEXT NOT NULL,
      stored_path TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT,
      size_bytes BIGINT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  );
  // Indexes for common query patterns
  await run(`CREATE INDEX IF NOT EXISTS idx_health_data_created_at ON health_data(created_at DESC)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_health_data_type ON health_data(type)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_daily_notes_created_at ON daily_notes(created_at DESC)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_medical_timeline_event_date ON medical_timeline(event_date DESC)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_medical_timeline_created_at ON medical_timeline(created_at DESC)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_body_measurements_event_date ON body_measurements(event_date DESC)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_portal_documents_created_at ON portal_documents(created_at DESC)`);
};

async function initDb() {
  if (usePostgres) {
    await connectPostgres();
    await createTablesPostgres();
    try { await run(`ALTER TABLE medical_timeline ALTER COLUMN event_date DROP NOT NULL`); } catch (err) { if (process.env.NODE_ENV !== 'production') console.debug('Migration skipped (already applied):', err.message); }
    try { await run(`ALTER TABLE medical_timeline ADD COLUMN IF NOT EXISTS date_text TEXT`); } catch (err) { if (process.env.NODE_ENV !== 'production') console.debug('Migration skipped (already applied):', err.message); }
    try { await run(`ALTER TABLE body_measurements ADD COLUMN IF NOT EXISTS date_text TEXT`); } catch (err) { if (process.env.NODE_ENV !== 'production') console.debug('Migration skipped (already applied):', err.message); }
    try { await run(`ALTER TABLE portal_documents ADD COLUMN IF NOT EXISTS family_person_id TEXT`); } catch (err) { if (process.env.NODE_ENV !== 'production') console.debug('Migration skipped (already applied):', err.message); }
  } else {
    await initSqlite();
    await createTablesSqlite();
    try {
      const columns = await all(`PRAGMA table_info(medical_timeline)`, []);
      const hasDateText = columns.some((col) => col.name === 'date_text');
      const eventDateNotNull = columns.some((col) => col.name === 'event_date' && col.notnull === 1);
      if (!hasDateText || eventDateNotNull) {
        await run(`BEGIN TRANSACTION`);
        await run(`ALTER TABLE medical_timeline RENAME TO medical_timeline_old`);
        await run(
          `CREATE TABLE medical_timeline (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_date DATE,
            date_text TEXT,
            category TEXT,
            title TEXT NOT NULL,
            details TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )`,
        );
        await run(
          `INSERT INTO medical_timeline (id, event_date, category, title, details, created_at)
           SELECT id, event_date, category, title, details, created_at FROM medical_timeline_old`,
        );
        await run(`DROP TABLE medical_timeline_old`);
        await run(`COMMIT`);
      }
    } catch (err) {
      try { await run(`ROLLBACK`); } catch (rbErr) { console.warn('ROLLBACK failed:', rbErr.message); }
      console.warn('SQLite timeline migration skipped:', err.message);
    }

    try {
      const docColumns = await all(`PRAGMA table_info(portal_documents)`, []);
      const hasFamilyPerson = docColumns.some((col) => col.name === 'family_person_id');
      if (!hasFamilyPerson) {
        await run(`ALTER TABLE portal_documents ADD COLUMN family_person_id TEXT`);
      }
    } catch (err) {
      console.warn('SQLite portal_documents migration skipped:', err.message);
    }
  }
}

async function all(sql, params = []) {
  if (usePostgres) {
    const result = await pgPool.query(sql, params);
    return result.rows;
  }

  return new Promise((resolve, reject) => {
    sqliteDb.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function run(sql, params = []) {
  if (usePostgres) {
    return pgPool.query(sql, params);
  }

  return new Promise((resolve, reject) => {
    sqliteDb.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

const isPostgres = () => usePostgres;
const getSqlitePath = () => sqlitePath;

module.exports = { initDb, all, run, isPostgres, getSqlitePath };
