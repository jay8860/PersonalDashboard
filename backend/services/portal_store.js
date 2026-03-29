const { all, run, isPostgres } = require('../db');

const parseJson = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const normalizeDocumentRow = (row) => ({
  ...row,
  tags: parseJson(row.tags_json, []),
});

async function getPortalState(stateKey) {
  if (isPostgres()) {
    const rows = await all('SELECT * FROM portal_state WHERE state_key = $1 LIMIT 1', [stateKey]);
    if (!rows[0]) return null;
    return {
      key: rows[0].state_key,
      value: parseJson(rows[0].value_json, null),
      updatedAt: rows[0].updated_at,
    };
  }

  const rows = await all('SELECT * FROM portal_state WHERE state_key = ? LIMIT 1', [stateKey]);
  if (!rows[0]) return null;
  return {
    key: rows[0].state_key,
    value: parseJson(rows[0].value_json, null),
    updatedAt: rows[0].updated_at,
  };
}

async function setPortalState(stateKey, value) {
  const valueJson = JSON.stringify(value ?? {});

  if (isPostgres()) {
    const result = await run(
      `INSERT INTO portal_state (state_key, value_json, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (state_key)
       DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = NOW()
       RETURNING *`,
      [stateKey, valueJson],
    );
    const row = result.rows[0];
    return {
      key: row.state_key,
      value: parseJson(row.value_json, null),
      updatedAt: row.updated_at,
    };
  }

  await run(
    `INSERT INTO portal_state (state_key, value_json, updated_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(state_key)
     DO UPDATE SET value_json = excluded.value_json, updated_at = CURRENT_TIMESTAMP`,
    [stateKey, valueJson],
  );

  return getPortalState(stateKey);
}

async function listPortalDocuments() {
  const rows = isPostgres()
    ? await all('SELECT * FROM portal_documents ORDER BY COALESCE(reference_date::timestamptz, created_at) DESC, created_at DESC', [])
    : await all('SELECT * FROM portal_documents ORDER BY COALESCE(reference_date, created_at) DESC, created_at DESC', []);

  return rows.map(normalizeDocumentRow);
}

async function getPortalDocument(id) {
  const rows = isPostgres()
    ? await all('SELECT * FROM portal_documents WHERE id = $1 LIMIT 1', [id])
    : await all('SELECT * FROM portal_documents WHERE id = ? LIMIT 1', [id]);

  return rows[0] ? normalizeDocumentRow(rows[0]) : null;
}

async function insertPortalDocument(document) {
  const values = [
    document.title,
    document.category || null,
    JSON.stringify(document.tags || []),
    document.note || null,
    document.referenceDate || null,
    document.familyPersonId || null,
    document.storedName,
    document.storedPath,
    document.originalName,
    document.mimeType || null,
    document.sizeBytes || 0,
  ];

  if (isPostgres()) {
    const result = await run(
      `INSERT INTO portal_documents
        (title, category, tags_json, note, reference_date, family_person_id, stored_name, stored_path, original_name, mime_type, size_bytes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      values,
    );
    return normalizeDocumentRow(result.rows[0]);
  }

  const result = await run(
    `INSERT INTO portal_documents
      (title, category, tags_json, note, reference_date, family_person_id, stored_name, stored_path, original_name, mime_type, size_bytes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values,
  );
  return getPortalDocument(result.lastID);
}

async function deletePortalDocument(id) {
  const existing = await getPortalDocument(id);
  if (!existing) return null;

  if (isPostgres()) {
    await run('DELETE FROM portal_documents WHERE id = $1', [id]);
  } else {
    await run('DELETE FROM portal_documents WHERE id = ?', [id]);
  }

  return existing;
}

module.exports = {
  getPortalState,
  setPortalState,
  listPortalDocuments,
  getPortalDocument,
  insertPortalDocument,
  deletePortalDocument,
};
