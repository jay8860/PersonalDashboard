const XLSX = require('xlsx');
const fs = require('fs');

const MAX_ROWS = 100;
const MAX_FILE_SIZE_MB = 50;

/**
 * Parses Excel files (.xlsx, .xls) and extracts the last MAX_ROWS data rows.
 * Rejects files larger than MAX_FILE_SIZE_MB to avoid memory exhaustion.
 * @param {string} filePath
 */
async function parseExcelHealth(filePath) {
    const stats = fs.statSync(filePath);
    const fileSizeMB = stats.size / (1024 * 1024);

    if (fileSizeMB > MAX_FILE_SIZE_MB) {
        throw new Error(
            `Excel file is too large (${fileSizeMB.toFixed(1)} MB). Maximum supported size is ${MAX_FILE_SIZE_MB} MB.`
        );
    }

    // Use cellText:false and cellDates:true to reduce memory when parsing formulas/styles
    const workbook = XLSX.readFile(filePath, { cellText: false, cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    // Return last MAX_ROWS records
    return data.slice(-MAX_ROWS);
}

module.exports = { parseExcelHealth };
