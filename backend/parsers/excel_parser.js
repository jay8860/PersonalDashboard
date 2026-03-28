const XLSX = require('xlsx');
const fs = require('fs');

/**
 * Parses Excel files (.xlsx, .xls) and extracts data.
 * @param {string} filePath 
 */
async function parseExcelHealth(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Process first sheet
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Return last 100 records
    return data.slice(-100);
}

module.exports = { parseExcelHealth };
