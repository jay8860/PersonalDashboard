require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const { initDb, all, run, isPostgres, getSqlitePath } = require('./db');
const { parseAppleHealth } = require('./parsers/apple_health');
const { parseCSVHealth } = require('./parsers/csv_parser');
const { parseExcelHealth } = require('./parsers/excel_parser');
const { parseECG } = require('./parsers/ecg_parser');
const { parseCDA } = require('./parsers/cda_parser');
const { analyzeReport, generateMealPlanWithAI, getAiApiKeyConfigured } = require('./services/ai_service');
const {
    getPortalState,
    setPortalState,
    listPortalDocuments,
    getPortalDocument,
    insertPortalDocument,
    deletePortalDocument,
} = require('./services/portal_store');

const app = express();
const port = process.env.PORT || 3001;

console.log("App using API Key starting with:", process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 5) : "UNDEFINED");
const uploadsRoot = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');

const sniffFileForCDA = (filePath) => {
    try {
        const fd = fs.openSync(filePath, 'r');
        const buffer = Buffer.alloc(8192);
        const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, 0);
        fs.closeSync(fd);
        const head = buffer.toString('utf-8', 0, bytesRead);
        return head.includes('ClinicalDocument');
    } catch (err) {
        console.warn('CDA sniff failed, defaulting to Apple Health parser:', err.message);
        return false;
    }
};

const buildSqlPlaceholders = (count) => {
    if (isPostgres()) {
        return Array.from({ length: count }, (_, i) => `$${i + 1}`).join(',');
    }
    return Array.from({ length: count }, () => '?').join(',');
};

const escapeCsvValue = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

const normalizeTagsInput = (value) => {
    if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return [];
        if (trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed);
                return Array.isArray(parsed) ? parsed.map((item) => String(item || '').trim()).filter(Boolean) : [];
            } catch (_) {}
        }
        return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
    }
    return [];
};

const tableColumns = {
    health_data: ['id', 'type', 'data', 'created_at'],
    daily_notes: ['id', 'note_text', 'created_at'],
    medical_timeline: ['id', 'event_date', 'date_text', 'category', 'title', 'details', 'created_at'],
    body_measurements: ['id', 'event_date', 'date_text', 'measurement_text', 'created_at']
};

// Middleware
app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));
app.use(morgan('dev'));

// Debug all API requests
app.use('/api', (req, res, next) => {
    console.log(`[API DEBUG] ${req.method} ${req.url}`);
    next();
});

// Upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(uploadsRoot)) {
            fs.mkdirSync(uploadsRoot, { recursive: true });
        }
        cb(null, uploadsRoot);
    },
    filename: (req, file, cb) => {
        const baseName = path.basename(file.originalname || 'upload');
        const safeName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, `${Date.now()}-${safeName}`);
    }
});

const upload = multer({ storage });

// Routes
app.get('/api/health-check', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
});

app.get('/api/ai/status', (req, res) => {
    res.json({
        configured: getAiApiKeyConfigured(),
        provider: 'google-gemini',
    });
});

// Login Route
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin123') {
        res.json({ success: true, token: 'mock-jwt-token' });
    } else {
        res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
});

app.post('/api/meals/generate-ai', async (req, res) => {
    try {
        const result = await generateMealPlanWithAI(req.body || {});
        res.json(result);
    } catch (error) {
        console.error('AI meal generation failed:', error);
        const statusCode = /missing/i.test(error.message) || /api key/i.test(error.message) ? 400 : 500;
        res.status(statusCode).json({
            error: 'Unable to generate AI meal plan',
            details: error.message,
        });
    }
});

// Bulk process route
app.post('/api/upload', upload.array('files'), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
    }

    const results = [];
    const errors = [];

    for (const file of req.files) {
        const fileName = file.originalname.toLowerCase();
        const filePath = file.path;
        const isAppleHealth = fileName.endsWith('.xml') || fileName.includes('apple_health');
        const isImage = (file.mimetype || '').startsWith('image/') || ['.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp', '.gif'].some(ext => fileName.endsWith(ext));

        try {
            let result;
            let type;

            if (isAppleHealth) {
                // Check if it's a CDA file or standard export
                if (sniffFileForCDA(filePath)) {
                    type = 'cda_document';
                    result = await parseCDA(filePath);
                } else {
                    type = 'apple_health';
                    result = await parseAppleHealth(filePath);
                }
            } else if (fileName.endsWith('.csv')) {
                const content = fs.readFileSync(filePath, 'utf-8');
                if (content.includes('Classification,') || content.includes('Sinus Rhythm')) {
                    type = 'electrocardiogram';
                    result = await parseECG(filePath);
                } else {
                    type = 'csv_data';
                    result = await parseCSVHealth(filePath);
                }
            } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
                type = 'excel_data';
                result = await parseExcelHealth(filePath);
            } else if (
                isImage ||
                file.mimetype === 'application/pdf' ||
                file.mimetype === 'text/plain' ||
                fileName.endsWith('.pdf') ||
                fileName.endsWith('.txt')
            ) {
                type = 'medical_report';
                result = await analyzeReport(filePath, file.mimetype);
            } else {
                errors.push({ file: fileName, error: 'Unsupported file type' });
                continue;
            }

            // Save to DB
            let savedItem;
            if (isPostgres()) {
                const saved = await run("INSERT INTO health_data (type, data) VALUES ($1, $2) RETURNING id", [type, JSON.stringify(result)]);
                savedItem = { id: saved.rows[0].id, type, result };
            } else {
                const saved = await run("INSERT INTO health_data (type, data) VALUES (?, ?)", [type, JSON.stringify(result)]);
                savedItem = { id: saved.lastID, type, result };
            }
            results.push(savedItem);

        } catch (error) {
            console.error(`Error processing ${fileName}:`, error);
            errors.push({ file: fileName, error: error.message });
        }
    }

    res.json({
        message: 'Processing complete',
        uploadedCount: results.length,
        results,
        errors: errors.length > 0 ? errors : undefined
    });
});

// Get latest data
app.get('/api/data', async (req, res) => {
    try {
        const rows = await all("SELECT * FROM health_data ORDER BY created_at DESC LIMIT 50", []);
        const parsedRows = rows.map(row => ({
            ...row,
            data: JSON.parse(row.data)
        }));
        res.json(parsedRows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Single delete record
app.delete('/api/data/:id', async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id' });

    try {
        const result = isPostgres()
            ? await run("DELETE FROM health_data WHERE id = $1", [id])
            : await run("DELETE FROM health_data WHERE id = ?", [id]);
        const deleted = isPostgres() ? result.rowCount : result.changes;
        if (!deleted) return res.status(404).json({ error: 'Record not found' });
        res.json({ message: 'Deletion successful', deletedCount: deleted });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Bulk delete records
app.post('/api/data/delete-bulk', async (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'IDs array required' });
    if (ids.length === 0) return res.json({ message: 'No records selected', deletedCount: 0 });

    try {
        if (isPostgres()) {
            const result = await run("DELETE FROM health_data WHERE id = ANY($1::int[])", [ids]);
            return res.json({ message: 'Bulk deletion successful', deletedCount: result.rowCount });
        }

        const placeholders = buildSqlPlaceholders(ids.length);
        const result = await run(`DELETE FROM health_data WHERE id IN (${placeholders})`, ids);
        res.json({ message: 'Bulk deletion successful', deletedCount: result.changes });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Daily notes
app.get('/api/notes', async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit || '30', 10), 200);
    try {
        const rows = isPostgres()
            ? await all("SELECT * FROM daily_notes ORDER BY created_at DESC LIMIT $1", [limit])
            : await all("SELECT * FROM daily_notes ORDER BY created_at DESC LIMIT ?", [limit]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/notes', async (req, res) => {
    const text = (req.body.text || '').trim();
    if (!text) return res.status(400).json({ error: 'Note text required' });
    try {
        if (isPostgres()) {
            const saved = await run("INSERT INTO daily_notes (note_text) VALUES ($1) RETURNING *", [text]);
            return res.json(saved.rows[0]);
        }
        const saved = await run("INSERT INTO daily_notes (note_text) VALUES (?)", [text]);
        const rows = await all("SELECT * FROM daily_notes WHERE id = ?", [saved.lastID]);
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Medical timeline
app.get('/api/timeline', async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    try {
        const rows = isPostgres()
            ? await all("SELECT * FROM medical_timeline ORDER BY event_date DESC, created_at DESC LIMIT $1", [limit])
            : await all("SELECT * FROM medical_timeline ORDER BY event_date DESC, created_at DESC LIMIT ?", [limit]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/timeline', async (req, res) => {
    const eventDate = req.body.eventDate || null;
    const dateText = (req.body.dateText || '').trim() || null;
    const title = (req.body.title || '').trim();
    const details = (req.body.details || '').trim();
    const category = (req.body.category || '').trim();
    if (!title) return res.status(400).json({ error: 'title required' });

    try {
        if (isPostgres()) {
            const saved = await run(
                "INSERT INTO medical_timeline (event_date, date_text, category, title, details) VALUES ($1, $2, $3, $4, $5) RETURNING *",
                [eventDate, dateText, category || null, title, details || null]
            );
            return res.json(saved.rows[0]);
        }
        const saved = await run(
            "INSERT INTO medical_timeline (event_date, date_text, category, title, details) VALUES (?, ?, ?, ?, ?)",
            [eventDate, dateText, category || null, title, details || null]
        );
        const rows = await all("SELECT * FROM medical_timeline WHERE id = ?", [saved.lastID]);
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Body measurements
app.get('/api/measurements', async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    try {
        const rows = isPostgres()
            ? await all("SELECT * FROM body_measurements ORDER BY COALESCE(event_date::timestamptz, created_at) DESC LIMIT $1", [limit])
            : await all("SELECT * FROM body_measurements ORDER BY COALESCE(event_date, created_at) DESC LIMIT ?", [limit]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/measurements', async (req, res) => {
    const eventDate = req.body.eventDate || null;
    const dateText = (req.body.dateText || '').trim() || null;
    const measurementText = (req.body.measurementText || '').trim();
    if (!measurementText) return res.status(400).json({ error: 'measurementText required' });

    try {
        if (isPostgres()) {
            const saved = await run(
                "INSERT INTO body_measurements (event_date, date_text, measurement_text) VALUES ($1, $2, $3) RETURNING *",
                [eventDate, dateText, measurementText]
            );
            return res.json(saved.rows[0]);
        }
        const saved = await run(
            "INSERT INTO body_measurements (event_date, date_text, measurement_text) VALUES (?, ?, ?)",
            [eventDate, dateText, measurementText]
        );
        const rows = await all("SELECT * FROM body_measurements WHERE id = ?", [saved.lastID]);
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Portal state sync
app.get('/api/portal/state', async (req, res) => {
    const key = String(req.query.key || 'lifeAtlas').trim();
    try {
        const state = await getPortalState(key);
        res.json(state);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/portal/state', async (req, res) => {
    const key = String(req.query.key || 'lifeAtlas').trim();
    const value = req.body?.value ?? req.body ?? {};
    try {
        const saved = await setPortalState(key, value);
        res.json(saved);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Portal document vault
app.get('/api/portal/documents', async (req, res) => {
    try {
        const rows = await listPortalDocuments();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/portal/documents', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'File required' });

    const title = String(req.body.title || req.file.originalname || '').trim();
    if (!title) return res.status(400).json({ error: 'Title required' });

    try {
        const saved = await insertPortalDocument({
            title,
            category: String(req.body.category || 'other').trim() || 'other',
            tags: normalizeTagsInput(req.body.tags),
            note: String(req.body.note || '').trim() || null,
            referenceDate: String(req.body.referenceDate || '').trim() || null,
            familyPersonId: String(req.body.familyPersonId || '').trim() || null,
            storedName: req.file.filename,
            storedPath: req.file.path,
            originalName: req.file.originalname || req.file.filename,
            mimeType: req.file.mimetype || null,
            sizeBytes: req.file.size || 0,
        });
        res.json(saved);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/portal/documents/:id', async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid document id' });

    try {
        const removed = await deletePortalDocument(id);
        if (!removed) return res.status(404).json({ error: 'Document not found' });
        if (removed.stored_path && fs.existsSync(removed.stored_path)) {
            try { fs.unlinkSync(removed.stored_path); } catch (_) {}
        }
        res.json({ success: true, id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/portal/documents/:id/download', async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid document id' });

    try {
        const doc = await getPortalDocument(id);
        if (!doc) return res.status(404).json({ error: 'Document not found' });
        if (!doc.stored_path || !fs.existsSync(doc.stored_path)) {
            return res.status(404).json({ error: 'Stored file not found' });
        }
        res.download(doc.stored_path, doc.original_name || doc.title || 'document');
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Export backup (JSON)
app.get('/api/export/json', async (req, res) => {
    try {
        const health = await all("SELECT * FROM health_data ORDER BY created_at DESC", []);
        const notes = await all("SELECT * FROM daily_notes ORDER BY created_at DESC", []);
        const timeline = await all("SELECT * FROM medical_timeline ORDER BY event_date DESC, created_at DESC", []);
        const measurements = await all("SELECT * FROM body_measurements ORDER BY COALESCE(event_date, created_at) DESC", []);
        const portalStates = await all("SELECT * FROM portal_state ORDER BY updated_at DESC", []);
        const portalDocuments = await all("SELECT * FROM portal_documents ORDER BY created_at DESC", []);

        const payload = {
            exportedAt: new Date().toISOString(),
            source: isPostgres() ? 'postgres' : 'sqlite',
            sqlitePath: isPostgres() ? null : getSqlitePath(),
            health_data: health,
            daily_notes: notes,
            medical_timeline: timeline,
            body_measurements: measurements,
            portal_state: portalStates,
            portal_documents: portalDocuments
        };

        const fileName = `health-backup-${new Date().toISOString().slice(0, 10)}.json`;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(JSON.stringify(payload, null, 2));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Export backup (CSV)
app.get('/api/export/csv', async (req, res) => {
    const table = req.query.table || 'health_data';
    if (!tableColumns[table]) return res.status(400).json({ error: 'Invalid table. Use health_data, daily_notes, medical_timeline, or body_measurements.' });

    try {
        const rows = table === 'medical_timeline'
            ? await all(`SELECT * FROM ${table} ORDER BY event_date DESC, created_at DESC`, [])
            : table === 'body_measurements'
                ? await all(`SELECT * FROM ${table} ORDER BY COALESCE(event_date, created_at) DESC`, [])
            : await all(`SELECT * FROM ${table} ORDER BY created_at DESC`, []);
        const columns = tableColumns[table];
        const header = columns.join(',');
        const lines = rows.map(row => columns.map(col => escapeCsvValue(row[col])).join(','));
        const csv = [header, ...lines].join('\n');
        const fileName = `${table}-${new Date().toISOString().slice(0, 10)}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(csv);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Comprehensive AI Coach Synthesis
app.post('/api/ai/coach', async (req, res) => {
    const { metrics, medicalHistory, ecgHistory, cdaHistory, dailyNote, timeline, bodyMeasurements } = req.body;

    try {
        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `
            Act as a highly experienced personal health AI coach. 
            I have a comprehensive health dataset including metrics, clinical reports, ECG rhythms, and structured CDA data.
            
            1. CLINICAL HISTORY (Clinical Reports & Prescriptions):
            ${JSON.stringify(medicalHistory)}
            
            2. HEART RHYTHM HISTORY (ECG):
            ${JSON.stringify((ecgHistory || []).map(e => e.metadata))}
            
            3. STRUCTURED CLINICAL DATA (CDA Documents):
            ${JSON.stringify((cdaHistory || []).map(c => ({ title: c.title, observations: c.observations.slice(0, 10) })))}
            
            4. DAILY ACTIVITY METRICS:
            ${JSON.stringify(metrics)}

            5. DAILY SYMPTOMS / FEELINGS (Latest note):
            ${JSON.stringify(dailyNote)}

            6. MEDICAL TIMELINE (Most recent events):
            ${JSON.stringify((timeline || []).slice(0, 15))}

            7. BODY MEASUREMENTS (Recent entries):
            ${JSON.stringify((bodyMeasurements || []).slice(0, 10))}
            
            OBJECTIVE:
            1. Synthesize a comprehensive, "True Picture" health status. 
            2. Cross-reference clinical findings with activity AND ECG rhythms. 
               (e.g., if ECG shows Sinus Tachycardia, check Daily Heart Rate and activity).
            3. If reports show a deficiency (like Vitamin D) and activity is low, highlight the lifestyle link.
            4. Provide 4 highly specific "Deep Insights" based on cross-referencing.
            5. Provide 3 prioritized actions.
            
            FORMAT: Return ONLY JSON:
            {
              "summary": "Full narrative text...",
              "highlights": [{"title": "...", "desc": "...", "color": "rose/emerald/indigo/purple"}],
              "actions": ["..."]
            }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            res.json(JSON.parse(jsonMatch[0]));
        } else {
            throw new Error("Invalid AI format");
        }
    } catch (error) {
        console.error("Coach Synthesis error:", error);
        res.status(500).json({ error: error.message });
    }
});

// AI Coach Q&A
app.post('/api/ai/ask', async (req, res) => {
    const { question, metrics, medicalHistory, ecgHistory, cdaHistory, dailyNotes, timeline, bodyMeasurements } = req.body;
    if (!question || !String(question).trim()) {
        return res.status(400).json({ error: 'Question required' });
    }

    try {
        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `
            You are a personal health AI coach. Answer the user's question using their health data context.
            Be concise, practical, and cautious. If data is missing, say so.
            Do not diagnose. Provide clear next steps and when to seek medical care if needed.

            USER QUESTION:
            ${String(question).trim()}

            CONTEXT:
            1. DAILY METRICS (latest/averages):
            ${JSON.stringify(metrics || {})}

            2. MEDICAL REPORTS (recent):
            ${JSON.stringify((medicalHistory || []).slice(0, 5))}

            3. ECG HISTORY (recent):
            ${JSON.stringify((ecgHistory || []).slice(0, 5))}

            4. CDA CLINICAL DATA (recent):
            ${JSON.stringify((cdaHistory || []).slice(0, 3))}

            5. DAILY NOTES (recent):
            ${JSON.stringify((dailyNotes || []).slice(0, 5))}

            6. MEDICAL TIMELINE (recent):
            ${JSON.stringify((timeline || []).slice(0, 10))}

            7. BODY MEASUREMENTS (recent):
            ${JSON.stringify((bodyMeasurements || []).slice(0, 10))}
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        res.json({ answer: text });
    } catch (error) {
        console.error("Coach Q&A error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Serve static files from the React frontend app
const frontendPath = path.join(__dirname, '../dist');
if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath));

    // The "catchall" handler: for any request that doesn't
    // match one above, send back React's index.html file.
    app.use((req, res, next) => {
        if (!req.path.startsWith('/api') && req.method === 'GET') {
            res.sendFile(path.join(frontendPath, 'index.html'));
        } else {
            next();
        }
    });
}

const startServer = async () => {
    try {
        await initDb();
        console.log(`Database initialized (${isPostgres() ? 'Postgres' : 'SQLite'})`);
        if (!isPostgres()) {
            console.log(`SQLite path: ${getSqlitePath()}`);
            console.log(`Uploads path: ${uploadsRoot}`);
        }
        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    } catch (err) {
        console.error('Database initialization failed:', err);
        process.exit(1);
    }
};

startServer();
