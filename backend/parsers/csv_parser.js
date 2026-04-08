/**
 * RFC 4180-compliant CSV parser for health data rows.
 * Handles quoted fields (including fields containing commas and newlines),
 * escaped double-quotes (""), and CRLF/LF line endings.
 * @param {string} filePath
 */
const fs = require('fs');

/**
 * Parse a raw CSV string into an array of objects.
 * Handles: quoted fields, embedded commas, embedded newlines, escaped quotes.
 */
function parseCSV(content) {
    const records = [];
    let pos = 0;
    const len = content.length;

    const parseField = () => {
        if (pos >= len) return '';

        if (content[pos] === '"') {
            // Quoted field
            pos++; // skip opening quote
            let field = '';
            while (pos < len) {
                if (content[pos] === '"') {
                    if (pos + 1 < len && content[pos + 1] === '"') {
                        // Escaped quote
                        field += '"';
                        pos += 2;
                    } else {
                        // Closing quote
                        pos++;
                        break;
                    }
                } else {
                    field += content[pos++];
                }
            }
            return field;
        }

        // Unquoted field — read until comma or newline
        let field = '';
        while (pos < len && content[pos] !== ',' && content[pos] !== '\n' && content[pos] !== '\r') {
            field += content[pos++];
        }
        return field;
    };

    const parseRecord = () => {
        const fields = [];
        while (pos < len) {
            fields.push(parseField());
            if (pos < len && content[pos] === ',') {
                pos++; // skip separator
            } else {
                break; // end of record (newline or EOF)
            }
        }
        // Consume line ending
        if (pos < len && content[pos] === '\r') pos++;
        if (pos < len && content[pos] === '\n') pos++;
        return fields;
    };

    // Parse header row
    const headers = parseRecord();
    if (headers.length === 0 || headers.every((h) => !h.trim())) return [];

    const trimmedHeaders = headers.map((h) => h.trim());

    // Parse data rows
    while (pos < len) {
        // Skip blank lines
        if (content[pos] === '\r' || content[pos] === '\n') {
            if (content[pos] === '\r') pos++;
            if (pos < len && content[pos] === '\n') pos++;
            continue;
        }
        const fields = parseRecord();
        if (fields.length === 0) continue;
        const obj = {};
        for (let j = 0; j < trimmedHeaders.length; j++) {
            obj[trimmedHeaders[j]] = j < fields.length ? fields[j].trim() : '';
        }
        records.push(obj);
    }

    return records;
}

async function parseCSVHealth(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = parseCSV(content);
    // Return last 100 records
    return data.slice(-100);
}

module.exports = { parseCSVHealth };
