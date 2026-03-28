/**
 * Simple CSV parser to convert health data rows into JSON.
 * @param {string} filePath 
 */
const fs = require('fs');

async function parseCSVHealth(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const currentline = lines[i].split(',');
        if (currentline.length === headers.length) {
            const obj = {};
            for (let j = 0; j < headers.length; j++) {
                obj[headers[j]] = currentline[j].trim();
            }
            data.push(obj);
        }
    }

    // Return last 100 records
    return data.slice(-100);
}

module.exports = { parseCSVHealth };
